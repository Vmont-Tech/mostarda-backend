# Modelo Operacional da Rede de Parceiros

Status: `ACCEPTED`

## 1. Propósito

Este documento especifica como a Mostarda agrega operadores regionais sem alterar a unidade comercial de 15 segundos, o split canônico ou a autoridade dos bounded contexts existentes. O modelo reduz a barreira de entrada por um plano Freemium e cria incentivo verificável para migração ao modelo completo.

As proporções de grade regulam **tempo de exibição**. A `SPLIT-PERFORMANCE-RESIDUAL-V1` regula **dinheiro de uma exibição monetizada** por componentes conquistados, fundos correspondentes e residual fixo de 30% da Mostarda. Uma proporção nunca recalcula a outra.

## 2. Modos de participação

### 2.1 Freemium

- mini PC Mostarda opcional;
- hardware próprio permitido se cumprir o contrato mínimo;
- 40% da capacidade de cada faixa classificada pertence à programação local;
- 60% permanece sob gestão da Mostarda;
- conteúdo local usa Slots de 15 segundos e no máximo dois Slots consecutivos;
- Plano Mostarda de Continuidade Operacional indisponível;
- exibição local é provada, mas não é financeiramente elegível.

### 2.2 Completo

- mini PC Mostarda obrigatório em comodato gratuito;
- taxa inicial remunera instalação, logística, provisionamento, configuração e ativação;
- Plano Mostarda de Continuidade Operacional obrigatório;
- participantes reais podem ocupar seus papéis e receber diretamente;
- uma mesma identidade econômica pode ocupar papéis distintos somente quando cada atribuição for legítima, autorizada e versionada;
- componentes de Influencer não conquistados são destinados ao `Influencer Acquisition Fund` pela `SPLIT-PERFORMANCE-RESIDUAL-V1`; o Fundo de Desenvolvimento de Influenciadores de `DEC-049` permanece separado.

Mudança de modo produz nova vigência. Nunca reclassifica Slots, Evidence Records, SplitShares ou direitos históricos.

## 3. Calendário e faixas

No onboarding, o responsável informa horário de funcionamento, segmento, tipo e capacidade do local, fluxo estimado, picos, sazonalidade e demais características exigidas pela política.

O horário de funcionamento define o expediente operacional do Venue. A Mostarda usa faixas civis fixas `00h–06h`, `06h–12h`, `12h–18h` e `18h–24h`; abertura, intervalos e fechamento informados pelo parceiro recortam somente a parte em que a TV está disponível. Assim, um local aberto de `08h` a `22h` opera `08h–12h`, `12h–18h` e `18h–22h`. Picos e características obrigatórias alimentam Pricing e planejamento, não os limites dos períodos. A configuração validada é vinculada à TV e ao Mini PC corretos.

Esses dados:

- são declarações de bootstrap;
- não constituem prova de fluxo;
- não permitem ao parceiro definir preço;
- são normalizados contra benchmarks de coorte;
- recebem confiança limitada;
- permanecem versionados e auditáveis.

Pricing classifica faixas nobres e de baixo fluxo. A quota 40/60 é garantida separadamente em cada faixa, e não pela média do dia.

## 4. Grade Freemium

### GRID-INV-001 — Unidade

Um Slot é uma janela fixa e exclusiva de 15 segundos. Creative menor pode terminar antes, mas seu último frame permanece congelado e visível até o fim do Slot, sem prolongar o áudio. A janela não é reduzida e o conteúdo seguinte nunca é antecipado. Conteúdo local pode ocupar um ou dois Slots consecutivos, nunca mais de 30 segundos por bloco.

### GRID-INV-002 — Composição Mostarda

Conteúdo controlado pela Mostarda pode ocupar qualquer quantidade consecutiva autorizada pela Campaign. Uma execução composta preserva `CompositeBlockId`, ordem, quantidade e identidade atômica de cada Slot.

### GRID-INV-003 — Imutabilidade

Slot confirmado nunca é movido, substituído ou preemptado por Campaign posterior. Scheduling reorganiza somente capacidade livre.

### GRID-INV-004 — Quotas

O parceiro controla somente seus 40%. A Mostarda controla seus 60%. Emergência segue política própria e não cria precedente comercial.

### GRID-INV-005 — Capacidade local não usada

O parceiro escolhe por janela:

