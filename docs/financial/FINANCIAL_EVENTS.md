# Financial Events — Catálogo normativo

## 1. Propósito

Financial Event registra, no passado, uma decisão já tomada por um Aggregate do Financial Platform.

Event:

- não solicita ação;
- não altera outro Aggregate;
- não garante que consumidores já reagiram;
- não substitui Ledger Entry;
- não significa que um efeito externo ocorreu, salvo quando seu nome declara confirmação reconciliada.

Um consumidor pode reagir emitindo Command ao owner apropriado.

## 2. Envelope conceitual

Todo Event financeiro contém:

- `eventId`;
- nome e schema version;
- produtor/contexto;
- Aggregate identity e revision;
- timestamp da decisão;
- effective timestamp, quando fato externo informar outro marco;
- correlation e causation;
- ator/origem;
- idempotency reference;
- política e versão;
- payload conceitual;
- classificação de auditoria;
- integridade/hash.

Valor e moeda são obrigatórios em todo Event com semântica monetária.

## 3. Ordering

Ordering mínimo:

- por Payment para lifecycle da cobrança;
- por CampaignBudget para créditos/reservas/consumos;
- por PartnerLedger/PartnerAccount para saldos;
- por Withdrawal para tentativas;
- por WithdrawalBatch para lifecycle do lote.

Não existe ordering global obrigatório entre todos os Events.

Consumers:

- preservam ordering requerido;
- detectam gaps;
- não avançam máquina com Event incompatível;
- podem aguardar/reconciliar Event tardio;
- nunca reescrevem Event anterior.

## 4. Idempotência, retry e replay

- cada `eventId` é processado no máximo uma vez por efeito semântico;
- redelivery mantém o mesmo `eventId`;
- retry de publicação não cria Event novo;
- replay não executa novamente cobrança/transferência;
- consumidor em rebuild não emite efeitos externos;
- mesma causalidade com Event diferente e incompatível abre diagnóstico;
- prazo quantitativo de retenção de dedupe permanece `OPEN-030`.

## 5. Versionamento

Nova schema version:

- preserva significado do Event;
- é compatível com consumidores declarados ou exige migração explícita;
- não muda fato passado;
- não renomeia Event para reutilizar semântica;
- mantém identificadores e valores essenciais;
- registra política de origem.

Mudança de significado exige novo Event, não apenas novo campo.

## 6. Events de Payment

### PaymentRegistered

- **Produtor:** `Payment`.
- **Consumidores:** instrução de cobrança, Analytics, auditoria.
- **Payload:** Payment, obrigação/Campaign correlacionada, método, valor destinado à Campaign, taxas declaradas, total, moeda e políticas.
- **Ordering:** primeiro Event do Payment.
- **Idempotência:** Payment identity.
- **Retry:** redelivery sem nova cobrança; o consumidor usa identidade da tentativa.
- **Compensação:** cancelamento é Event posterior.

### PaymentPending

- **Produtor:** `Payment`.
- **Consumidores:** Notifications, Analytics, reconciliação.
- **Payload:** Payment, referência externa, método, valor/moeda, revisão externa.
- **Ordering:** depois de registro.
- **Compensação:** nenhum saldo foi criado.

### PaymentReceived

- **Produtor:** `Payment`, após aceitar fato externo.
- **Consumidores:** Notifications, Analytics, reconciliação.
- **Payload:** Payment, referência externa, valor/moeda, horários informado/observado, política.
- **Ordering:** por Payment.
- **Idempotência:** fato externo/revisão.
- **Retry:** redelivery não muda budget.
- **Compensação:** recebido ainda não exige compensação monetária.

### PaymentCompensationStarted

- **Produtor:** `Payment`.
- **Consumidores:** monitoramento e reconciliação.
- **Payload:** Payment, revisão, origem e estado.
- **Ordering:** antes de `PaymentCompensated`, quando aplicável.
- **Retry:** sem efeito financeiro.

### PaymentCompensated

- **Produtor:** `Payment`.
- **Consumidores:** serviço que emite `PostPaymentLedgerEntry`, Notifications, Analytics.
- **Payload:** Payment, ocorrência de compensação, referência externa, valor de Campaign, taxas separadas, moeda, políticas.
- **Ordering:** transição válida do Payment.
- **Idempotência:** Payment + ocorrência/revisão.
- **Retry:** consumidor emite o mesmo Command ao PaymentLedger.
- **Compensação:** refund/chargeback gera Event e lançamento posteriores; nunca altera este.

