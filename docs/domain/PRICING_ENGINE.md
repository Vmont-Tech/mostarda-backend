# Pricing Engine

## 1. Status e força normativa

Este documento especifica o comportamento obrigatório do Bounded Context **Pricing Engine**. Os termos **DEVE**, **NÃO DEVE**, **PODE** e **SOMENTE** são normativos.

Uma implementação é incompatível quando produz um preço que não pode ser reproduzido a partir do `PricingQuote`, permite alteração depois de `PriceApplied`, consulta saldo financeiro ou transforma uma recomendação de IA em decisão sem a aplicação de uma política determinística.

## 2. Propósito

Pricing Engine responde a uma única pergunta de domínio:

> Qual é o preço explicável, permitido e válido para uma unidade de inventário, neste contexto e neste instante?

Seu resultado é um `PricingQuote` versionado. O quote é calculado e congelado **antes** de qualquer reserva de orçamento e de qualquer alocação de Slot.

Pricing existe separado de Campaign, Financial Platform e Settlement porque cálculo de preço, autorização de gasto e distribuição de receita são decisões diferentes:

- Pricing decide **quanto a unidade custa**;
- `CampaignBudget` decide **se existe capacidade financeira para reservá-la**;
- Campaign Management decide **se o Slot pode ser alocado**;
- Evidence prova **se a execução ocorreu**;
- Settlement decide **quais direitos surgem após a prova elegível**.

### 2.1 Por que Pricing não cobra

Calcular e cobrar no mesmo Aggregate foi descartado. Uma cobrança é assíncrona, pode ficar pendente, expirar, ser contestada ou ser compensada fora do instante do quote. Se Pricing conhecesse cobrança:

- uma indisponibilidade financeira impediria a reprodução de um cálculo;
- retry de pagamento poderia recalcular o preço;
- mudança de provider contaminaria a política comercial;
- replay de eventos de Pricing poderia repetir efeito financeiro;
- preço calculado e preço efetivamente autorizado perderiam identidades independentes.

Pricing publica fatos. Ele nunca movimenta dinheiro, nunca reserva saldo e nunca instrui Asaas.

### 2.2 Alternativas rejeitadas

Foram rejeitadas:

1. **Preço calculado no Edge:** produziria decisões divergentes durante operação offline e exporia política comercial no equipamento.
2. **Preço decidido diretamente por IA:** impediria determinismo, auditoria e reconstrução confiável.
3. **Preço recalculado no momento do playback:** alteraria o contrato aceito na alocação e criaria disputa jurídica.
4. **Preço derivado de saldo disponível:** confundiria disposição de pagar com valor econômico do inventário.
5. **Quote mutável até o Settlement:** permitiria reprecificar uma entrega já contratada.

## 3. Escopo e fronteiras

### 3.1 Responsabilidades

Pricing Engine é proprietário de:

- `PricingPolicy` e suas versões;
- seleção determinística da política aplicável;
- validação dos insumos permitidos;
- normalização dos insumos de cálculo;
- cálculo de `CalculatedPrice`;
- aplicação de floor, ceiling e ajustes autorizados;
- produção do `FinalPrice`;
- validade temporal do quote antes de sua aplicação;
- override explicitamente autorizado;
- congelamento e explicação do quote;
- trilha de auditoria do cálculo.

### 3.2 Não responsabilidades

Pricing Engine NÃO:

- cria, publica, pausa ou cancela Campaign;
- seleciona definitivamente uma TV;
- reserva, consome ou libera `CampaignBudget`;
- confirma pagamento;
- calcula imposto devido;
- cria `SplitShare`;
- decide elegibilidade de Evidence;
- executa Settlement;
- instrui transferência;
- consulta Asaas;
- envia decisão financeira ao Edge;
- altera Slot, PlaybackEvent ou EvidenceRecord.

Pricing pode receber snapshots autorizados de inventário, Venue, demanda, ocupação e telemetria. Receber um snapshot não transfere ownership: Pricing NÃO corrige nem completa estado pertencente ao contexto produtor.

## 4. Linguagem do domínio

