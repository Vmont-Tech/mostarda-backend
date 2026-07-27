# Governance & Dispute Management — Design aprovado

- **Data:** 2026-07-27
- **Status:** aguardando revisão do documento escrito
- **Decisão relacionada:** fechamento de `OPEN-049`

## 1. Objetivo

Criar o bounded context `Governance & Dispute Management` como única autoridade capaz de transformar fatos produzidos pela plataforma em decisões oficiais, auditáveis e revisionadas de responsabilidade operacional, financeira ou contratual.

O contexto funciona como tribunal interno da plataforma. Ele não produz o fato técnico, não altera o estado do contexto de origem e não executa diretamente a consequência financeira.

## 2. Problema

Falhas de playback, cobrança, integração, IA, Edge, sincronização, operação humana, chargeback e auditoria envolvem fatos de vários bounded contexts. Permitir que cada contexto atribua culpa produz:

- julgamentos contraditórios;
- responsabilidade compartilhada sem owner;
- consequências financeiras divergentes;
- acoplamento entre fato técnico e decisão contratual;
- impossibilidade de recurso uniforme;
- auditoria fragmentada.

O domínio exige uma única autoridade para julgar. Todos os demais contextos continuam autoridades somente sobre seus próprios fatos.

## 3. Nome normativo

O nome público e definitivo é:

`Governance & Dispute Management`

`Responsibility Management` não deve ser usado como nome de contexto. Responsabilidade é o resultado do julgamento, não o objeto administrado.

## 4. Fronteira

### 4.1 Responsabilidades

Governance & Dispute Management:

- abre casos a partir de incidentes ou contestações;
- referencia fatos e evidências externas;
- conduz investigação;
- aplica políticas determinísticas de governança;
- solicita revisão humana diante de ambiguidade;
- publica a decisão oficial;
- recebe recursos;
- reavalia casos;
- publica nova revisão quando a conclusão muda;
- fecha o processo;
- preserva trilha auditável integral.

### 4.2 Não responsabilidades

O contexto nunca:

- altera Evidence;
- altera PlaybackEvent;
- corrige Payment, Ledger, Campaign, Slot ou Quote;
- calcula preço;
- executa refund, débito, crédito ou transferência;
- cria ou remove direito financeiro diretamente;
- administra pessoas, empresas, contas ou papéis;
- aceita inferência de culpa publicada por outro contexto;
- permite que IA publique julgamento;
- reescreve decisão anterior.

## 5. Autoridade

Somente Governance & Dispute Management publica uma decisão de responsabilidade.

Os contextos de origem afirmam fatos:

| Contexto | Fato permitido | Julgamento proibido |
| --- | --- | --- |
| Campaign Management | lifecycle, Slot, Commands e cancelamento | atribuir culpa por falha da Campaign |
| Edge Runtime | playback, timeout, desconexão e estado observado | declarar parceiro ou plataforma responsável |
| Evidence Ledger | validade, integridade, disputa e reversão da Evidence | atribuir responsabilidade contratual |
| Financial Platform | reserva, pagamento, chargeback, refund e lançamento | decidir quem absorve perda |
| Pricing Engine | Quote, inputs, policy e snapshot | declarar responsabilidade por divergência |
| AI Orchestration | análise, confiança e recomendação | publicar decisão oficial |
| TV Network | health, vínculo, update e incidentes operacionais | converter falha operacional em culpa |

## 6. Aggregate

### 6.1 GovernanceCase

`GovernanceCase` é o Aggregate root.

Conteúdo conceitual:

- `governanceCaseId`;
- tipo e origem do caso;
- `sourceContext`;
- `occurredAt`;
- estado;
- referências de evidência;
- investigação;
- policy versions;
- decisão vigente;
- histórico de decisões;
- recursos;
- revisão do Aggregate;
- correlação e causação;
- timestamps de auditoria.

### 6.2 Entidades

#### EvidenceReference

Referência imutável ao fato autoritativo externo:

- contexto e Aggregate de origem;
- identidade do fato;
- Event ID;
- revisão/schema;
- digest ou hash;
- URI/referência permitida;
- instante de ocorrência;
- instante de anexação.

GovernanceCase não copia nem reescreve o conteúdo autoritativo. Snapshot permitido serve somente à auditoria e preserva digest da origem.

#### Investigation

Registra:

- escopo;
- perguntas investigadas;
- evidências consideradas;
- policy aplicada;
- análise determinística;
- recomendação de IA, quando houver;
- lacunas;
- responsável pela revisão humana;
- conclusão proposta.

#### ResponsibilityDecision

Decisão append-only:

- `decisionId`;
- `revision`;
- `responsibleParty`;
- `responsibilityCategory`;
- `severity`;
- `confidence` decimal no intervalo fechado `[0.00, 1.00]`;
- `policyVersion`, referenciando exatamente uma `GovernancePolicyVersion`;
- `decidedBy`;
- `decidedAt`;
- `reason`;
- `evidenceReferences`;
- consequência autorizada conceitualmente;
- referência à decisão anterior, quando existir.

Classes permitidas:

- `ADVERTISER`;
- `EDGE_PARTNER`;
- `MOSTARDA`;
- `INTEGRATED_THIRD_PARTY`.

Categorias permitidas:

- `PLATFORM_BUG`;
- `OPERATIONAL_FAILURE`;
- `PARTNER_FAILURE`;
- `THIRD_PARTY_FAILURE`;
- `USER_MISUSE`;
- `FORCE_MAJEURE`;
- `UNKNOWN`.

Severidades permitidas:

- `LOW`;
- `MEDIUM`;
- `HIGH`;
- `CRITICAL`.

`confidence` é decimal normalizado obrigatório no intervalo fechado `[0.00, 1.00]`. Ele representa a robustez da conclusão produzida pelo processo de governança, considerando a qualidade, completude e consistência das evidências disponíveis no momento da decisão. Não representa probabilidade estatística de culpa, risco jurídico nem percentual de certeza jurídica. Confidence não determina a validade jurídica ou operacional da decisão. Uma `ResponsibilityDecisionPublished` é sempre uma decisão oficial, independentemente do valor de confidence.

Cada revisão preserva exatamente o confidence publicado. Categorias visuais de confidence não são persistidas; são projections calculadas por limiares versionados do Configuration Service. Mudança de limiar nunca modifica decisão histórica.

`confidence` possui finalidade exclusivamente explicativa, estatística e auditável. Nenhum bounded context pode condicionar, ampliar, reduzir, suspender ou ignorar comportamento de negócio, financeiro, contratual ou jurídico em função desse valor. Toda consequência decorre exclusivamente da existência e do conteúdo normativo de `ResponsibilityDecisionPublished`, nunca de limiares de confidence.

`UNKNOWN` não significa “não analisado”. Ele só pode ser publicado depois da investigação quando as evidências continuarem insuficientes para atribuição inequívoca. Antes disso, o GovernanceCase permanece `INVESTIGATING` ou `UNDER_REVIEW`.

### 6.3 GovernancePolicyVersion

Toda decisão publicada referencia exatamente uma `GovernancePolicyVersion`.

Uma versão publicada é imutável. A `GovernancePolicyVersion` nunca pode ser alterada após a publicação da decisão que a referencia. Correção, novo critério, novo limiar ou mudança de interpretação exige nova versão. A policy preserva:

- identidade e versão;
- status e vigência;
- critérios determinísticos;
- evidências obrigatórias;
- regras de categoria e severidade;
- requisitos de revisão humana;
- autoridade de publicação;
- hash/digest;
- autoria e aprovação.

A referência `policyVersion` também é imutável dentro da `ResponsibilityDecision`. Reavaliação sob outra política cria uma nova decisão append-only, com nova `revision` e sua própria referência de política. É proibido substituir a policy de uma decisão já publicada ou reescrever sua revisão anterior.

Policy nova não reinterpreta decisão anterior. Replay e auditoria utilizam a versão preservada na ResponsibilityDecision.

#### Appeal

Registra:

- identidade;
- decisão contestada;
- parte recorrente;
- fundamento;
- evidências adicionais;
- estado;
- resultado;
- timestamps;
- auditoria.

## 7. Lifecycle

```text
OPEN
→ INVESTIGATING
→ UNDER_REVIEW
→ DECIDED
→ APPEALED
→ REEVALUATING
→ DECIDED
→ CLOSED
```

Regras:

- `UNDER_REVIEW` é obrigatório quando a regra não produz conclusão inequívoca;
- `DECIDED` exige `ResponsibilityDecisionPublished`;
- recurso não remove nem edita a decisão recorrida;
- reavaliação produz nova revisão;
- `CLOSED` é final;
- novo fato material após fechamento abre novo GovernanceCase correlacionado, salvo política explícita que permita reavaliação antes do fechamento;
- timeout nunca publica decisão.