### PaymentCancelled

- **Produtor:** `Payment`.
- **Consumidores:** cobrança, Notifications, Analytics, reconciliação.
- **Payload:** Payment, motivo, ator/fato externo, estado anterior.
- **Ordering:** somente de estado cancelável.
- **Compensação:** nova cobrança é nova tentativa; confirmação tardia abre reconciliação.

### PaymentOverdue

- **Produtor:** `Payment`.
- **Consumidores:** Notifications, Campaign Management, Analytics.
- **Payload:** Payment, vencimento, política, valor/moeda.
- **Ordering:** por lifecycle.
- **Retry:** idempotente pelo vencimento/política.
- **Compensação:** pagamento tardio é novo fato aceito/reconciliado; Event não é apagado.

### PaymentDisputed

- **Produtor:** `Payment`.
- **Consumidores:** reconciliação, Financial Policy, Notifications.
- **Payload:** Payment, dispute identity, valor afetado, motivo, referência.
- **Ordering:** após fato que originou a disputa.
- **Compensação:** resolução produz novo Event; alocação financeira segue `OPEN-016/017`.

### PaymentFailed

- **Produtor:** `Payment`.
- **Consumidores:** Notifications, reconciliação, Analytics.
- **Payload:** Payment, attempt, falha categorizada e definitividade.
- **Ordering:** por Payment/attempt.
- **Retry:** nova tentativa é correlacionada; não reutiliza Event.
- **Compensação:** nenhuma se não houve movimento.

## 7. Events de PaymentLedger

### PaymentLedgerEntryPosted

- **Produtor:** `PaymentLedger`.
- **Consumidores:** serviço que emite `IncreaseCampaignBudget`, reconciliação, Analytics.
- **Payload:** entry, Payment, CampaignBudget alvo quando inequivocamente alocado, valor/moeda, políticas e origem.
- **Ordering:** por PaymentLedger.
- **Idempotência:** fato de compensação.
- **Retry:** mesmo Command de budget; não novo Entry.
- **Compensação:** lançamento posterior referenciando este.

### PaymentLedgerCompensatingEntryPosted

- **Produtor:** `PaymentLedger`.
- **Consumidores:** CampaignBudget/reconciliação conforme política aprovada, Analytics.
- **Payload:** entry novo, entry original, fato compensatório, valor/moeda, motivo/política.
- **Ordering:** depois da origem.
- **Idempotência:** origem + fato compensatório.
- **Compensação:** outra correção exige nova decisão/Entry; jamais edição.

## 8. Events de CampaignBudget

### CampaignBudgetIncreased

- **Produtor:** `CampaignBudget`.
- **Consumidores:** Campaign Management, Saga de alocação, Analytics.
- **Payload:** budget, PaymentLedgerEntry, valor/moeda, buckets antes/depois, revision e política.
- **Ordering:** por CampaignBudget.
- **Idempotência:** origem do crédito.
- **Retry:** reprocessar não aumenta novamente.
- **Compensação:** ajuste posterior por Command aprovado.

### BudgetReservationAuthorized

- **Produtor:** `CampaignBudget`.
- **Consumidores:** Saga de alocação, Slot, Analytics.
- **Payload:** reservation, Campaign, Slot intent, PricingQuote, valor/moeda, expiry, buckets, revision e política.
- **Ordering:** antes de `SlotAllocated`.
- **Idempotência:** reservation/Slot intent.
- **Retry:** Saga recupera esta autorização; não cria outra.
- **Compensação:** `BudgetReservationReleased` ou `Expired`.

### BudgetReservationRejected

- **Produtor:** `CampaignBudget`.
- **Consumidores:** Saga de alocação, Campaign Management, Analytics.
- **Payload:** intenção, valor, revisão observada, motivo categorizado, política.
- **Ordering:** decisão da tentativa; não muda buckets.
- **Idempotência:** reservation intent + expected revision.
- **Retry:** nova avaliação explícita após reler estado; não alterar decisão histórica.
- **Compensação:** não aplicável.

### BudgetReservationReleased