| Termo | Definição normativa |
| --- | --- |
| `PricingPolicy` | Aggregate que governa quais insumos, regras, limites e algoritmo podem produzir preço. |
| `PricingPolicyVersion` | Identidade imutável de uma versão da política. |
| `PricingQuote` | Aggregate que preserva uma decisão de preço reproduzível para uma intenção de alocação. |
| `AllocationIntentId` | Correlação opaca para a intenção que solicitou o quote; não representa Slot já alocado. |
| `CalculatedPrice` | Resultado do algoritmo antes de override autorizado e do clamp final, preservado para explicação. |
| `FinalPrice` | Valor que pode ser congelado e apresentado ao `CampaignBudget`. |
| `PricingInputSnapshot` | Conjunto imutável dos insumos e proveniências usados em um cálculo. |
| `PricingFactor` | Regra versionada que transforma ou pondera o preço. |
| `Floor` | Limite inferior permitido pela política aplicável. |
| `Ceiling` | Limite superior permitido pela política aplicável. |
| `PriceOverride` | Ajuste excepcional, autorizado e auditado, anterior a `PriceApplied`. |
| `QuoteValidity` | Intervalo em que um quote calculado ainda pode ser aplicado. |
| `AlgorithmVersion` | Versão exata do algoritmo determinístico usado. |

Moeda, precisão monetária, arredondamento e tratamento de residual permanecem sujeitos a `OPEN-019`. Nenhuma implementação pode escolher essas regras silenciosamente.

## 5. Modelo de domínio

## 5.1 Aggregate `PricingPolicy`

`PricingPolicy` contém:

- `PricingPolicyId`;
- `PricingPolicyVersion`;
- escopo de aplicação;
- vigência;
- prioridade ou critério de resolução quando o escopo admitir composição;
- catálogo de insumos permitidos;
- regras de normalização;
- preço/base de referência;
- `DemandCurve`;
- `PeakHours`;
- regras de `MarketRegion`;
- regras de perfil e categoria de Venue;
- regras de distância;
- regras de ocupação e sazonalidade;
- regras para performance histórica e ROI;
- limiar de confiança exigido para telemetria;
- floor e ceiling;
- regra de override;
- `AlgorithmVersion`;
- autor e autoridade de aprovação;
- hash do conteúdo normativo.

### 5.1.1 Lifecycle

```text
DRAFT → ACTIVE → RETIRED
```

- `DRAFT`: pode ser revisada por Commands do próprio Aggregate.
- `ACTIVE`: é imutável; qualquer alteração exige nova versão.
- `RETIRED`: não pode produzir novos quotes, mas permanece disponível para replay e auditoria.

É proibido:

- editar conteúdo de uma versão `ACTIVE`;
- ativar uma versão cujo intervalo gere seleção ambígua não resolvida;
- retirar uma versão apagando quotes produzidos por ela;
- reutilizar `PricingPolicyVersion` para conteúdo diferente;
- selecionar retroativamente nova policy para quote histórico.

## 5.2 Aggregate `PricingQuote`

Um quote pertence a exatamente um `AllocationIntentId` e contém:

- `PricingQuoteId`;
- `AllocationIntentId`;
- referência opaca ao sujeito comercial;
- referência ao inventário candidato e ao Venue, quando aplicável;
- unidade de preço;
- moeda;
- `PricingInputSnapshot`;
- `CalculatedPrice`;
- cada fator e seu efeito;
- floor e ceiling efetivamente aplicados;
- ajustes e overrides;
- `FinalPrice`;
- `PricingPolicyVersion`;
- `AlgorithmVersion`;
- instante de cálculo;
- início e fim da validade;
- revisão;
- hash do cálculo;
- estado;
- ator e causalidade.

O quote preserva tanto os valores anteriores quanto posteriores a cada transformação. Não basta armazenar apenas `FinalPrice`.

### 5.2.1 Lifecycle

```text
REQUESTED → CALCULATED → APPLIED
    │            ├────→ EXPIRED
    └────────────→ REJECTED
```

`APPLIED`, `EXPIRED` e `REJECTED` são estados finais.