## 8. Commands

| Command | Owner | Resultado |
| --- | --- | --- |
| `OpenGovernanceCase` | GovernanceCase | cria `OPEN` |
| `AttachEvidenceReference` | GovernanceCase | anexa referência validada |
| `StartInvestigation` | GovernanceCase | `OPEN → INVESTIGATING` |
| `RequestHumanReview` | GovernanceCase | `INVESTIGATING → UNDER_REVIEW` |
| `ClassifyResponsibility` | GovernanceCase | registra conclusão proposta, sem oficializá-la |
| `PublishDecision` | GovernanceCase | publica decisão e entra em `DECIDED` |
| `AppealDecision` | GovernanceCase | `DECIDED → APPEALED` |
| `ReevaluateGovernanceCase` | GovernanceCase | `APPEALED → REEVALUATING` |
| `CloseGovernanceCase` | GovernanceCase | `DECIDED → CLOSED` |

Todo Command exige actor, autorização, revisão esperada, correlation, causation, idempotency key, motivo e policy versions aplicáveis.

## 9. Events

| Event | Significado |
| --- | --- |
| `GovernanceCaseOpened` | caso foi criado |
| `EvidenceReferenceAttached` | nova referência autoritativa foi aceita |
| `InvestigationStarted` | investigação começou |
| `HumanReviewRequested` | ambiguidade exige operador |
| `ResponsibilityDecisionPublished` | decisão oficial foi publicada |
| `ResponsibilityDecisionAppealed` | decisão recebeu recurso formal |
| `GovernanceCaseReevaluated` | reavaliação terminou e está apta a nova publicação |
| `GovernanceCaseClosed` | caso foi encerrado |

Não existem `ResponsibilityAssigned` nem `ResponsibilityReassigned`. A mudança de responsável é representada por nova revisão de `ResponsibilityDecisionPublished`.

## 10. Publicação da decisão

`ClassifyResponsibility` não cria autoridade externa. Ele apenas registra a conclusão proposta.

Somente `PublishDecision` produz:

```text
ResponsibilityDecisionPublished
```

Payload conceitual:

- GovernanceCase ID;
- Decision ID;
- Decision Revision;
- Responsible Party;
- Responsibility Category;
- Severity;
- Confidence decimal;
- justificativa;
- Evidence References;
- exatamente uma Governance Policy Version;
- actor/regra decisora;
- consequência conceitualmente autorizada;
- decisão anterior substituída, quando houver;
- timestamp;
- correlation e causation.

Consumidores usam a revisão mais recente publicada para novos efeitos. Efeitos anteriores nunca são apagados; eventual mudança gera compensação por novos Commands nos respectivos owners.

## 11. Regras determinísticas, IA e humano

Políticas determinísticas podem produzir conclusão proposta quando todos os fatos obrigatórios estão presentes e a regra é inequívoca.

IA pode:

- organizar evidências;
- detectar lacunas;
- recomendar classificação;
- explicar correlações.

IA nunca pode executar `PublishDecision`.

Ambiguidade, conflito, insuficiência de fatos, policy incompatível ou contestação material exigem revisão humana. O operador autorizado publica por Command ao Aggregate; não edita armazenamento.

Confidence baixo não invalida nem reduz a autoridade de uma decisão publicada. Ele registra incerteza residual. Se a investigação ainda não terminou, não existe decisão publicada nem categoria `UNKNOWN`.

## 12. Recurso e reavaliação

Uma parte autorizada pode recorrer de uma decisão publicada.

O recurso:

- referencia a revisão contestada;
- preserva a decisão original;
- anexa fundamentos e novas evidências;
- conduz o caso a `APPEALED`;
- exige `ReevaluateGovernanceCase`;
- pode resultar na publicação de nova revisão;
- não suspende automaticamente efeitos anteriores sem política expressa.

Se a nova revisão alterar o responsável, consumidores materializam compensações append-only. Nenhum consumidor desfaz efeitos por edição.

## 13. Consumidores

### Financial Platform

Executa consequências financeiras autorizadas:

- `PlatformLossEntry`;
- `PartnerCompensation`;
- `AdvertiserRefund`;
- recuperação contra parte responsável.

Financial nunca recalcula responsabilidade.