- **Produtor:** `CampaignBudget`.
- **Consumidores:** Saga causadora, Campaign Management, Analytics.
- **Payload:** reservation, causa, valor/moeda, buckets, revision.
- **Ordering:** depois de autorização; incompatível com consumo integral anterior.
- **Idempotência:** reservation + cause/decision.
- **Retry:** não libera duas vezes.
- **Compensação:** nova reserva é nova obrigação, não reversão deste Event.

### BudgetReservationExpired

- **Produtor:** `CampaignBudget`.
- **Consumidores:** Slot/Saga, Campaign Management, Analytics.
- **Payload:** reservation, expiry, política, estado observado e valor.
- **Ordering:** após autorização.
- **Idempotência:** reservation + expiry revision.
- **Retry:** não repete liberação.
- **Compensação:** Event tardio incompatível abre reconciliação; não reativa a reserva.

### BudgetReservationConsumed

- **Produtor:** `CampaignBudget`.
- **Consumidores:** Campaign Management, Settlement/Analytics somente por contrato de leitura permitido.
- **Payload:** reservation, Slot, Evidence, quote, valor/moeda, buckets e políticas.
- **Ordering:** após Evidence válida/ancorada e reserva ativa.
- **Idempotência:** reservation + Evidence.
- **Retry:** não consome novamente.
- **Compensação:** reversão tardia produz ajuste financeiro, não altera consumo.

### CampaignBudgetDepleted

- **Produtor:** `CampaignBudget`.
- **Consumidores:** Campaign Management, Saga de alocação, Notifications.
- **Payload:** budget, buckets, revision e causa.
- **Ordering:** por CampaignBudget.
- **Idempotência:** revision que tornou disponibilidade zero.
- **Compensação:** novo crédito publica `CampaignBudgetIncreased`; Campaign decide retomada.

### CampaignBudgetClosed

- **Produtor:** `CampaignBudget`.
- **Consumidores:** Campaign Management, reconciliação, Analytics.
- **Payload:** budget, buckets finais, obrigações resolvidas, política e motivo.
- **Ordering:** final para novas obrigações.
- **Compensação:** ajustes históricos continuam por Events próprios; não reabre.

## 9. Events de PartnerLedger e Wallet

### PartnerCredited

- **Produtor:** `PartnerLedger`.
- **Consumidores:** PartnerWallet, Notifications, Analytics.
- **Payload:** entry/credit, Partner, Settlement/SplitShare, valor/moeda, classificação inicial `PENDING`, políticas.
- **Ordering:** por PartnerLedger.
- **Idempotência:** `splitShareId`.
- **Retry:** Wallet aplica uma vez.
- **Compensação:** chargeback cria novo lançamento.

### PartnerCreditAvailable

- **Produtor:** `PartnerLedger`.
- **Consumidores:** PartnerWallet, Notifications.
- **Payload:** credit, regra de maturação, valor/classificação, policy version.
- **Ordering:** depois de crédito e ausência/resolução de bloqueio.
- **Idempotência:** credit + maturation decision.
- **Compensação:** bloqueio posterior é novo fato.

### PartnerCreditBlocked

- **Produtor:** `PartnerLedger`.
- **Consumidores:** PartnerWallet, Withdrawal, Notifications.
- **Payload:** credit/escopo, motivo, valor, política e ator.
- **Ordering:** por PartnerLedger.
- **Idempotência:** block decision.
- **Compensação:** `PartnerCreditUnblocked`.

### PartnerCreditUnblocked

- **Produtor:** `PartnerLedger`.
- **Consumidores:** PartnerWallet, Withdrawal, Notifications.
- **Payload:** bloqueio resolvido, classificação destino e base.
- **Ordering:** após bloqueio.
- **Idempotência:** block + resolution.

### WithdrawalBalanceReserved

- **Produtor:** `PartnerLedger`.
- **Consumidores:** Withdrawal, PartnerWallet.
- **Payload:** reservation, Withdrawal, valor, taxa, Ledger revision, política.
- **Ordering:** por PartnerLedger/PartnerAccount.
- **Idempotência:** Withdrawal.
- **Retry:** não reserva duas vezes.
- **Compensação:** liberação ou débito confirmado.

### WithdrawalBalanceReservationRejected