| Transição | Command | Condições | Event |
| --- | --- | --- | --- |
| inexistente → `REQUESTED` | `RequestPricingQuote` | intenção inédita e dados mínimos presentes | `PricingQuoteRequested` |
| `REQUESTED` → `CALCULATED` | `CalculatePrice` | policy única, inputs válidos e cálculo reproduzível | `PriceQuoted`, `PricingAuditRecorded` |
| `REQUESTED` → `REJECTED` | `RejectPricingInput` | input obrigatório ausente, inválido, não confiável ou policy inexistente | `PricingInputRejected` |
| `CALCULATED` → `CALCULATED` | `OverridePrice` | override permitido, ator autorizado e quote ainda não aplicado/expirado | `PriceOverridden`, `PricingAuditRecorded` |
| `CALCULATED` → `APPLIED` | `ApplyPricingQuote` | validade vigente, revisão esperada e mesma intenção | `PriceApplied` |
| `CALCULATED` → `EXPIRED` | `ExpirePricingQuote` | fim da validade alcançado e quote não aplicado | `PricingQuoteExpired` |

Um override NÃO apaga o cálculo anterior. Ele acrescenta motivo, autoridade, regra aplicada, valor anterior e valor resultante. `CalculatedPrice` permanece preservado.

Depois de `PriceApplied`, nenhum Command pode alterar valor, input, versão, validade, escopo ou beneficiário conceitual do quote. Cancelamento posterior apenas deixa o quote sem execução; não o reabre.

## 6. Insumos permitidos

Um `PricingInputSnapshot` PODE conter somente insumos autorizados pela policy ativa:

- preço base ou CPM/base;
- disponibilidade de inventário;
- demanda observada;
- faixa horária;
- perfil e categoria do Venue;
- região e distância;
- ocupação;
- sazonalidade;
- performance histórica;
- ROI histórico;
- telemetria agregada com `ConfidenceScore` suficiente;
- restrições floor/ceiling;
- recomendação de IA tratada apenas como input.

Cada input DEVE registrar:

- tipo;
- valor normalizado;
- unidade;
- contexto produtor;
- identidade ou versão do snapshot;
- instante observado;
- instante recebido;
- classificação de confiança;
- regra que autorizou seu uso.

Input ausente não pode ser substituído por zero sem regra explícita. Input fora da validade da policy não pode ser silenciosamente reutilizado. Input rejeitado deve gerar causa auditável.

Dados pessoais, identidades de pessoas observadas e conteúdo bruto de sensor NÃO são insumos válidos. Pricing recebe somente sinais agregados permitidos.

## 7. Pipeline normativo de cálculo

O cálculo DEVE executar na seguinte ordem conceitual:

1. receber `RequestPricingQuote` com identidade e idempotency key;
2. validar a intenção e sua revisão;
3. selecionar a `PricingPolicyVersion` vigente para o instante e escopo;
4. obter ou receber snapshots dos contextos produtores;
5. validar proveniência, unidade, confiança e vigência dos inputs;
6. normalizar inputs segundo a policy;
7. calcular o preço base;
8. aplicar fatores na ordem definida pela policy;
9. registrar o efeito individual de cada fator;
10. aplicar override autorizado, se existir;
11. aplicar floor/ceiling conforme ordem explicitada na policy;
12. calcular `FinalPrice`;
13. gerar hash do cálculo e sua explicação;
14. publicar `PriceQuoted`;
15. aguardar aplicação ou expiração;
16. congelar o quote quando `ApplyPricingQuote` for aceito.

A ordem de aplicação faz parte da policy. Duas implementações com os mesmos inputs, policy e algoritmo DEVEM produzir o mesmo resultado canônico.

### 7.1 IA

IA PODE:

- recomendar fator;
- estimar curva;
- apontar anomalia;
- explicar tendência;
- sugerir override para análise autorizada.

IA NÃO PODE:

- ativar policy;
- alterar floor/ceiling;
- emitir `PriceApplied`;
- ocultar input;
- produzir valor final fora do algoritmo determinístico;
- usar memória não registrada como fator.

A recomendação usada deve aparecer como input versionado. A policy aceita, limita ou rejeita a recomendação.

## 8. Relação com Budget, Slot, Edge e Evidence

A sequência normativa é:

```text
PricingQuote CALCULATED
→ PriceApplied
→ AuthorizeBudgetReservation pelo CampaignBudget
→ BudgetReservationAuthorized
→ SlotAllocated
→ execução
→ Evidence VALID + anchoring CONFIRMED
→ BudgetReservationConsumed
```

Regras:

1. `CampaignBudget` recebe exatamente o `FinalPrice` congelado.
2. Pricing não consulta `AvailableBudget`.
3. Saldo insuficiente não altera nem recalcula o quote.
4. Rejeição da reserva não transforma `APPLIED` em `CALCULATED`.
5. Um novo preço exige nova intenção/quote, não mutação do anterior.
6. Slot referencia o `PricingQuoteId`, hash e versões aplicadas.
7. Edge recebe somente o resultado necessário e as referências imutáveis; não recebe regras de formação de preço.
8. PlaybackEvent carrega referências do quote, não recalcula preço.
9. EvidenceRecord preserva preços calculado, final e cobrado, além das versões aplicáveis.
10. Diferença posterior entre preço final e preço cobrado é explicada por linha financeira/compensatória; não reescreve Pricing.

## 9. Commands

| Command | Owner | Emissor permitido | Pré-condições | Pós-condições | Idempotência e falhas |
| --- | --- | --- | --- | --- | --- |
| `CreatePricingPolicyDraft` | `PricingPolicy` | responsável de Pricing autorizado | identidade e versão inéditas | policy `DRAFT` | mesma chave/payload retorna draft; versão reutilizada conflita |
| `RevisePricingPolicyDraft` | `PricingPolicy` | responsável autorizado | estado `DRAFT`, revisão esperada | nova revisão append-only do draft | revisão obsoleta é conflito |
| `ActivatePricingPolicyVersion` | `PricingPolicy` | autoridade segregada | draft completo, aprovado, não ambíguo | estado `ACTIVE` | duplicata retorna ativação original |
| `RetirePricingPolicyVersion` | `PricingPolicy` | autoridade autorizada | estado `ACTIVE`; substituição/encerramento válido | estado `RETIRED` | não invalida quotes históricos |
| `RequestPricingQuote` | `PricingQuote` | workflow de alocação autorizado | intenção, escopo e instante presentes | estado `REQUESTED` | chave vinculada ao payload; payload diferente conflita |
| `CalculatePrice` | `PricingQuote` | serviço do owner Pricing | `REQUESTED`, policy e inputs válidos | `CALCULATED` | retry com mesmos inputs converge ao mesmo hash |
| `RejectPricingInput` | `PricingQuote` | validador do owner | `REQUESTED`; causa catalogada | `REJECTED` | duplicata preserva primeira decisão |
| `OverridePrice` | `PricingQuote` | ator autorizado pela policy | `CALCULATED`, não expirado, revisão esperada | novo ajuste auditado, ainda `CALCULATED` | mesma decisão não aplica duas vezes |
| `ApplyPricingQuote` | `PricingQuote` | workflow de alocação | `CALCULATED`, válido, mesma intenção | `APPLIED` e imutável | retry retorna o quote aplicado; outra intenção conflita |
| `ExpirePricingQuote` | `PricingQuote` | política temporal do owner | `CALCULATED`, validade encerrada | `EXPIRED` | relógio do chamador não é autoridade |
| `UpdateDemandIndex` | owner do índice de Pricing | processo autorizado de consolidação | snapshot novo e ordenado | novo índice versionado | evento atrasado não regride revisão |

A matriz completa de papéis permanece `OPEN-002`. Até sua aprovação, “autorizado” significa que o owner deve rejeitar qualquer emissor sem autoridade explicitamente demonstrável e registrar a decisão.

## 10. Events