### Settlement

Cria, bloqueia, compensa ou materializa direitos conforme decisão publicada e suas próprias invariantes. Settlement não julga culpa.

### Campaign Management

Registra a decisão no histórico e reage somente por Commands próprios quando houver efeito permitido no lifecycle.

### Notifications

Informa partes conforme decisão e regras de privacidade.

### Analytics

Atualiza indicadores por classe, causa, responsável, revisão e resultado.

## 14. Consistência eventual

- Events de origem podem chegar fora de ordem;
- GovernanceCase registra gaps e não decide com dependência obrigatória ausente;
- duplicidade de Event cria no máximo uma EvidenceReference lógica;
- republicação preserva Event ID;
- decisão usa snapshot de referências e policy versions;
- replay não publica nova decisão;
- rebuild não reexecuta consequência financeira;
- consumidor deduplica por Decision ID + Revision;
- nova revisão não reutiliza idempotency key da revisão anterior;
- consequência com resultado desconhecido é reconciliada pelo contexto executor.

## 15. Invariantes

1. Somente Governance & Dispute Management publica responsabilidade oficial.
2. Todo julgamento referencia fatos autoritativos.
3. Fato externo nunca é alterado pelo GovernanceCase.
4. Toda decisão publicada possui exatamente um responsável.
5. Responsabilidade compartilhada é proibida.
6. Decisão publicada é append-only.
7. Recurso não apaga decisão.
8. Mudança de responsável exige nova revisão publicada.
9. IA nunca publica decisão.
10. Ambiguidade exige humano.
11. Consequência financeira referencia Decision ID e Revision.
12. Consumidor não reinterpreta a decisão.
13. Timeout não significa conclusão.
14. Caso fechado não retorna.
15. Toda decisão possui ResponsibilityCategory.
16. Toda decisão possui Severity.
17. Confidence é obrigatório e pertence a `[0.00, 1.00]`.
18. Confidence não representa probabilidade de culpa.
19. Toda decisão referencia exatamente uma GovernancePolicyVersion.
20. GovernancePolicyVersion publicada é imutável.
21. `UNKNOWN` só pode ser publicado após investigação concluída.
22. Confidence possui finalidade exclusivamente explicativa e auditável.
23. Confidence nunca altera efeitos de negócio, financeiros, contratuais ou jurídicos.
24. Projeções categóricas de confidence nunca são persistidas nem reclassificam decisões históricas.
25. A referência policyVersion de uma decisão publicada é imutável.
26. Uso de nova policy exige nova ResponsibilityDecision e nova revision append-only.
27. Confidence considera qualidade, completude e consistência das evidências disponíveis no instante da decisão.
28. Confidence não representa probabilidade estatística de culpa, risco jurídico nem percentual de certeza jurídica.

## 16. Segurança e auditoria

Operações de investigação, publicação, recurso e fechamento exigem autorização segregada e trilha com:

- actor;
- papel;
- motivo;
- pré/pós-estado;
- evidências;
- policies;
- timestamps;
- decisão;
- revisão;
- correlation/causation;
- resultado de Commands consumidores.

Dados pessoais e documentos sensíveis permanecem nos owners de origem. Governance recebe referências e somente snapshots permitidos pela política de privacidade.

## 17. Integração e migração conceitual

Contratos existentes de Evidence, Settlement e Financial que usam “dispute” continuam podendo governar seus estados internos, mas deixam de publicar julgamento de culpa.

Na sincronização normativa:

- fechar `OPEN-049`;
- registrar novo `DEC-*`;
- adicionar o bounded context ao mapa;
- adicionar GovernanceCase aos Aggregates;
- consolidar Commands e Events;
- adicionar a state machine;
- criar Saga de julgamento e consequência;
- atualizar invariantes globais;
- substituir qualquer inferência local de culpa;
- preservar disputas internas somente quando tratam validade/estado do próprio Aggregate.

## 18. Critérios de aceite do design

O design está pronto para plano quando:

- nome normativo é único;
- owner do julgamento é único;
- Aggregate e entidades estão definidos;
- lifecycle não possui transição implícita;
- Commands possuem owner único;
- Events representam fatos consumados;
- IA não possui autoridade;
- recurso é append-only;
- consumidores não reinterpretam;
- consequência financeira referencia decisão;
- category, severity e confidence estão presentes;
- confidence não controla qualquer consequência;
- policy version é única e imutável;
- troca de policy produz nova decisão, sem mutação histórica;
- UNKNOWN não é estado intermediário;
- `OPEN-049` pode ser fechado sem nova suposição.

