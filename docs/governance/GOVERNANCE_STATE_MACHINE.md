# GovernanceCase State Machine

## 1. Estados

| Estado | Significado | Publicação permitida |
| --- | --- | --- |
| OPEN | caso registrado, investigação ainda não iniciada | não |
| INVESTIGATING | fatos e policies em análise | sim, somente conclusão determinística completa |
| UNDER_REVIEW | ambiguidade exige autoridade humana | sim, por actor autorizado |
| DECIDED | existe decisão oficial vigente | não sem recurso/reavaliação |
| APPEALED | decisão recebeu recurso admissível | não |
| REEVALUATING | recurso está sendo reavaliado | sim, como nova revisão |
| CLOSED | caso terminado | nunca |

`UNKNOWN` não existe no modelo de Governance. Incerteza mantém o caso em INVESTIGATING ou UNDER_REVIEW sem decisão publicada.

## 2. Transições

### inexistente → OPEN

- **Command:** OpenGovernanceCase.
- **Event:** GovernanceCaseOpened.
- **Owner:** GovernanceCase.
- **Invariantes:** identidade única; sourceContext válido; nenhuma culpa presumida.
- **Timeout:** nenhum.
- **Rollback:** inexistente; fechamento posterior preserva abertura.

### OPEN → INVESTIGATING

- **Command:** StartInvestigation.
- **Event:** InvestigationStarted.
- **Owner:** GovernanceCase.
- **Invariantes:** policy publicada; causa e evidência inicial presentes.
- **Timeout:** atraso gera observabilidade, não decisão.
- **Retry:** mesma chave retorna a investigação existente.

### INVESTIGATING → UNDER_REVIEW

- **Command:** RequestHumanReview.
- **Event:** HumanReviewRequested.
- **Owner:** GovernanceCase.
- **Invariantes:** motivo explícito; gaps ou ambiguidade registrados.
- **Timeout:** escala fila; nunca autoaprova.
- **Retry:** deduplicado por investigation revision.

### INVESTIGATING → DECIDED

- **Command:** PublishDecision.
- **Event:** ResponsibilityDecisionPublished.
- **Owner:** GovernanceCase.
- **Invariantes:** regra inequívoca, evidências completas, policy imutável, decisão completa.
- **Timeout:** não aplicável como trigger.
- **Concorrência:** optimistic lock impede duas revisões iguais.

### UNDER_REVIEW → DECIDED

- **Command:** PublishDecision.
- **Event:** ResponsibilityDecisionPublished.
- **Owner:** GovernanceCase.
- **Invariantes:** actor autorizado e segregação satisfeita.
- **Timeout:** mantém UNDER_REVIEW e alerta.
- **Rollback:** nova revisão somente após Appeal.

### DECIDED → APPEALED

- **Command:** AppealDecision.
- **Event:** ResponsibilityDecisionAppealed.
- **Owner:** GovernanceCase.
- **Invariantes:** decisão/revisão existem; recorrente legítimo.
- **Timeout:** prazo é Configuration Policy; expiração rejeita Command.
- **Efeito:** decisão continua oficial salvo policy expressa.

### APPEALED → REEVALUATING

- **Command:** ReevaluateGovernanceCase.
- **Event:** GovernanceCaseReevaluationStarted.
- **Owner:** GovernanceCase.
- **Invariantes:** Appeal admissível; escopo e policy registrados.
- **Retry:** uma reavaliação ativa por Appeal.
- **Rollback:** inexistente; falha mantém trilha e permite nova tentativa.

### REEVALUATING → DECIDED

- **Command:** PublishDecision.
- **Events, nesta ordem:** ResponsibilityDecisionPublished; GovernanceCaseReevaluated.
- **Owner:** GovernanceCase.
- **Invariantes:** revision nova; decisão anterior intocada; uma policyVersion imutável.
- **Compensação:** consumidores recebem Commands para novos efeitos append-only.
- **Concorrência:** revisão monotônica.

ResponsibilityDecisionPublished materializa a nova decisão enquanto o processo ainda está em REEVALUATING. GovernanceCaseReevaluated confirma a conclusão consumada e aplica o retorno a DECIDED. Nenhum dos dois pode trocar de ordem.

### DECIDED → CLOSED

- **Command:** CloseGovernanceCase.
- **Event:** GovernanceCaseClosed.
- **Owner:** GovernanceCase.
- **Invariantes:** recursos resolvidos; rastreio das consequências completo.
- **Timeout:** não fecha automaticamente.
- **Terminalidade:** CLOSED é final.

## 3. Transições proibidas

- OPEN → DECIDED sem investigação.
- INVESTIGATING → CLOSED.
- UNDER_REVIEW → CLOSED.
- DECIDED → INVESTIGATING sem Appeal.
- APPEALED → DECIDED sem reavaliação.
- CLOSED → qualquer estado.
- qualquer estado → decisão parcial ou UNKNOWN.
- timeout → DECIDED.

## 4. Falhas e recuperação

- Command concorrente perde por expected revision e deve reler.
- Event duplicado não repete transição.
- Gap de Event bloqueia transições dependentes.
- Reidratação aplica Events em aggregateRevision.
- Stream corrompido bloqueia publicação e exige reconciliação.
- Rebuild nunca dispara Commands consumidores.
- Falha após commit usa outbox; não cria nova decisão.

## 5. Estados finais

Somente CLOSED é terminal para GovernanceCase.

DECIDED não é terminal porque admite Appeal ou fechamento. Uma ResponsibilityDecision publicada é imutável mesmo enquanto o caso permanece aberto a recurso.