- **Produtor:** `PartnerLedger`.
- **Consumidores:** Withdrawal.
- **Payload:** Withdrawal, revisão, motivo (saldo, negativo, conflito, bloqueio).
- **Ordering:** decisão da tentativa.
- **Idempotência:** Withdrawal + expected revision.

### WithdrawalBalanceReleased

- **Produtor:** `PartnerLedger`.
- **Consumidores:** PartnerWallet, Withdrawal, Notifications.
- **Payload:** reservation, valor, taxa, causa e estado terminal.
- **Ordering:** após reserva; sem débito confirmado.
- **Idempotência:** reservation + release decision.

### WithdrawalDebited

- **Produtor:** `PartnerLedger`.
- **Consumidores:** PartnerWallet, reconciliação, Analytics.
- **Payload:** Withdrawal, execution reference, valor/moeda e entry.
- **Ordering:** após execução confirmada.
- **Idempotência:** Withdrawal + execução.
- **Compensação:** retorno/reversão externa exige novo lançamento.

### WithdrawalFeeDebited

- **Produtor:** `PartnerLedger`.
- **Consumidores:** PartnerWallet, Analytics.
- **Payload:** Withdrawal, taxa R$2 na versão inicial, política e entry próprio.
- **Ordering:** junto à confirmação reconciliada, como lançamento separado.
- **Idempotência:** Withdrawal + policy + execution.
- **Compensação:** nova entrada se política exigir devolução.

### NegativeBalanceCreated

- **Produtor:** `PartnerLedger`.
- **Consumidores:** PartnerWallet, Withdrawal, Notifications, Analytics.
- **Payload:** Partner, débito originador, valor negativo derivado, políticas.
- **Ordering:** por PartnerLedger.
- **Idempotência:** entry que causou o negativo.
- **Compensação:** recuperação por créditos futuros.

### NegativeBalanceRecovered

- **Produtor:** `PartnerLedger`.
- **Consumidores:** PartnerWallet, Notifications, Analytics.
- **Payload:** débito, crédito aplicado, valor recuperado/remanescente.
- **Ordering:** após crédito e negativo.
- **Idempotência:** negative entry + credit application.

### PartnerWalletProjectionUpdated

- **Produtor:** processo de projeção do Financial Platform.
- **Consumidores:** leitura/Notifications.
- **Payload:** Partner, buckets, Ledger revision/fronteira e projection version.
- **Ordering:** por Partner/revision.
- **Idempotência:** projection revision.
- **Compensação:** rebuild substitui projeção completa validada; não altera Ledger.
- **Nota:** não é Event autorizador de saque.

## 10. Events de Withdrawal

### WithdrawalRequested

- **Produtor:** `Withdrawal`.
- **Consumidores:** fluxo que solicita reserva no PartnerLedger, Notifications.
- **Payload:** Withdrawal, Partner, valor/moeda, destino referenciado, política.
- **Ordering:** primeiro Event.
- **Idempotência:** Partner + client request.
- **Compensação:** rejeição é Event posterior.

### WithdrawalApproved

- **Produtor:** `Withdrawal`.
- **Consumidores:** WithdrawalBatch, Notifications.
- **Payload:** Withdrawal, reserva de saldo, taxa, janela, política e decisão.
- **Ordering:** depois de Request e reserva.
- **Idempotência:** Withdrawal + approval revision.
- **Compensação:** falha definitiva libera reserva por outro owner.

### WithdrawalRejected

- **Produtor:** `Withdrawal`.
- **Consumidores:** PartnerLedger se houver compromisso a liberar, Notifications.
- **Payload:** Withdrawal, motivo, política e base da decisão.
- **Ordering:** a partir de `REQUESTED`.
- **Idempotência:** rejection decision.
- **Compensação:** final para a solicitação; nova intenção cria nova Withdrawal.

### WithdrawalBatched

- **Produtor:** `Withdrawal`.
- **Consumidores:** WithdrawalBatch, execução.
- **Payload:** Withdrawal, batch, valor/moeda e membership revision.
- **Ordering:** após aprovação.
- **Idempotência:** Withdrawal + batch.

### WithdrawalExecutionRequested

