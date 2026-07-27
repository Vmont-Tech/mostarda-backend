# Governance & Dispute Management

## 1. Status e autoridade

- **Status:** normativo
- **Owner:** Governance & Dispute Management
- **Aggregate root:** GovernanceCase
- **Entities:** EvidenceReference, Investigation, ResponsibilityDecision, Appeal
- **States:** OPEN, INVESTIGATING, UNDER_REVIEW, DECIDED, APPEALED, REEVALUATING, CLOSED
- **Official event:** ResponsibilityDecisionPublished

Este documento fecha `OPEN-049`. Em caso de divergência, a Specification e o Decision Registry determinam a precedência; nenhum documento derivado pode conceder autoridade de julgamento a outro bounded context.

## 2. Propósito

Governance & Dispute Management é o único contexto autorizado a transformar fatos técnicos, operacionais, financeiros e contratuais em julgamento oficial de responsabilidade.

O contexto existe porque uma falha pode atravessar Campaign, Edge, Evidence, Financial, Settlement, Pricing, integrações e operação humana. Se cada owner de fatos também pudesse concluir culpa, a plataforma produziria decisões incompatíveis e consequências financeiras sem autoridade única.

O contexto separa quatro conceitos:

1. **fato:** produzido pelo contexto que observou ou executou algo;
2. **evidência:** referência verificável a um fato;
3. **julgamento:** conclusão oficial publicada por Governance;
4. **consequência:** efeito executado pelo bounded context competente.

## 3. Fronteira

### 3.1 Responsabilidades

Governance:

- abre e correlaciona casos;
- anexa referências imutáveis de evidência;
- conduz investigação;
- aplica uma GovernancePolicyVersion;
- registra classificação proposta;
- encaminha ambiguidades para revisão humana;
- publica ResponsibilityDecision;
- recebe recurso;
- reavalia sem reescrever o passado;
- fecha o caso;
- mantém trilha completa de auditoria.

### 3.2 Não responsabilidades

Governance nunca:

- produz ou corrige o fato de origem;
- altera Campaign, Slot, Quote, Playback, Evidence, Payment, Settlement ou Ledger;
- calcula preço ou saldo;
- executa crédito, débito, refund, payout ou compensação;
- administra usuários, empresas, papéis ou permissões;
- permite que IA publique decisão;
- presume responsabilidade pela ausência de evento;
- modifica decisão ou policy já publicada.

### 3.3 Autoridade dos outros contextos

| Contexto | Autoridade preservada | Autoridade proibida |
| --- | --- | --- |
| Campaign Management | lifecycle, intenção, Slot e cancelamento | concluir culpa |
| Pricing Engine | Quote, inputs e policy aplicada | atribuir responsabilidade por divergência |
| Campaign Budget | reserva, consumo e liberação | decidir quem absorve perda |
| Edge Runtime | playback, timeout, health e desconexão | culpar parceiro ou plataforma |
| Evidence Ledger | validade, integridade, disputa e reversão | julgamento contratual |
| Financial Platform | pagamento, chargeback e ledger | escolher responsável financeiro |
| Settlement | criar e compensar direitos | julgar causa ou culpa |
| AI Orchestration | análise e recomendação | publicar decisão oficial |

## 4. Modelo

### 4.1 GovernanceCase

GovernanceCase contém:

- `governanceCaseId`;
- `sourceContext`;
- tipo e origem;
- `occurredAt`;
- estado atual;
- EvidenceReferences;
- Investigation;
- ResponsibilityDecisions;
- Appeals;
- `aggregateRevision`;
- correlation e causation;
- timestamps de auditoria.

O Aggregate protege o lifecycle, a unicidade das revisões, a imutabilidade histórica e a autorização da publicação.

### 4.2 EvidenceReference

EvidenceReference aponta para o fato autoritativo e contém:

- contexto, Aggregate e identidade de origem;
- Event ID;
- schema e revisão;
- digest ou hash;
- referência de acesso permitida;
- instante do fato;
- instante da anexação.

Governance não assume ownership do conteúdo referenciado. Snapshot autorizado para auditoria não substitui a fonte e deve preservar o digest.