- `RETAIN_FOR_LOCAL`: preserva a capacidade local;
- `RELEASE_IF_UNUSED`: libera depois do cutoff versionado;
- `LOCAL_CONFIRMED`: conteúdo local imutável.

Uma capacidade liberada e posteriormente confirmada pela Mostarda não pode ser retomada. Uma capacidade retida e vazia executa fallback institucional não monetizado.

## 5. Busca e decisão do anunciante

O sistema recomenda; Advertiser ou agente explicitamente autorizado decide.

Quando o bloco solicitado não couber, Scheduling apresenta:

- mesma TV no horário mais próximo;
- mesma TV em outra faixa permitida;
- TV equivalente no horário solicitado;
- TV equivalente em horário próximo.

Cada sugestão informa diferença do pedido, horário, faixa, duração, preço, capacidades, métricas permitidas e motivo da indisponibilidade. Sugestão não reserva inventário nem budget.

Nenhuma alternativa é aceita silenciosamente. Uma janela contratual nunca é ultrapassada por inferência.

## 6. Retenção de checkout

Pré-seleção inicia `InventoryHold` e congela o `PricingQuote` pelo mesmo prazo.

```text
AVAILABLE → TEMPORARILY_HELD → CONFIRMED
TEMPORARILY_HELD → EXPIRED → AVAILABLE
TEMPORARILY_HELD → RELEASED → AVAILABLE
```

Invariantes:

- hold é exclusivo e temporário;
- Quote e hold compartilham correlação e expiração;
- expiração não ressuscita;
- abandono ou falha libera o bloco;
- duplicidade não cria dois holds;
- limites contra abuso pertencem a política versionada;
- confirmação precisa ser reconhecida antes da expiração;
- confirmação tardia vira saldo válido, não desloca Campaign confirmada.

## 7. Pagamento

Checkout temporal aceita saldo disponível ou meio com confirmação dentro do hold, como PIX temporário, débito ou cartão autorizado conforme política.

Boleto:

- pode aportar orçamento antecipadamente;
- nunca segura Slot;
- nunca congela Quote;
- somente compensação aumenta budget.

A composição normativa é:

```text
RequestedCampaignBudget
+ PaymentMethodFees
+ IssuanceFees
+ ApplicableTaxes
= CheckoutTotal
```

Após compensação, `AvailableBudget` aumenta exatamente pelo `RequestedCampaignBudget`. Taxas são adicionais, discriminadas, versionadas e nunca integram budget, preço de Slot ou split.

## 8. Pricing

### 8.1 Base inicial

Pricing calcula preço-base provisório por dados declarados normalizados contra segmento, região, tipo de comércio, horário e demais benchmarks. Outliers não elevam preço diretamente.

### 8.2 Dinâmica

Depois da ativação, a variação automática decorre de oferta, demanda, ocupação, disponibilidade e proximidade temporal, dentro de floor/ceiling.

### 8.3 Reavaliação formal

QR, tags, telemetria, histórico e integridade de dispositivo alimentam Analytics e podem justificar nova avaliação formal. Uma leitura isolada nunca recalcula a base.

Reavaliação:

- exige dados mínimos e múltiplas fontes;
- é explicável e versionada;
- pode exigir humano;
- afeta somente novos Quotes;
- nunca reinterpreta preço histórico.

Mini PC oficial eleva confiança, mas não aumenta preço por mera aquisição.

## 9. Prova universal de playback

Toda execução usa uma cadeia canônica, sem assinatura humana:

```text
Player → Edge → PlaybackEvent assinado
→ Evidence Builder Cloud → EvidenceRecord
→ CanonicalEvidencePackage → QuantumAnchor
```

`EvidencePurpose` possui:

- `MONETIZED_PLAYBACK`;
- `LOCAL_FREEMIUM_PLAYBACK`;
- `INSTITUTIONAL_PLAYBACK`;
- `FALLBACK_PLAYBACK`.

Todos preservam TV, Device, Slot, Asset, timestamp, duração, sequência, checksums, assinatura, versões e resultado da validação.

Somente `MONETIZED_PLAYBACK` exige Campaign, PricingQuote, reserva, preço, split e políticas econômicas e pode ter `FinancialEligibility = ELIGIBLE`. Os demais usam `NOT_APPLICABLE`, nunca preço zero.

## 10. Offline-first e fallback