- **Produtor:** `Withdrawal`.
- **Consumidores:** boundary Asaas, reconciliação.
- **Payload:** Withdrawal, attempt, batch, valor/moeda, destino e identity externa idempotente.
- **Ordering:** após BATCHED.
- **Idempotência:** Withdrawal + attempt.
- **Retry:** redelivery usa a mesma tentativa; não cria transferência nova.
- **Compensação:** não existe enquanto resultado for desconhecido.

### WithdrawalExecuted

- **Produtor:** `Withdrawal`, após aceitar confirmação externa.
- **Consumidores:** PartnerLedger, WithdrawalBatch, Notifications, Analytics.
- **Payload:** Withdrawal, attempt, provider reference/receipt, valor/moeda e horários.
- **Ordering:** depois de execução solicitada.
- **Idempotência:** provider result + attempt.
- **Retry:** PartnerLedger debita uma vez.
- **Compensação:** eventual retorno é novo fato/lançamento.

### WithdrawalFailed

- **Produtor:** `Withdrawal`.
- **Consumidores:** PartnerLedger, WithdrawalBatch, Notifications, retry policy.
- **Payload:** Withdrawal, attempt, falha categorizada, definitividade e retry eligibility.
- **Ordering:** depois da tentativa.
- **Idempotência:** attempt + failure result.
- **Compensação:** falha definitiva libera reserva; retry cria nova tentativa apenas após certeza de não movimento.

### WithdrawalReconciliationRequired

- **Produtor:** `Withdrawal`.
- **Consumidores:** operação financeira/reconciliação.
- **Payload:** Withdrawal, attempt, fatos conflitantes/ausentes e referências.
- **Ordering:** não finaliza a tentativa.
- **Idempotência:** attempt + diagnostic revision.
- **Compensação:** nenhuma até resultado determinado.

### WithdrawalRetryScheduled

- **Produtor:** `Withdrawal`.
- **Consumidores:** executor/reconciliação.
- **Payload:** Withdrawal, tentativa anterior/nova, motivo e política.
- **Ordering:** após `FAILED` recuperável.
- **Idempotência:** new attempt.

## 11. Events de WithdrawalBatch

### WithdrawalBatchOpened

- **Produtor:** `WithdrawalBatch`.
- **Consumidores:** agrupador/Analytics.
- **Payload:** batch, janela, moeda/política.
- **Ordering:** primeiro.

### WithdrawalBatchSealed

- **Produtor:** `WithdrawalBatch`.
- **Consumidores:** executor, auditoria.
- **Payload:** batch, members, totais e membership revision.
- **Ordering:** `OPEN → SEALED`.
- **Invariante:** membros/valores não mudam depois.

### WithdrawalBatchSubmitted

- **Produtor:** `WithdrawalBatch`.
- **Consumidores:** reconciliação, Analytics.
- **Payload:** batch, submission identity, itens.
- **Ordering:** `SEALED → SUBMITTED`.
- **Retry:** mesma submission identity enquanto resultado desconhecido.

### WithdrawalBatchReconciliationUpdated

- **Produtor:** `WithdrawalBatch`.
- **Consumidores:** operação/Analytics.
- **Payload:** batch, resultados por item, pendências e revision.
- **Ordering:** por batch.
- **Idempotência:** reconciliation revision.
- **Compensação:** item destacado para outro batch é fato explícito.

### WithdrawalBatchClosed

- **Produtor:** `WithdrawalBatch`.
- **Consumidores:** Analytics, auditoria.
- **Payload:** batch, resultados finais/destacados e totais reconciliados.
- **Ordering:** final.
- **Retry:** não reabre batch.

## 12. Events de política e reconciliação

### FinancialPolicyChanged

- **Produtor:** `FinancialPolicy`.
- **Consumidores:** Financial Platform, auditoria, Analytics.
- **Payload:** policy type, versão, vigência, mudanças, atores e ADR.
- **Ordering:** por tipo/version.
- **Idempotência:** policy type + version.
- **Compensação:** nova versão prospectiva; nunca edição.

### FinancialReconciliationRequired

- **Status:** contrato lógico superseded por `PaymentReconciliationRequired`, `PartnerLedgerReconciliationRequired` e `WithdrawalReconciliationRequired`, cada qual com producer único.
- **Consumidores:** operação financeira autorizada.
- **Payload:** escopo, identidades, divergência, fatos presentes/ausentes.
- **Ordering:** por operação.
- **Idempotência:** operation + diagnostic revision.

