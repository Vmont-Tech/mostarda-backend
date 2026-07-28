# Governance Events

`ResponsibilityDecisionPublished` inclui `responsibleSubjectId` obrigatório para `ADVERTISER`, `EDGE_PARTNER` e `INTEGRATED_THIRD_PARTY`, e ausente para `MOSTARDA` e `NONE`. Consumidores rejeitam payload contraditório e não inferem identidade.

## 1. Envelope obrigatório

Todo Event contém:

- `eventId`;
- `eventType`;
- `schemaVersion`;
- `governanceCaseId`;
- `aggregateRevision`;
- `occurredAt`;
- `producer = GovernanceCase`;
- `correlationId`;
- `causationId`;
- payload conceitual.

Ordering é garantido somente por `governanceCaseId + aggregateRevision`. Consumidores não pressupõem ordem global. Deduplicação usa Event ID. Replay preserva Event ID e não autoriza side effects externos.

## 2. GovernanceCaseOpened

- **Producer:** GovernanceCase.
- **Consumers:** Governance projections, Audit, Analytics e orquestração da investigação.
- **Payload:** origem, tipo, sourceContext, occurredAt do incidente, actor e correlação.
- **Ordering:** revisão inicial.
- **Duplicidade:** mesma intenção converge para o caso existente.
- **Compensação:** caso indevido é fechado por Command; evento não é apagado.

## 3. EvidenceReferenceAttached

- **Producer:** GovernanceCase.
- **Consumers:** Investigation projection, Audit.
- **Payload:** identidade de origem, Event ID, schema, digest, URI autorizada e timestamps.
- **Ordering:** depois de GovernanceCaseOpened.
- **Duplicidade:** identidade autoritativa aceita uma referência lógica.
- **Compensação:** evidência superada recebe nova referência/status auditável; a antiga permanece.

## 4. InvestigationStarted

- **Producer:** GovernanceCase.
- **Consumers:** Investigation workers, AI Orchestration, Audit.
- **Payload:** investigationId, escopo, policyVersion, evidências requeridas e actor.
- **Ordering:** depois da abertura; antes de decisão.
- **Duplicidade:** uma ocorrência por investigation revision.
- **Compensação:** investigação inválida não é apagada; nova investigação/reavaliação é aberta.

## 5. HumanReviewRequested

- **Producer:** GovernanceCase.
- **Consumers:** fila operacional, Notifications autorizadas, Audit.
- **Payload:** investigationId, motivo, gaps, severity operacional da fila, prazo de policy.
- **Ordering:** após InvestigationStarted e antes de PublishDecision humano.
- **Duplicidade:** uma solicitação ativa por investigation revision.
- **Compensação:** resolução ocorre pela publicação ou reavaliação, nunca por edição.

## 6. ResponsibilityDecisionPublished

- **Producer único:** GovernanceCase.
- **Consumers:** Financial Platform, Settlement, Campaign Management, Notifications, Analytics e Audit.
- **Payload obrigatório:** decisionId, revision, responsibleParty, responsibilityCategory, severity, confidence decimal, policyVersion, decidedBy, decidedAt, reason e evidenceReferences.
- **Ordering:** revisão cresce monotonicamente dentro do caso.
- **Duplicidade:** dedupe por Event ID e decisionId + revision.
- **Replay:** atualiza projections; não repete consequência já materializada.
- **Compensação:** nova revisão causa Commands compensatórios nos owners; decisão anterior permanece.

Confidence não controla consumo nem validade. Todo consumidor trata a publicação como oficial e utiliza party, category, severity e policy conforme seu contrato, sem reinterpretação.

## 7. ResponsibilityDecisionAppealed

- **Producer:** GovernanceCase.
- **Consumers:** investigação, Notifications, Audit e projections.
- **Payload:** appealId, decisionId, decisionRevision, appellant, reason, evidenceReferences e timestamps.
- **Ordering:** após a revisão contestada.
- **Duplicidade:** por identidade do Appeal.
- **Compensação:** desistência ou rejeição é novo fato; recurso não é removido.

## 8. GovernanceCaseReevaluationStarted

- **Producer:** GovernanceCase.
- **Consumers:** investigação, Audit e projections.
- **Payload:** appealId, reevaluationId, escopo, policyVersion e actor.
- **Ordering:** após ResponsibilityDecisionAppealed e antes da nova decisão.
- **Efeito:** confirma entrada em REEVALUATING.
- **Duplicidade:** uma ocorrência por reevaluation revision.

## 9. GovernanceCaseReevaluated

- **Producer:** GovernanceCase.
- **Consumers:** Audit e projections de Governance.
- **Payload:** appealId, reevaluationId, decisionId, decisionRevision, policyVersion e concludedAt.
- **Ordering:** imediatamente após ResponsibilityDecisionPublished da nova revision.
- **Duplicidade:** uma ocorrência por reevaluation revision.
- **Efeito:** confirma conclusão e retorno a DECIDED.

Este Event nunca representa início, não atribui responsabilidade e não substitui ResponsibilityDecisionPublished.

## 10. GovernanceCaseClosed

- **Producer:** GovernanceCase.
- **Consumers:** Audit, Analytics, Notifications e projections.
- **Payload:** decisão vigente, revisão, motivo do fechamento, actor e timestamp.
- **Ordering:** último Event do lifecycle do caso.
- **Duplicidade:** uma ocorrência.
- **Compensação:** inexistente; novo fato abre novo caso.

## 11. Eventos proibidos

`ResponsibilityAssigned` e `ResponsibilityReassigned` não existem como contratos públicos ou internos normativos.

Eles são proibidos porque escondem a revisão append-only. Primeira atribuição e qualquer mudança são representadas uniformemente por ResponsibilityDecisionPublished com revision própria.

## 12. Falhas de entrega

- Broker indisponível: outbox preserva Event e Event ID.
- Entrega duplicada: consumidor retorna efeito anterior.
- Entrega fora de ordem: consumidor aguarda gap ou reconstrói stream.
- Schema desconhecido: dead-letter sem descarte e alerta.
- Consumidor indisponível: retry com backoff técnico, sem alterar semântica.
- Resultado desconhecido: consumidor reconcilia seu ledger.
- Rebuild: side effects externos desabilitados.