Programação assinada e assets válidos permanecem executáveis offline. Edge enfileira PlaybackEvents e Telemetry separadamente e sincroniza após reconexão.

Edge:

- nunca inventa nova programação;
- nunca repete Campaign além dos Slots autorizados;
- nunca cria Evidence final;
- retém fatos até confirmação durável;
- retoma sync do último ponto confirmado.

Quando o cache autorizado se esgota ou um Creative falha antes do final natural, executa conteúdo institucional pelo período restante aplicável. A falha não permite repetir o anúncio no mesmo Slot e deve ser reportada para diagnóstico e realocação. Enquanto display, energia e hardware permitirem renderização, tela preta por falta de conteúdo é proibida.

O último recurso é um asset seguro local. Fallback não cobra, não consome budget e não gera Settlement.

Ausência de heartbeat é detectada no Cloud. Perda Player–Edge é reportada pelo Edge quando possível. Notifications deduplica o incidente, avisa responsáveis da TV/local, informa impacto econômico e confirma recuperação.

## 11. Onboarding remoto

Instalação pode ser executada pelo parceiro com acompanhamento remoto de técnico Mostarda.

O pacote inclui:

- serial, marca, modelo e fotos;
- vídeo contínuo com desafio temporário exibido pelo Player;
- TV funcionando no local;
- declaração de propriedade e origem;
- nota fiscal, quando disponível;
- defeitos preexistentes;
- checklist, técnico, timestamps e testes;
- assinatura Gov.br/ICP-Brasil ou equivalente;
- hash e QuantumAnchor.

O proprietário assina a declaração de propriedade. Dono do local diferente pode instalar somente como custodiante autorizado.

TV permanece não ativa até checklist e provisioning aprovados.

## 12. Mini PC Mostarda

No modelo completo:

- pertence à Mostarda;
- é cedido em comodato gratuito;
- taxa inicial não remunera uso;
- parceiro conserva, não viola e devolve;
- desgaste e defeito natural são responsabilidade da Mostarda;
- desaparecimento, furto, roubo, peças removidas, violação ou mau uso abrem apuração de responsabilidade;
- Governance julga casos ambíguos;
- Financial apenas executa consequência autorizada.

## 13. Plano de Continuidade

O Plano Mostarda de Continuidade Operacional é serviço mensal, não seguro.

O piloto usa `R$ 24,90` por TV/mês sob `ServicePlanPriceVersion`. Revisões valem para novas contratações/renovações.

O plano oferece diagnóstico, suporte, manutenção, logística, TV temporária Mostarda, reparo, substituição equivalente e coparticipação somente após limites versionados.

## 14. Fundos relacionados a Influencer

Componentes de Influencer conquistados pertencem ao Influencer. Componentes não conquistados pertencem ao `Influencer Acquisition Fund`, sem cap de saldo e sem transferência automática para a Mostarda. A política não define utilização, governança ou campanhas de aquisição.

O Fundo de Desenvolvimento de Influenciadores de `DEC-049` permanece patrimônio restrito e mecanismo separado. Sua governança e utilização continuam regidas por sua própria decisão.

Usos permitidos incluem aquisição, onboarding, capacitação, produção, campanhas, eventos, parcerias e infraestrutura compartilhada, inclusive estúdio.

Toda despesa exige mais de 50% do equity total e ao menos dois votos favoráveis distintos, usando snapshot societário imutável.

## 15. Exemplos e contraexemplos

**Válido:** Creative local de 30s ocupa dois Slots da quota local; o Slot seguinte livre pode integrar bloco Mostarda.

**Válido:** Campaign de 150s não cabe no horário pedido; o sistema sugere a janela compatível mais próxima e aguarda decisão.

**Válido:** PIX confirma dentro do hold; Quote e Slots tornam-se definitivos pelo preço apresentado.

**Válido:** Edge fica offline, executa cache assinado, sincroniza fatos depois e Cloud valida.

**Inválido:** mover anúncio local confirmado para acomodar Campaign mais valiosa.

**Inválido:** repetir anúncio comercial depois de o cache autorizado terminar.

**Inválido:** usar dado declarado por humano como prova de fluxo ou playback.

**Inválido:** direcionar componentes não conquistados dos fundos de aquisição à receita livre da Mostarda.

**Inválido:** tratar mensalidade de continuidade como prêmio, apólice ou indenização securitária.
