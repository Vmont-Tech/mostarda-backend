# Governance Commands

## 1. Regras comuns

Todos os Commands pertencem ao Aggregate `GovernanceCase` e carregam:

- `commandId`;
- `governanceCaseId`, exceto na abertura;
- `actorId` e papel autorizado;
- `expectedAggregateRevision`;
- `idempotencyKey`;
- `correlationId`;
- `causationId`;
- `requestedAt`;
- motivo;
- payload versionado.

Reentrega idêntica retorna o resultado anterior. Mesma idempotency key com payload diferente retorna conflito. Falha de optimistic concurrency exige releitura; retry cego é proibido. Command rejeitado não emite Event de sucesso.

## 2. OpenGovernanceCase

- **Owner:** GovernanceCase.
- **Actor:** sistema autorizado ou operador autorizado.
- **Precondições:** sourceContext reconhecido; causa identificável; correlação válida; caso equivalente não existente.
- **Pós-condições:** caso em OPEN, sem decisão.
- **Event:** GovernanceCaseOpened.
- **Idempotência:** chave derivada da intenção de abertura e identidade do incidente.
- **Concorrência:** uma abertura vence; duplicatas convergem para o mesmo caso.
- **Falhas:** origem inválida, autorização ausente, conflito de payload, caso duplicado incompatível.

Nunca classifica responsabilidade durante a abertura.

## 3. AttachEvidenceReference

- **Owner:** GovernanceCase.
- **Actor:** coletor autorizado, sistema de origem ou investigador.
- **Precondições:** caso não CLOSED; referência possui owner, Event ID, schema, digest e autorização de acesso.
- **Pós-condições:** referência imutável anexada uma vez.
- **Event:** EvidenceReferenceAttached.
- **Idempotência:** GovernanceCaseId + identidade autoritativa do fato.
- **Concorrência:** referências independentes podem concorrer; aggregate revision serializa a lista.
- **Falhas:** digest divergente, origem desconhecida, referência duplicada incompatível, dado proibido por privacidade.

O Command não copia ownership nem corrige o fato.

## 4. StartInvestigation

- **Owner:** GovernanceCase.
- **Actor:** investigador ou automação autorizada.
- **Precondições:** estado OPEN; ao menos uma referência causal; GovernancePolicyVersion publicada e vigente para o instante aplicável.
- **Pós-condições:** estado INVESTIGATING; escopo e policy congelados.
- **Event:** InvestigationStarted.
- **Idempotência:** uma intenção por ciclo de investigação.
- **Concorrência:** somente a primeira transição válida vence.
- **Falhas:** policy inexistente, mutável ou incompatível; caso sem causa; estado inválido.

## 5. RequestHumanReview

- **Owner:** GovernanceCase.
- **Actor:** regra determinística, investigador ou operador autorizado.
- **Precondições:** estado INVESTIGATING; ambiguidade, conflito ou insuficiência material registrada.
- **Pós-condições:** estado UNDER_REVIEW; fila e motivo auditáveis.
- **Event:** HumanReviewRequested.
- **Idempotência:** uma solicitação ativa por investigation revision.
- **Concorrência:** duplicatas convergem; publicação concorrente válida vence somente se esperava a mesma revisão e todas as precondições estavam satisfeitas.
- **Falhas:** motivo vazio, estado inválido, tentativa de usar timeout como decisão.

## 6. ClassifyResponsibility

- **Owner:** GovernanceCase.
- **Actor:** regra determinística ou operador autorizado.
- **Precondições:** INVESTIGATING ou UNDER_REVIEW; evidências obrigatórias avaliadas; policy congelada.
- **Pós-condições:** conclusão proposta registrada, ainda sem autoridade externa.
- **Event público:** nenhum.
- **Idempotência:** por investigation revision + conteúdo da proposta.
- **Concorrência:** nova proposta exige expected revision atual; proposta anterior permanece auditável.
- **Falhas:** categoria, party, severity ou confidence inválidos; party/category indeterminadas; evidência ausente.

IA pode recomendar payload, mas não é actor autorizado deste Command quando ele altera estado decisório.

## 7. PublishDecision

- **Owner:** GovernanceCase.
- **Actor:** autoridade explicitamente autorizada pela GovernancePolicyVersion.
- **Precondições:** INVESTIGATING, UNDER_REVIEW ou REEVALUATING; proposta completa; evidências obrigatórias presentes; exatamente uma policyVersion; segregação satisfeita.
- **Pós-condições:** nova ResponsibilityDecision append-only; estado DECIDED.
- **Event:** ResponsibilityDecisionPublished.
- **Idempotência:** decisionId + revision; retry idêntico preserva Event ID.
- **Concorrência:** somente uma publicação por expected aggregate revision; perdedor relê e submete nova intenção, se ainda válida.
- **Falhas:** confidence fora de `[0.00,1.00]`; policy mutável; actor sem autoridade; revisão repetida; responsável compartilhado; party/category indeterminadas.

Publicação é oficial independentemente do confidence. Confidence nunca decide se consequências serão executadas.

## 8. AppealDecision

- **Owner:** GovernanceCase.
- **Actor:** parte com legitimidade ou representante autorizado.
- **Precondições:** estado DECIDED; revisão contestada existe; prazo e fundamento atendem policy.
- **Pós-condições:** Appeal append-only; estado APPEALED.
- **Event:** ResponsibilityDecisionAppealed.
- **Idempotência:** parte + decisão/revisão + identidade do recurso.
- **Concorrência:** recursos concorrentes são preservados; transição do caso ocorre uma vez.
- **Falhas:** revisão inexistente, recorrente sem legitimidade, CLOSED, recurso duplicado divergente.

O recurso não apaga nem suspende automaticamente a decisão.

## 9. ReevaluateGovernanceCase

- **Owner:** GovernanceCase.
- **Actor:** investigador ou autoridade de recurso.
- **Precondições:** estado APPEALED; Appeal admissível; escopo e policy de reavaliação definidos.
- **Pós-condições:** estado REEVALUATING; trilha de reavaliação aberta.
- **Event:** GovernanceCaseReevaluated.
- **Idempotência:** uma reavaliação por appeal revision.
- **Concorrência:** somente uma reavaliação ativa; outros recursos ficam correlacionados.
- **Falhas:** recurso inadmissível, policy ausente, estado inválido, tentativa de editar decisão anterior.

## 10. CloseGovernanceCase

- **Owner:** GovernanceCase.
- **Actor:** operador ou automação autorizada por policy.
- **Precondições:** estado DECIDED; prazo de recurso encerrado ou recursos resolvidos; consequências rastreadas conforme policy.
- **Pós-condições:** estado CLOSED final.
- **Event:** GovernanceCaseClosed.
- **Idempotência:** uma intenção de fechamento.
- **Concorrência:** Appeal concorrente válido impede fechamento quando vencer a revisão.
- **Falhas:** recurso pendente, consequência obrigatória sem rastreio, estado inválido.

CLOSED nunca retorna. Novo fato material abre novo caso correlacionado.