### FinancialReconciliationCompleted

- **Status:** contrato lógico superseded por Events de conclusão especializados por owner.
- **Consumidores:** Aggregates por novos Commands, auditoria.
- **Payload:** diagnóstico, decisão, fatos usados, Commands compensatórios requeridos.
- **Ordering:** após abertura.
- **Compensação:** correções ocorrem em owners específicos; este Event não altera Ledger.

## 13. Falhas de entrega

| Situação | Regra |
| --- | --- |
| Event duplicado | consumidor retorna “já processado” |
| Event fora de ordem | aguarda/reconcilia; não pula estado |
| Event perdido temporariamente | redelivery/replay com mesmo eventId |
| consumidor falha depois do próprio efeito | retry deve reconhecer efeito por causation |
| consumidor permanentemente rejeita | diagnóstico; produtor não é revertido automaticamente |
| schema desconhecido | bloquear consumo e alertar; não interpretar por heurística |

## 14. Exemplos

### Válido

`PaymentCompensated` é entregue duas vezes. O PaymentLedger cria um Entry. `PaymentLedgerEntryPosted` é entregue duas vezes. CampaignBudget aumenta uma vez.

### Válido

`WithdrawalExecutionRequested` é replayado em rebuild. O consumidor externo está desativado nesse modo; nenhuma transferência é emitida.

### Inválido

Consumidor de `PartnerCredited` inserir outro PartnerLedgerCredit em vez de atualizar a projeção.

### Inválido

Interpretar ausência de `WithdrawalExecuted` dentro de um timeout como `WithdrawalFailed`.

## 15. Decisões abertas

Payloads fiscais/contábeis e parâmetros quantitativos dependem de `OPEN-005/006`, `OPEN-016` a `OPEN-020`, `OPEN-025`, `OPEN-027`, `OPEN-030` a `OPEN-033` da [PLATFORM_SPECIFICATION.md](../specification/PLATFORM_SPECIFICATION.md).
## Eventos de consequências de Governance

São produzidos pelo Aggregate financeiro executor, nunca pelo GovernanceCase, e referenciam `governanceCaseId + decisionId + decisionRevision`.

| Event | Producer | Significado |
| --- | --- | --- |
| `PlatformLossRecorded` | PaymentLedger | perda autorizada foi materializada |
| `PartnerCompensated` | PartnerLedger | compensação foi registrada |
| `AdvertiserRefundRecorded` | PaymentLedger | obrigação de refund foi registrada |
| `ResponsiblePartyRecoveryRecorded` | PartnerLedger | recovery de Edge Partner foi registrado |

Reentrega da decisão não republica efeito. Nova revision cria Event/entry compensatório quando necessário e nunca substitui o anterior.

## Eventos financeiros consolidados

| Event | Producer único | Significado |
| --- | --- | --- |
| `AdvertiserUnusedCreditRefunded` | `PaymentLedger` | crédito não usado foi devolvido |
| `PartnerRecoveryObligationRegistered` | `PartnerLedger` | obrigação contra Edge Partner foi registrada |
| `AdvertiserRecoveryObligationRegistered` | `PaymentLedger` | recebível contra Advertiser foi registrado |
| `ThirdPartyRecoveryObligationRegistered` | `PaymentLedger` | recebível contra terceiro integrado foi registrado |
| `ParticipantPayoutHeld` | `PartnerLedger` | valor foi bloqueado cautelarmente |
| `TaxPaymentExecuted` | `PaymentLedger` | lote de retenções foi recolhido |
| `PaymentReconciliationRequired/Completed` | `PaymentLedger` | reconciliação de pagamento |
| `PartnerLedgerReconciliationRequired/Completed` | `PartnerLedger` | reconciliação de Ledger do Partner |
| `WithdrawalReconciliationRequired/Completed` | `Withdrawal` | reconciliação de saque |

`FinancialPolicyChanged` permanece canônico. `FinancialPolicyUpdated`, `WithdrawalExecutionFailed`, `FAILED_TAX_POLICY_MISSING` e aliases genéricos de recovery são proibidos.

`PaymentReceived` nunca é Event contábil. `PaymentCompensated` autoriza `PostPaymentLedgerEntry`.