Uma mesma identidade de fato produz no máximo uma EvidenceReference lógica no caso. Payload divergente sob a mesma identidade é conflito e bloqueia uso até reconciliação.

### 4.3 Investigation

Investigation registra:

- escopo;
- questões investigadas;
- evidências obrigatórias e recebidas;
- gaps;
- GovernancePolicyVersion aplicada;
- resultado das regras determinísticas;
- recomendação de IA, se houver;
- revisão humana;
- conclusão proposta.

Ausência, atraso ou conflito de evidência obrigatória impede publicação. Timeout não é conclusão.

### 4.4 ResponsibilityDecision

Toda ResponsibilityDecision contém obrigatoriamente:

- `decisionId`;
- `revision`;
- `responsibleParty`;
- `responsibilityCategory`;
- `severity`;
- `confidence`;
- `policyVersion`;
- `decidedBy`;
- `decidedAt`;
- `reason`;
- `evidenceReferences[]`.

Cada revisão é append-only. Uma revisão posterior referencia a anterior, mas nunca a altera.

#### ResponsibleParty

Valores normativos:

- `ADVERTISER`;
- `EDGE_PARTNER`;
- `MOSTARDA`;
- `INTEGRATED_THIRD_PARTY`.

Cada decisão possui exatamente um responsável. Responsabilidade compartilhada é proibida.

#### ResponsibilityCategory

Valores normativos:

- `PLATFORM_BUG`;
- `OPERATIONAL_FAILURE`;
- `PARTNER_FAILURE`;
- `THIRD_PARTY_FAILURE`;
- `USER_MISUSE`;
- `FORCE_MAJEURE`;
- `UNKNOWN`.

Category representa causa; Severity representa impacto. Uma dimensão não determina a outra.

`UNKNOWN` significa que a investigação terminou e as evidências continuam insuficientes para atribuição inequívoca. Nunca significa “não analisado” e nunca é estado intermediário.

#### Severity

Valores normativos:

- `LOW`;
- `MEDIUM`;
- `HIGH`;
- `CRITICAL`.

### 4.5 Confidence

`confidence` é decimal obrigatório no intervalo fechado `[0.00, 1.00]`.

Ele representa a robustez da conclusão produzida pelo processo de governança, considerando qualidade, completude e consistência das evidências disponíveis no momento da decisão.

Sua finalidade é exclusivamente explicativa, estatística e auditável.

Não representa:

- probabilidade estatística de culpa;
- risco jurídico;
- percentual de certeza jurídica;
- autoridade da decisão;
- condição para executar consequência.

Uma ResponsibilityDecisionPublished é sempre oficial, independentemente do confidence. Nenhum bounded context pode condicionar, ampliar, reduzir, suspender ou ignorar efeito jurídico, operacional, contratual ou financeiro por esse valor.

LOW, MEDIUM e HIGH de confiança nunca são persistidos. São projections derivadas por Configuration Policy versionada. Mudança de limiar não reinterpreta decisão histórica.

### 4.6 GovernancePolicyVersion

Toda ResponsibilityDecision referencia exatamente uma GovernancePolicyVersion.

Uma versão publicada e sua referência na decisão são imutáveis. Correção ou mudança cria nova versão. Reavaliação sob policy diferente cria nova ResponsibilityDecision e nova revision.

A policy preserva:

- identidade, versão, status e vigência;
- critérios determinísticos;
- evidências obrigatórias;
- regras de category e severity;
- requisitos de revisão humana;
- autoridades de publicação;
- hash;
- autoria e aprovação.

### 4.7 Appeal

Appeal contém:

- `appealId`;
- decisão e revisão contestadas;
- parte recorrente;
- fundamento;
- novas EvidenceReferences;
- estado e resultado;
- timestamps e auditoria.

Recurso não apaga, edita nem suspende automaticamente a decisão. Qualquer mudança exige nova publicação.

## 5. Lifecycle

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

Transições permitidas:

| Origem | Destino | Command | Event | Condição |
| --- | --- | --- | --- | --- |
| inexistente | OPEN | OpenGovernanceCase | GovernanceCaseOpened | causa e origem válidas |
| OPEN | INVESTIGATING | StartInvestigation | InvestigationStarted | policy selecionada |
| INVESTIGATING | UNDER_REVIEW | RequestHumanReview | HumanReviewRequested | ambiguidade ou conflito |
| INVESTIGATING | DECIDED | PublishDecision | ResponsibilityDecisionPublished | regra inequívoca e evidências completas |
| UNDER_REVIEW | DECIDED | PublishDecision | ResponsibilityDecisionPublished | operador autorizado |
| DECIDED | APPEALED | AppealDecision | ResponsibilityDecisionAppealed | recurso admissível |
| APPEALED | REEVALUATING | ReevaluateGovernanceCase | GovernanceCaseReevaluated | escopo de reavaliação registrado |
| REEVALUATING | DECIDED | PublishDecision | ResponsibilityDecisionPublished | nova revisão válida |
| DECIDED | CLOSED | CloseGovernanceCase | GovernanceCaseClosed | efeitos e prazos reconciliados |

`CLOSED` é final. Novo fato após fechamento abre novo caso correlacionado. Timeout nunca muda estado para DECIDED ou CLOSED.

## 6. Commands

Commands normativos:

- `OpenGovernanceCase`;
- `AttachEvidenceReference`;
- `StartInvestigation`;
- `RequestHumanReview`;
- `ClassifyResponsibility`;
- `PublishDecision`;
- `AppealDecision`;
- `ReevaluateGovernanceCase`;
- `CloseGovernanceCase`.

Todo Command informa actor, autorização, expected aggregate revision, correlation, causation, idempotency key, motivo e policy aplicável. Contratos completos estão em [GOVERNANCE_COMMANDS.md](./GOVERNANCE_COMMANDS.md).

## 7. Events

Events normativos:

- `GovernanceCaseOpened`;
- `EvidenceReferenceAttached`;
- `InvestigationStarted`;
- `HumanReviewRequested`;
- `ResponsibilityDecisionPublished`;
- `ResponsibilityDecisionAppealed`;
- `GovernanceCaseReevaluated`;
- `GovernanceCaseClosed`.

`ResponsibilityAssigned` e `ResponsibilityReassigned` são proibidos. Mudança de conclusão é nova revision de ResponsibilityDecisionPublished.

Contratos completos estão em [GOVERNANCE_EVENTS.md](./GOVERNANCE_EVENTS.md).

## 8. Processo de decisão

1. Um fato material ou disputa causa OpenGovernanceCase.
2. Governance valida identidade, autorização e deduplicação.
3. EvidenceReferences são anexadas sem copiar ownership.
4. StartInvestigation congela a policy aplicável à investigação.
5. Regras determinísticas avaliam somente evidências declaradas.
6. ClassifyResponsibility registra proposta sem autoridade externa.
7. Ambiguidade causa HumanReviewRequested.
8. PublishDecision valida todos os invariantes.
9. ResponsibilityDecisionPublished torna a revisão oficial.
10. Consumidores executam consequências por Commands próprios.

IA pode organizar evidências e recomendar classificação. IA nunca executa PublishDecision.

## 9. Consumidores e consequências

| Consumidor | Reação permitida | Proibição |
| --- | --- | --- |
| Financial Platform | criar PlatformLossEntry, PartnerCompensation, AdvertiserRefund ou recovery | reinterpretar responsável |
| Settlement | criar, bloquear ou compensar direitos por Command próprio | pagar ou cancelar diretamente pelo Event |
| Campaign Management | registrar resultado e emitir Command compatível com lifecycle | reabrir ou mudar campanha por inferência |
| Notifications | informar partes autorizadas | expor evidência sensível |
| Analytics | projetar causa, impacto e revisões | transformar projection em decisão |

Toda consequência material referencia `decisionId + revision`. Nova decisão não edita efeito anterior; causa compensação append-only no owner competente.

## 10. Concorrência e idempotência