| Event | Produtor | Consumidores conceituais | Payload mínimo | Ordering, duplicidade e compensação |
| --- | --- | --- | --- | --- |
| `PricingPolicyDrafted` | `PricingPolicy` | governança, auditoria | policy/version, scope, revision, actor | ordem por policy/version |
| `PricingPolicyActivated` | `PricingPolicy` | Pricing, auditoria | version, validity, hash, authority | não substitui retroativamente |
| `PricingPolicyRetired` | `PricingPolicy` | Pricing, auditoria | version, reason, successor quando houver | replay não retira novamente |
| `PricingQuoteRequested` | `PricingQuote` | calculador de Pricing | quote, intent, scope, requestedAt | ordem por quote/revision |
| `PriceQuoted` | `PricingQuote` | workflow de alocação, auditoria | quote, calculated/final, inputs hash, factors, policy/algorithm, validity | dedupe por `PricingQuoteId`; divergência de hash é incidente |
| `PriceApplied` | `PricingQuote` | `CampaignBudget`, Campaign Management, auditoria | quote, intent, final value, currency, hashes, versions | final; repetição não cria nova reserva |
| `PriceOverridden` | `PricingQuote` | auditoria, workflow | old/new values, actor, reason, rule, revision | apenas antes de aplicação |
| `PricingInputRejected` | `PricingQuote` | workflow, observabilidade | quote, input ref, reason, policy | retry só após nova intenção/input |
| `PricingQuoteExpired` | `PricingQuote` | workflow de alocação | quote, validity, expiredAt | não expira quote aplicado |
| `DemandIndexUpdated` | owner do índice | Pricing, Analytics | scope, index version, observed window, provenance | atrasado é registrado, não regressa current |
| `PricingAuditRecorded` | `PricingQuote` | auditoria | calculation hash, explanation, versions, causation | append-only; replay não cria cálculo |

Event é fato. Consumidor não altera `PricingQuote`; emite Command ao próprio owner quando precisar decidir algo.

## 11. Concorrência e consistência

### 11.1 Quotes concorrentes

Duas solicitações para a mesma intenção e mesmo payload usam a mesma identidade idempotente e retornam o mesmo quote. Se representarem decisões comerciais diferentes, devem possuir novas identidades e causalidade explícita.

O workflow não pode escolher “o mais barato” entre respostas duplicadas da mesma intenção. Somente um quote aplicado pode fundamentar a reserva daquela intenção.

### 11.2 Ativação de policy

Ativações concorrentes usam revisão esperada. A segunda ativação deve reler o Aggregate e revalidar ambiguidade. Não existe “última gravação vence”.

### 11.3 Apply versus expiry

`ApplyPricingQuote` e `ExpirePricingQuote` concorrem pela mesma revisão. Exatamente uma transição vence:

- se Apply for confirmado primeiro dentro da validade, o quote fica `APPLIED`;
- se Expire for confirmado primeiro após a validade, fica `EXPIRED`;
- o perdedor recebe conflito/estado final e não força transição.

### 11.4 Ordering

Ordering é exigido por `PricingQuoteId + revision` e por `PricingPolicyId + version + revision`, não globalmente. Gap de revisão pausa o consumidor que depende de sequência. Evento atrasado não regride estado.

## 12. Timeout, retry e resultado desconhecido

Timeout de transporte NÃO significa falha de cálculo e NÃO autoriza novo quote.

Quando o emissor não conhece o resultado:

1. consulta o owner pela identidade idempotente; ou
2. repete o mesmo Command com a mesma chave.

Se o cálculo foi confirmado e o Event ainda não foi entregue, o Event permanece pendente de publicação. O cálculo não é desfeito.

Retry de `ApplyPricingQuote` nunca reaplica override, nunca estende validade e nunca publica um novo preço. Limites quantitativos de retry e validade pertencem a políticas versionadas e permanecem sujeitos a `OPEN-031`.

## 13. Replay, reprocessamento e rebuild

- **Replay** reapresenta Events existentes e não recalcula quote.
- **Reprocessamento** de uma decisão ainda não confirmada usa a mesma identidade e os mesmos snapshots.
- **Reidratação** reconstrói `PricingPolicy` e `PricingQuote` pela ordem de revisão.
- **Rebuild de projeção** pode reconstruir índices de consulta sem emitir `PriceQuoted`, `PriceApplied` ou efeitos financeiros.
- **Auditoria determinística** pode executar novamente o algoritmo em modo de verificação. Resultado diferente para o mesmo snapshot/hash é incidente; não é autorização para substituir o quote.
- **Correção histórica** exige nova decisão compensatória fora do quote. Quote `APPLIED` não é reaberto.