## 19. Roadmap após a sincronização

### Etapa 0 — Fechar todos os bounded contexts

Cada contexto deve terminar com Aggregate, Commands, Events, invariantes, state machine, ownership, Sagas, consistência eventual e regras de negócio sem decisões abertas.

Ordem normativa de fechamento:

1. **Fase 1 — Núcleo da plataforma:** User Identity, Configuration Service, Governance & Dispute Management e Financial Platform.
2. **Fase 2 — Núcleo comercial:** Pricing Engine, Campaign Budget, revisão final de Campaign Management e Settlement.
3. **Fase 3 — Execução:** Edge Runtime, Evidence Ledger e AI Orchestration.
4. **Fase 4 — Contextos consumidores:** Notifications, Analytics, CRM e Marketplace.

Campaign Management não retorna a um novo ciclo de descoberta; recebe somente revisão final e correções decorrentes de inconsistência transversal comprovada.

### Etapa 1 — Mapa integral de Events

Consolidar o fluxo causal completo, identificar duplicidades, aliases, producer único, consumidores, ordering e gaps.

### Etapa 2 — Mapa integral de Sagas

Desenhar os workflows ponta a ponta, incluindo ativação, Pricing, Slot, playback, Evidence, Settlement, Governance, compensação e refund.

### Etapa 3 — Validação de Ownership

Comprovar owner único para bounded contexts, Aggregates, Commands e Events. Identificar produtores duplicados, Commands sem Aggregate, consumidores que reinterpretam fatos e violações de fronteira.

### Etapa 4 — Validação de Invariantes Globais

Consolidar e validar invariantes distribuídos, precondições e pós-condições entre contextos, incluindo concorrência, idempotência, ordering, consistência eventual, compensações, replay e reprocessamento.

### Etapa 5 — Validação de Fluxos End-to-End

Executar walkthrough normativo dos fluxos completos e de suas falhas. A validação deve detectar Events órfãos, consumidores ausentes, estados inalcançáveis, Sagas circulares, ciclos de dependência, gaps temporais e consequências sem causa normativa.

### Etapa 6 — Domain Freeze

Após aprovação da revisão global, nenhuma nova regra de negócio entra no baseline congelado. Mudanças posteriores exigem processo formal de decisão, versionamento e impacto.

### Etapa 7 — Domain Freeze Review (Architecture Lock)

Emitir a revisão normativa e automatizada de que o baseline congelado está completo e transversalmente consistente. O `Domain Freeze Review` funciona como certificação final da arquitetura, bloqueia geração de contratos enquanto qualquer verificação falhar e contém:

- mapa completo dos bounded contexts;
- mapa completo dos Aggregates;
- mapa completo dos Commands;
- mapa completo dos Events;
- mapa completo das Sagas;
- matriz de ownership;
- dependências entre contextos;
- fluxos ponta a ponta, incluindo cadastro → campanha → execução → evidência → liquidação → governança.

Além dos artefatos, deve comprovar, no mínimo:

- nenhum Aggregate possui mais de um owner;
- nenhum Event possui mais de um producer normativo;
- nenhuma Saga contém dependência circular;
- nenhuma referência entre bounded contexts viola fronteiras;
- nenhuma decisão permanece `OPEN`;
- nenhum estado é inalcançável;
- nenhum Command existe sem Aggregate owner;
- nenhum Event requerido existe sem consumidor;
- nenhum bounded context está órfão;
- todo invariante possui rastreabilidade normativa.

O artefato deve registrar baseline, data, versão das regras de revisão, resultados, exceções aprovadas e evidências reproduzíveis. Qualquer falha impede o Architecture Lock. Qualquer alteração posterior invalida o Review e exige nova revisão, novo freeze e nova certificação.

### Etapa 8 — Geração de contratos técnicos

Gerar OpenAPI, Protobuf, Events, Commands, DTOs, schemas, repositories, filas, banco e testes a partir do domínio congelado.

### Etapa 9 — Implementação

Iniciar somente após geração e validação dos contratos técnicos sobre o baseline certificado. A ordem de implementação será derivada das dependências confirmadas pelos mapas globais de Events e Sagas; ela não altera a ordem normativa de fechamento dos bounded contexts.