- Commands usam idempotency key estável por intenção.
- O Aggregate aplica optimistic concurrency por expected revision.
- Duas publicações para a mesma revisão não podem vencer.
- Repetição idêntica retorna o resultado já produzido.
- Mesma chave com payload divergente é conflito.
- Events são ordenados por `governanceCaseId + aggregateRevision`.
- Consumidores deduplicam por Event ID e `decisionId + revision`.
- Appeals concorrentes são preservados, mas reavaliação é serializada pelo Aggregate.

## 11. Falhas, retries e recuperação

### Event de origem ausente

O caso registra gap e aguarda ou solicita evidência. Não presume fato.

### Event duplicado

Deduplicação impede segunda EvidenceReference e segundo efeito.

### Event fora de ordem

Governance persiste dependência pendente. Decisão só ocorre quando as precondições estiverem satisfeitas.

### Timeout de investigação

Gera alerta ou HumanReviewRequested segundo policy. Nunca publica decisão automática.

### Falha após persistência e antes da publicação

Outbox/republicação preserva Event ID. Retry não cria nova revisão.

### Resultado desconhecido em consumidor

O consumidor reconcilia seu próprio ledger antes de repetir. Governance não assume execução.

### Replay

Reconstrói estado e projections sem publicar nova decisão nem repetir consequência.

### Rebuild

Reidrata GovernanceCase pelo stream ordenado. External side effects permanecem desabilitados.

## 12. Auditoria e segurança

Toda operação registra:

- actor e papel;
- autorização;
- motivo;
- estado anterior e posterior;
- evidências e digests;
- policyVersion;
- decisão e revisão;
- correlation e causation;
- timestamps;
- resultado de Commands consumidores.

Dados sensíveis permanecem nos owners. Governance armazena referências e snapshots somente quando política de privacidade autorizar.

Segregação mínima:

- quem administra policy não aprova sozinho sua própria exceção;
- IA não possui credencial de publicação;
- recurso não é decidido pelo mesmo actor quando política exigir segregação;
- publicação exige autorização explícita e auditável.

## 13. Exemplos normativos

### 13.1 Falha do gateway

Financial publica indisponibilidade e resultado da tentativa. Campaign publica seu estado. Settlement publica direitos existentes. Governance investiga, aplica policy e publica a decisão. Somente depois Financial executa a consequência correspondente.

### 13.2 Playback válido com disputa

Edge publica playback; Evidence valida a prova; Advertiser abre disputa. Evidence pode manter estado interno DISPUTED, mas não atribui culpa. Governance publica a decisão após investigação.

### 13.3 Reclassificação após recurso

Revision 1 atribui MOSTARDA. Recurso adiciona nova evidência e revision 2 atribui INTEGRATED_THIRD_PARTY. Revision 1 e seus efeitos permanecem. Revision 2 causa Commands compensatórios.

### 13.4 UNKNOWN

Após investigação concluída, fatos conflitantes e ausência irrecuperável impedem atribuição inequívoca. Governance pode publicar UNKNOWN com responsável único e reason explícito segundo a policy. Antes da conclusão, UNKNOWN é inválido.

## 14. Contraexemplos proibidos

- Financial recebe ChargebackReceived e decide que MOSTARDA absorve a perda.
- Evidence invalida prova e declara EDGE_PARTNER responsável.
- Campaign usa confidence menor que 0.50 para ignorar decisão.
- Analytics persiste HIGH como confidence oficial.
- Operador troca policyVersion de decisão histórica.
- Replay republica ResponsibilityDecisionPublished com novo Event ID.
- Timeout encerra caso como UNKNOWN.
- Dois contextos publicam eventos de responsabilidade concorrentes.

## 15. Critério de implementabilidade

O contexto é implementável somente quando:

- Commands, Events, state machine e invariantes especializados estão sincronizados;
- OPEN-049 está CLOSED em toda referência;
- Decision Registry e Traceability apontam para estes contratos;
- nenhum outro contexto conserva autoridade de julgamento;
- todos os efeitos financeiros exigem decisionId e revision;
- links e nomes públicos passam pela validação transversal.