Replay nunca chama Asaas, nunca reserva budget e nunca aloca Slot.

## 14. Auditoria

Toda decisão DEVE registrar:

- Command e idempotency key;
- ator, autoridade e contexto emissor;
- timestamps recebido/decidido;
- estado e revisão anteriores;
- policy e algoritmo;
- snapshots e proveniências;
- fatores na ordem aplicada;
- valores intermediários;
- floor/ceiling;
- override, quando houver;
- valor final;
- hashes;
- Events produzidos;
- falha/rejeição com código e explicação.

Logs técnicos não substituem a trilha de domínio.

## 15. Exemplos normativos

### 15.1 Quote válido

Uma intenção solicita preço para uma unidade de inventário. Pricing seleciona uma policy ativa, valida demanda, horário, Venue e ocupação, registra cada fator, aplica os limites e produz `FinalPrice = R$ 3,27` no exemplo. O valor é apenas ilustrativo.

`PriceApplied` congela R$ 3,27. `CampaignBudget` reserva exatamente R$ 3,27 antes de `SlotAllocated`. Se a Evidence for `VALID` e a ancoragem for confirmada, a reserva pode ser consumida. Nenhuma etapa recalcula o quote.

### 15.2 Input de IA rejeitado

Uma recomendação de IA chega sem versão de modelo ou com confiança abaixo da permitida. Pricing registra `PricingInputRejected`. Ele não usa o valor silenciosamente e não o substitui por um default não documentado.

### 15.3 Resultado desconhecido

O workflow envia `ApplyPricingQuote` e perde a resposta. Ele repete a mesma chave. O owner retorna o primeiro `PriceApplied`; não cria outro quote.

## 16. Contraexemplos proibidos

- “O saldo é baixo; reduzir o preço até caber.”
- “O Edge estava offline; recalculou localmente.”
- “A IA sugeriu; por isso o valor final mudou sem policy.”
- “O quote expirou, mas o allocator alterou sua validade.”
- “O pagamento falhou; Pricing voltou o quote para CALCULATED.”
- “O playback terminou; aplicar a policy vigente agora.”
- “O override atualizou o valor anterior no banco e apagou o original.”
- “O Event duplicou; o consumidor criou duas reservas.”
- “O algoritmo mudou; rebuild recalculou todos os quotes antigos.”

Todos esses comportamentos violam esta especificação.

## 17. Critérios de completude para implementação

Uma implementação de Pricing somente está pronta quando demonstra:

1. reprodução determinística do cálculo;
2. imutabilidade de policy ativa e quote aplicado;
3. seleção não ambígua de policy;
4. proveniência de todos os inputs;
5. rejeição explícita de input inválido;
6. override autorizado e append-only;
7. concorrência por revisão esperada;
8. idempotência de Commands e Events;
9. recuperação de timeout sem duplicidade;
10. replay/rebuild sem efeito financeiro;
11. integração com Budget por valor congelado;
12. auditoria suficiente para responder “por que este preço?”.

## 18. Regra comercial de ocupação e concorrência

Cada Venue possui preço base e preço mínimo versionados. Ocupação confirmada do inventário é input do cálculo:

- maior ocupação aumenta o preço das oportunidades posteriores conforme a PricingPolicy;
- menor ocupação pode reduzir o preço, nunca abaixo do mínimo;
- Slot reservado preserva o Quote aceito e nunca é reprecificado;
- disputa pelo mesmo Slot não é leilão;
- maior preço não concede prioridade;
- negociação individual e override manual de concorrência são proibidos;
- a primeira reserva autoritativamente aceita vence.

Ordem de aquisição e formação de preço são decisões distintas. Pricing Engine calcula valor; o owner do Slot serializa a ocupação.

## 19. Quote para realocação

Realocação nunca reutiliza Quote anterior. Cada candidato recebe novo Quote, mas só é elegível quando satisfaz a `SlotEquivalencePolicy` preservada na obrigação.

O preço candidato deve estar dentro da tolerância versionada e nunca pode exceder o limite autorizado sem novo consentimento do Advertiser. Ausência de policy/versão bloqueia a realocação; código não aplica tolerância implícita.
