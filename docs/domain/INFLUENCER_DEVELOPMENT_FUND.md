# Fundo de Desenvolvimento de Influenciadores

Status: `ACCEPTED`

## 1. Propósito

Este documento preserva o mecanismo histórico de `DEC-049`: ele transforma a parcela
canônica de 10% sem influenciador elegível em patrimônio restrito para desenvolver o
ecossistema de influenciadores. Não é receita livre, orçamento geral de marketing ou
parcela redistribuída aos outros quatro beneficiários. Essa regra não é a alocação
vigente dos componentes da `SPLIT-PERFORMANCE-RESIDUAL-V1`.

Este Aggregate é separado do `Influencer Acquisition Fund` introduzido por
`SPLIT-PERFORMANCE-RESIDUAL-V1`. A política comercial destina ao fundo de aquisição
somente os componentes de Influencer não conquistados; ela não altera o saldo, a
governança ou a utilização deste Fundo de Desenvolvimento. Qualquer interação entre
os dois mecanismos exige decisão financeira própria.

## 2. Formação

- Evidence monetizada com influenciador elegível cria SplitShare para ele.
- Evidence monetizada sem influenciador elegível cria SplitShare para este fundo
  somente quando o mecanismo separado de `DEC-049` for aplicado.
- A soma canônica permanece 100%.
- O beneficiário da linha é determinado e congelado pelo Settlement conforme `InfluencerEligibilityPolicyVersion`.
- Decisão histórica nunca muda por elegibilidade posterior.

## 3. Aggregate e saldos

`InfluencerDevelopmentFund` mantém ledger append-only com:

- `Available`;
- `Committed`;
- `Spent`;
- `Returned`;
- proposta e decisão causal;
- policy e equity snapshot.

Saldo não pode ser gasto duas vezes. Mostarda administra, mas não possui livre disponibilidade.

## 4. Finalidades

São elegíveis, conforme política:

- aquisição e onboarding;
- capacitação;
- produção e distribuição;
- campanhas e parcerias;
- eventos e ativações;
- infraestrutura compartilhada;
- estúdio, equipamentos e espaços de produção;
- experimentos diretamente relacionados ao canal.

Benefício institucional à Mostarda pode ser consequência, nunca finalidade única.

## 5. Governança

Toda despesa, ordinária ou extraordinária, exige:

- mais de 50% do equity total em votos favoráveis;
- ao menos dois votantes favoráveis distintos;
- finalidade compatível;
- saldo disponível;
- política versionada;
- snapshot societário imutável na abertura;
- registro de conflitos e abstenções.

Alterações futuras de equity não recalculam votação histórica.

## 6. Lifecycle

```text
DRAFT → OPEN_FOR_VOTE → APPROVED → COMMITTED → EXECUTED → ACCOUNTED
DRAFT/OPEN_FOR_VOTE → REJECTED/CANCELLED
APPROVED/COMMITTED → CANCELLED com liberação append-only
EXECUTED → UNDER_ACCOUNTABILITY → ACCOUNTED
```

## 7. Commands e Events

Commands: `ProposeFundExpense`, `OpenFundVote`, `CastEquityWeightedVote`,
`ApproveFundExpense`, `CommitFundBalance`, `ExecuteFundExpense`,
`SubmitFundAccountability`, `CloseFundExpense`.

Events: `FundExpenseProposed`, `FundVoteOpened`, `FundVoteCast`,
`FundExpenseApproved`, `FundBalanceCommitted`, `FundExpenseExecuted`,
`FundAccountabilitySubmitted`, `FundExpenseClosed`.

Financial executa lançamentos autorizados; não julga finalidade nem votos.

## 8. Auditoria e proibições

Cada decisão preserva proposta, valores, documentos, beneficiários, votos, equity, aprovadores, pagamentos e prestação de contas.

É proibido:

- direcionar saldo à receita livre;
- usar marketing institucional sem vínculo demonstrável;
- aprovar com um único votante;
- computar somente equity presente;
- recalcular voto histórico;
- editar despesa executada;
- usar Event como autorização financeira direta.
