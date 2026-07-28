# Financial Commands — Catálogo normativo

## 1. Regras do catálogo

Command expressa intenção dirigida a um único Aggregate owner.

Todo Command financeiro:

- usa verbo no imperativo;
- possui owner único;
- é revalidado pelo owner;
- informa identidade, ator, correlation, causation e idempotency key;
- declara versão esperada quando depende de uma leitura anterior;
- produz uma decisão aceita ou rejeitada;
- modifica apenas o Aggregate owner;
- publica Events somente após a decisão;
- nunca usa provider, Event ou projeção como autoridade automática;
- preserva política e versão aplicadas.

Um Event recebido pode causar a emissão de um Command, mas nunca altera outro Aggregate diretamente.

Nomes globais ainda devem ser consolidados com `OPEN-027/033`. Os contratos abaixo são normativos para o contexto; aliases não autorizam efeitos diferentes.

## 2. Envelope conceitual obrigatório

Cada Command contém:

- `commandId`;
- nome e versão;
- Aggregate owner e identity;
- expected revision, quando aplicável;
- ator/emissor;
- autorização/contexto;
- idempotency key;
- correlation e causation;
- instante da intenção;
- payload conceitual;
- política/version;
- motivo, quando administrativo/compensatório.

## 3. Resultados comuns

| Resultado | Significado |
| --- | --- |
| `ACCEPTED` | decisão aplicada e Events identificados |
| `ALREADY_APPLIED` | mesma intenção já possui resultado |
| `REJECTED` | regra de domínio não satisfeita |
| `CONFLICT` | revisão/identidade/conteúdo incompatível |
| `PENDING_RECONCILIATION` | fato externo não permite resultado conclusivo |

Timeout de chamada não é resultado de domínio.

## 4. Commands de Payment

### 4.1 RegisterPayment

- **Owner:** `Payment`.
- **Emissor:** Financial Platform, a partir de obrigação comercial autorizada.
- **Propósito:** criar a identidade e o lifecycle de uma obrigação/cobrança.
- **Pré-condições:** obrigação identificada; valor, moeda, Campaign correlacionável; método permitido; identidade inédita; política vigente.
- **Invariantes:** ContractValue não é saldo; cobrança não libera budget; taxa permanece separada.
- **Efeito:** cria `Payment` em `CREATED` e registra composição.
- **Eventos:** `PaymentRegistered`.
- **Idempotência:** obrigação + tentativa de cobrança.
- **Autorização:** serviço financeiro explicitamente autorizado.
- **Auditoria:** ator, contrato, método, valores, taxa, política e referência causal.
- **Falhas:** obrigação duplicada divergente, método não permitido, valor/moeda inválidos, política ausente.

### 4.2 MarkPaymentPending

- **Owner:** `Payment`.
- **Emissor:** Financial Platform após cobrança externa aceita.
- **Pré-condições:** `CREATED`; referência externa correlacionada.
- **Efeito:** `CREATED → PENDING`.
- **Eventos:** `PaymentPending`.
- **Idempotência:** Payment + referência externa + revisão.
- **Falhas:** referência usada por outro Payment, fato fora de ordem incompatível.

### 4.3 RecordPaymentReceived

- **Owner:** `Payment`.
- **Emissor:** boundary do provider após fato autenticado.
- **Pré-condições:** Payment conhecido; fato correlacionável; transição aceita.
- **Invariantes:** recebido não significa compensado e não aumenta budget.
- **Efeito:** `PENDING → RECEIVED`, quando válido.
- **Eventos:** `PaymentReceived`.
- **Idempotência:** provider payment + tipo/revisão do fato.
- **Autorização:** somente boundary autenticado; owner revalida.
- **Auditoria:** payload externo permitido, horário informado/observado, decisão.
- **Falhas:** spoofing, duplicata divergente, valor/moeda incompatíveis, estado final incompatível.

### 4.4 StartPaymentCompensation

- **Owner:** `Payment`.
- **Emissor:** boundary do provider ou processo financeiro autorizado.
- **Pré-condições:** `RECEIVED` e fato reconhecido pela política.
- **Efeito:** `RECEIVED → COMPENSATING`.
- **Eventos:** `PaymentCompensationStarted`.
- **Idempotência:** Payment + revisão da compensação.
- **Falhas:** transição inválida ou origem não confiável.

### 4.5 ConfirmPaymentCompensation

- **Owner:** `Payment`.
- **Emissor:** boundary do provider após confirmação autoritativa.
- **Pré-condições:** Payment elegível; valor/moeda conferem; fato único; divergências resolvidas.
- **Invariantes:** somente este resultado pode habilitar lançamento positivo; não altera Ledger/budget.
- **Efeito:** transita a `COMPENSATED`.
- **Eventos:** `PaymentCompensated`.
- **Idempotência:** Payment + ocorrência/revisão de compensação.
- **Auditoria:** referência externa, valores, política, origem e reconciliação.
- **Falhas:** Payment cancelado/disputado com confirmação tardia entra `PENDING_RECONCILIATION`, não libera saldo automaticamente.

### 4.6 CancelPayment

- **Owner:** `Payment`.
- **Emissor:** Financial Platform ou fato externo autorizado.
- **Pré-condições:** estado cancelável; motivo explícito; ausência de compensação reconhecida incompatível.
- **Efeito:** estado permitido → `CANCELLED`.
- **Eventos:** `PaymentCancelled`.
- **Idempotência:** Payment + decisão de cancelamento.
- **Falhas:** já compensado; resultado externo desconhecido; autorização insuficiente.

### 4.7 MarkPaymentOverdue

- **Owner:** `Payment`.
- **Emissor:** política temporal do próprio contexto.
- **Pré-condições:** vencimento aplicável atingido; sem compensação; estado permite.
- **Efeito:** `PENDING/RECEIVED → OVERDUE`, conforme máquina aprovada.
- **Eventos:** `PaymentOverdue`.
- **Idempotência:** Payment + vencimento/policy version.
- **Auditoria:** marco temporal e relógio autoritativo conceitual.
- **Falhas:** pagamento já compensado; vencimento divergente.

### 4.8 DisputePayment

- **Owner:** `Payment`.
- **Emissor:** boundary/operador financeiro autorizado.
- **Pré-condições:** fato de disputa identificável.
- **Efeito:** estado permitido → `DISPUTED`; histórico anterior preservado.
- **Eventos:** `PaymentDisputed`.
- **Idempotência:** Payment + dispute identity.
- **Falhas:** disputa duplicada divergente, referência desconhecida.

### 4.9 FailPayment

- **Owner:** `Payment`.
- **Emissor:** boundary financeiro.
- **Pré-condições:** falha definitiva confirmada; não mero timeout.
- **Efeito:** estado permitido → `FAILED`.
- **Eventos:** `PaymentFailed`.
- **Idempotência:** Payment + attempt + failure fact.
- **Falhas:** resultado desconhecido; compensação já confirmada.

## 5. Commands de PaymentLedger

### 5.1 PostPaymentLedgerEntry

- **Owner:** `PaymentLedger`.
- **Emissor:** consumidor financeiro autorizado de `PaymentCompensated`.
- **Pré-condições:** Payment compensado; fato imutável; valor/moeda válidos; origem ainda não lançada.
- **Invariantes:** append-only; taxa não entra no valor de budget; um fato, uma entrada.
- **Efeito:** cria `PaymentLedgerEntry`.
- **Eventos:** `PaymentLedgerEntryPosted`.
- **Idempotência:** Payment + ocorrência de compensação.
- **Autorização:** serviço interno do Financial Platform.
- **Auditoria:** Payment, referência externa, valor, política, causation.
- **Falhas:** duplicidade divergente, origem não compensada, moeda/valor incompatível.

### 5.2 PostPaymentCompensatingEntry

- **Owner:** `PaymentLedger`.
- **Emissor:** processo financeiro autorizado após refund/chargeback/ajuste aprovado.
- **Pré-condições:** lançamento original; fato compensatório; política aplicável.
- **Invariantes:** não edita origem; não decide alocação ainda aberta.
- **Efeito:** novo lançamento compensatório.
- **Eventos:** `PaymentLedgerCompensatingEntryPosted`.
- **Idempotência:** original + fato compensatório.
- **Falhas:** origem ausente, valor sem política, duplicidade.
- **Observação:** tratamento completo segue o Financial Decision Register.

## 6. Commands de CampaignBudget

### 6.1 IncreaseCampaignBudget

- **Owner:** `CampaignBudget`.
- **Emissor:** consumidor autorizado de `PaymentLedgerEntryPosted`.
- **Pré-condições:** entrada positiva elegível; budget alvo; valor/moeda; origem não aplicada; Aggregate aberto a crédito.
- **Efeito:** aumenta `AvailableBudget`.
- **Eventos:** `CampaignBudgetIncreased`.
- **Idempotência:** PaymentLedgerEntry + CampaignBudget.
- **Falhas:** alocação ambígua (`OPEN-025`), moeda divergente, entrada duplicada, destino fechado.

### 6.2 AuthorizeBudgetReservation

- **Owner:** `CampaignBudget`.
- **Emissor:** Saga de alocação, após quote válido.
- **Pré-condições:** Campaign/Slot intent/quote correlacionados; valor integral; Available suficiente; revisão esperada atual; uma reserva por Slot; política vigente.
- **Invariantes:** reserva indivisível; valor igual ao quote; nenhuma sobrealocação; ocorre antes de `SlotAllocated`.
- **Efeito:** move valor de Available para Reserved e cria reserva.
- **Eventos:** `BudgetReservationAuthorized` ou, sem mudança, `BudgetReservationRejected`.
- **Idempotência:** Slot intent + PricingQuote + reservation intent.
- **Autorização:** somente Saga/serviço do contrato de alocação.
- **Auditoria:** buckets antes/depois, quote, revisão, expiry e política.
- **Falhas:** saldo insuficiente, revisão obsoleta, quote divergente/expirado, reserva existente.

### 6.3 ReleaseBudgetReservation

- **Owner:** `CampaignBudget`.
- **Emissor:** Saga de alocação, Saga de Evidence ou recuperação autorizada.
- **Pré-condições:** reserva ativa; valor não consumido; causa elegível.
- **Efeito:** move Reserved para Available; preserva reserva como liberada.
- **Eventos:** `BudgetReservationReleased`.
- **Idempotência:** reservation + release cause.
- **Falhas:** já consumida, já liberada, causa/Slot divergentes.

### 6.4 ExpireBudgetReservation

- **Owner:** `CampaignBudget`.
- **Emissor:** política temporal do próprio contexto.
- **Pré-condições:** reserva ativa; `expiresAt` atingido segundo relógio aceito; Evidence/execução não tornou a transição incompatível.
- **Efeito:** libera reserva por expiração.
- **Eventos:** `BudgetReservationExpired`.
- **Idempotência:** reservation + expiry revision.
- **Auditoria:** deadline, política e estado observado.
- **Falhas:** relógio do chamador sem autoridade; reserva consumida; prazo alterado.

### 6.5 ConsumeBudgetReservation

- **Owner:** `CampaignBudget`.
- **Emissor:** Saga de Evidence após validade e ancoragem confirmadas.
- **Pré-condições:** reserva ativa; Slot/Evidence/quote/valor correspondem; Evidence elegível; não consumida.
- **Invariantes:** playback sozinho não consome; consumo integral e idempotente.
- **Efeito:** move Reserved para Consumed.
- **Eventos:** `BudgetReservationConsumed`, eventualmente `CampaignBudgetDepleted`.
- **Idempotência:** reservation + Evidence.
- **Falhas:** Evidence inválida/não ancorada, valor divergente, reserva liberada/expirada.

### 6.6 CloseCampaignBudget

- **Owner:** `CampaignBudget`.
- **Emissor:** processo financeiro em reação a encerramento autorizado da Campaign.
- **Pré-condições:** destino de reservas e saldo remanescente decidido pelas políticas aplicáveis.
- **Efeito:** `CLOSED` para novas obrigações.
- **Eventos:** `CampaignBudgetClosed`.
- **Idempotência:** CampaignBudget + close decision.
- **Falhas:** reservas sem tratamento, correlação incompleta, saldo dependente de decisão aberta.

## 7. Commands de PartnerLedger

### 7.1 CreditPartner

- **Owner:** `PartnerLedger`.
- **Emissor:** Financial Platform consumindo direito do Settlement.
- **Pré-condições:** SplitShare imutável/elegível; Partner/valor/moeda; ainda não creditado.
- **Efeito:** cria `PartnerLedgerCredit` em classificação inicial `PENDING`.
- **Eventos:** `PartnerCredited`.
- **Idempotência:** `splitShareId`.
- **Autorização:** serviço financeiro autorizado.
- **Auditoria:** Settlement, share, Evidence correlacionável, políticas, valor.
- **Falhas:** share duplicada/divergente/bloqueada, Partner ausente.

### 7.2 MaturePartnerCredit

- **Owner:** `PartnerLedger`.
- **Emissor:** política de maturação do Financial Platform.
- **Pré-condições:** crédito `PENDING`; elegibilidade/retenção satisfeitas; sem disputa impeditiva.
- **Efeito:** registra mudança para `AVAILABLE`.
- **Eventos:** `PartnerCreditAvailable`.
- **Idempotência:** credit + maturation policy revision.
- **Falhas:** bloqueio, política ausente, crédito já classificado.
- **Observação:** parâmetros de retenção não devem ser inventados.

### 7.3 BlockPartnerCredit

- **Owner:** `PartnerLedger`.
- **Emissor:** owner/papel autorizado após causa válida.
- **Pré-condições:** crédito identificável; motivo e escopo.
- **Efeito:** nova classificação `BLOCKED`, sem alterar crédito.
- **Eventos:** `PartnerCreditBlocked`.
- **Idempotência:** credit + block decision.
- **Falhas:** causa ausente, escopo divergente, autorização insuficiente.

### 7.4 UnblockPartnerCredit

- **Owner:** `PartnerLedger`.
- **Emissor:** owner/papel autorizado.
- **Pré-condições:** bloqueio existente; causa resolvida; destino de classificação revalidado.
- **Efeito:** novo fato de desbloqueio para `PENDING` ou `AVAILABLE`.
- **Eventos:** `PartnerCreditUnblocked`.
- **Idempotência:** block + resolution.

### 7.5 ReserveWithdrawableBalance

- **Owner:** `PartnerLedger`.
- **Emissor:** fluxo de `RequestWithdrawal`.
- **Pré-condições:** revisão esperada atual; saldo withdrawable suficiente para valor + taxa; sem NegativeBalance impeditivo; nenhuma reserva concorrente; política/janela satisfeitas.
- **Efeito:** cria compromisso transacional para Withdrawal.
- **Eventos:** `WithdrawalBalanceReserved` ou `WithdrawalBalanceReservationRejected`.
- **Idempotência:** Withdrawal + Ledger revision.
- **Falhas:** revisão obsoleta, saldo insuficiente, negativo, outra Withdrawal não terminal.

### 7.6 ReleaseWithdrawalBalance

- **Owner:** `PartnerLedger`.
- **Emissor:** fluxo de falha definitiva/rejeição permitida.
- **Pré-condições:** reserva de Withdrawal existente; nenhum débito executado incompatível.
- **Efeito:** libera valor e taxa por novos fatos.
- **Eventos:** `WithdrawalBalanceReleased`.
- **Idempotência:** reservation + terminal decision.

### 7.7 PostWithdrawalDebit

- **Owner:** `PartnerLedger`.
- **Emissor:** consumidor autorizado de `WithdrawalExecuted`.
- **Pré-condições:** execução confirmada/reconciliada; reserva existente; débito ainda não lançado.
- **Efeito:** cria débito do valor transferido e lançamento separado da taxa.
- **Eventos:** `WithdrawalDebited`, `WithdrawalFeeDebited`.
- **Idempotência:** Withdrawal + execution result.
- **Falhas:** resultado desconhecido, valor divergente, duplicidade.

### 7.8 RecoverNegativeBalance

- **Owner:** `PartnerLedger`.
- **Emissor:** política financeira ao aplicar novo crédito.
- **Pré-condições:** NegativeBalance e crédito aplicável.
- **Efeito:** registra recuperação; somente excedente pode amadurecer.
- **Eventos:** `NegativeBalanceRecovered`.
- **Idempotência:** negative entry + credit + application revision.
- **Falhas:** valor superior ao aplicável, origem ausente.

### 7.9 CreateCompensatingLedgerEntry

- **Owner:** `PartnerLedger`.
- **Emissor:** processo financeiro/papel segregado.
- **Pré-condições:** fato de chargeback/reversão/ajuste; referência original; autorização.
- **Efeito:** novo débito/crédito compensatório.
- **Eventos:** `PartnerLedgerCompensated`, podendo produzir `NegativeBalanceCreated`.
- **Idempotência:** source entry + decision.
- **Falhas:** alocação não decidida (`OPEN-017`), origem desconhecida, valor não autorizado.

## 8. Commands de Withdrawal

### 8.1 RequestWithdrawal

- **Owner:** `Withdrawal`.
- **Emissor:** Partner autorizado.
- **Pré-condições:** conta própria e ativa; nenhum Withdrawal não terminal; valor/moeda/destino válidos; política identificada.
- **Efeito:** cria `REQUESTED`.
- **Eventos:** `WithdrawalRequested`.
- **Idempotência:** Partner + client request.
- **Falhas:** solicitação concorrente, conta bloqueada/fechada, payload inválido.

### 8.2 ApproveWithdrawal

- **Owner:** `Withdrawal`.
- **Emissor:** Financial Platform após `WithdrawalBalanceReserved`.
- **Pré-condições:** `REQUESTED`; reserva transacional válida; frequência satisfeita; política/taxa capturadas.
- **Efeito:** `APPROVED`.
- **Eventos:** `WithdrawalApproved`.
- **Idempotência:** Withdrawal + policy version.
- **Falhas:** reserva rejeitada, regra de 30 dias, estado/revisão incompatível.

### 8.3 RejectWithdrawal

- **Owner:** `Withdrawal`.
- **Emissor:** Financial Platform.
- **Pré-condições:** `REQUESTED`; motivo definitivo identificável.
- **Efeito:** `REJECTED`.
- **Eventos:** `WithdrawalRejected`.
- **Idempotência:** Withdrawal + rejection decision.
- **Auditoria:** regra, valores observados e motivo.

### 8.4 AddWithdrawalToBatch

- **Owner:** `Withdrawal`.
- **Emissor:** Financial Platform.
- **Pré-condições:** `APPROVED`; batch `OPEN`; compatibilidade de moeda/política/destino.
- **Efeito:** `BATCHED`.
- **Eventos:** `WithdrawalBatched`.
- **Idempotência:** Withdrawal + batch.

### 8.5 ExecuteWithdrawal

- **Owner:** `Withdrawal`.
- **Emissor:** Financial Platform, via boundary do provider.
- **Pré-condições:** `BATCHED`; batch `SEALED/SUBMITTED` conforme coordenação; reserva válida; sem tentativa ambígua anterior.
- **Efeito:** `EXECUTING`; registra tentativa.
- **Eventos:** `WithdrawalExecutionRequested`.
- **Idempotência:** Withdrawal + attempt.
- **Falhas:** resultado anterior desconhecido, destino/valor divergente, bloqueio.

### 8.6 RecordWithdrawalResult

- **Owner:** `Withdrawal`.
- **Emissor:** Financial Platform após fato externo autenticado.
- **Pré-condições:** tentativa conhecida; resultado correlacionável; não processado.
- **Efeito:** `EXECUTED`, `FAILED` ou permanece em reconciliação se ambíguo.
- **Eventos:** `WithdrawalExecuted`, `WithdrawalFailed` ou `WithdrawalReconciliationRequired`.
- **Idempotência:** provider transfer + result revision.
- **Falhas:** fato contraditório, referência desconhecida.

### 8.7 RetryWithdrawal

- **Owner:** `Withdrawal`.
- **Emissor:** Financial Platform.
- **Pré-condições:** `FAILED`; falha recuperável; confirmação de que tentativa anterior não movimentou valor; política ainda permite.
- **Efeito:** nova tentativa ligada à anterior.
- **Eventos:** `WithdrawalRetryScheduled`, `WithdrawalExecutionRequested`.
- **Idempotência:** Withdrawal + new attempt.
- **Falhas:** resultado desconhecido, sucesso prévio, mudança de valor/destino.

## 9. Commands de WithdrawalBatch

### 9.1 OpenWithdrawalBatch

- **Owner:** `WithdrawalBatch`.
- **Emissor:** Financial Platform.
- **Pré-condições:** identidade/janela inédita; política definida.
- **Efeito:** cria `OPEN`.
- **Eventos:** `WithdrawalBatchOpened`.
- **Idempotência:** batch identity/window.

### 9.2 SealWithdrawalBatch

- **Owner:** `WithdrawalBatch`.
- **Emissor:** Financial Platform.
- **Pré-condições:** `OPEN`; itens consistentes; totais reconciliados.
- **Efeito:** `SEALED`; membros/valores tornam-se imutáveis.
- **Eventos:** `WithdrawalBatchSealed`.
- **Idempotência:** batch + membership revision.

### 9.3 SubmitWithdrawalBatch

- **Owner:** `WithdrawalBatch`.
- **Emissor:** Financial Platform.
- **Pré-condições:** `SEALED`; cada item apto e identificável.
- **Efeito:** `SUBMITTED`.
- **Eventos:** `WithdrawalBatchSubmitted`.
- **Idempotência:** batch + submission attempt.

### 9.4 ReconcileWithdrawalBatch

- **Owner:** `WithdrawalBatch`.
- **Emissor:** Financial Platform.
- **Pré-condições:** `SUBMITTED/RECONCILING`; resultados dos itens disponíveis ou pendentes.
- **Efeito:** `RECONCILING`; associa resultados sem decidir o estado de cada Withdrawal.
- **Eventos:** `WithdrawalBatchReconciliationUpdated`.
- **Idempotência:** batch + reconciliation revision.

### 9.5 CloseWithdrawalBatch

- **Owner:** `WithdrawalBatch`.
- **Emissor:** Financial Platform.
- **Pré-condições:** todos os itens terminais ou destacados explicitamente para novo batch.
- **Efeito:** `CLOSED` final.
- **Eventos:** `WithdrawalBatchClosed`.
- **Idempotência:** batch + close revision.
- **Falhas:** item ambíguo não destacado, totais divergentes.

## 10. Commands de política e reconciliação

### 10.1 ChangeFinancialPolicy

- **Owner:** `FinancialPolicy`.
- **Emissor:** administrador financeiro autorizado.
- **Pré-condições:** nova versão; vigência; justificativa; aprovação e compatibilidade.
- **Efeito:** publica versão prospectiva.
- **Eventos:** `FinancialPolicyChanged`.
- **Idempotência:** policy type + version.
- **Invariantes:** nunca reinterpreta passado.
- **Auditoria:** diff conceitual, aprovadores, vigência e ADR.
- **Falhas:** versão reutilizada, retroatividade, campos obrigatórios ausentes.

### 10.2 ReconcileFinancialOperation

- **Status:** superseded para novas emissões por `ReconcilePaymentOperation` e `ReconcileWithdrawalOperation`.
- **Owner:** nenhum novo dispatch é permitido para este contrato genérico.
- **Emissor:** processo/papel financeiro autorizado.
- **Pré-condições:** divergência identificada; evidências externas/internas; escopo.
- **Efeito:** diagnóstico ou Command compensatório posterior ao owner correto.
- **Eventos:** `FinancialReconciliationCompleted` ou `FinancialReconciliationRequired`.
- **Idempotência:** operation + reconciliation revision.
- **Invariante:** reconciliação não edita Ledger/Payment/Withdrawal diretamente.

## 11. Concorrência

Commands que carregam revisão obsoleta:

- não são aplicados como “última escrita”;
- recebem `CONFLICT` ou são reavaliados explicitamente;
- não ganham nova idempotency key automaticamente;
- preservam a decisão anterior.

Casos críticos:

- reservas concorrentes de budget;
- Withdrawals concorrentes;
- confirmação e falha do mesmo Payment/Withdrawal;
- bloqueio e maturação do mesmo crédito;
- compensação e novo crédito.

## 12. Retry, duplicidade e timeout

- retry da mesma intenção usa a mesma chave;
- nova tentativa externa possui identidade própria e causation;
- Event duplicado não justifica segundo Command com nova chave;
- timeout não permite Command compensatório antes de reconciliação;
- resultado `PENDING_RECONCILIATION` bloqueia efeitos incompatíveis;
- retenção quantitativa das chaves permanece `OPEN-030`;
- prazos e número de retries permanecem `OPEN-031`.

## 13. Exemplos

### Válido

`PaymentCompensated` causa `PostPaymentLedgerEntry`. O Event do Ledger causa `IncreaseCampaignBudget`. São três decisões de owners distintos.

### Válido

Saga solicita reserva com revisão 10. O Aggregate autoriza e passa à revisão 11. Retry com mesma chave retorna a autorização; concorrente baseado na revisão 10 recebe conflito/rejeição.

### Inválido

`CompensatePayment` criar PaymentLedgerEntry e alterar CampaignBudget na mesma decisão.

### Inválido

`ExecuteWithdrawal` ser repetido com novo attempt apenas porque houve timeout.

## 14. Decisões abertas

Permanece proibido preencher por suposição `OPEN-002`, `OPEN-005/006/008`, `OPEN-016` a `OPEN-020`, `OPEN-025` a `OPEN-027` e `OPEN-030` a `OPEN-033` da [PLATFORM_SPECIFICATION.md](../specification/PLATFORM_SPECIFICATION.md).
## Commands causados por Governance

Todos exigem `governanceCaseId`, `decisionId`, `decisionRevision` e Event ID causal. Nenhum usa confidence para aceitar, rejeitar, priorizar ou dimensionar efeito.

### RecordPlatformLoss

- **Owner:** `PaymentLedger`.
- **Precondições:** decisão oficial e lançamento causal identificados.
- **Efeito:** `PlatformLossEntry` append-only.
- **Idempotência:** decisionId + revision + obrigação.
- **Falhas:** decisão ausente, revisão stale, valor divergente ou entry duplicada.

### CompensatePartner

- **Owner:** `PartnerLedger`.
- **Precondições:** decisão oficial e direito causal identificados.
- **Efeito:** `PartnerCompensation` append-only.
- **Idempotência:** decisionId + revision + partner + obligation.
- **Falhas:** parceiro divergente, dupla compensação ou decisão inexistente.

### RefundAdvertiserByResponsibility

- **Owner:** `PaymentLedger`.
- **Precondições:** decisão oficial autoriza `AdvertiserRefund`; origem reconciliada.
- **Efeito:** crédito interno ou instrução de refund auditável.
- **Idempotência:** decisionId + revision + refund obligation.
- **Falhas:** consumo comprovado incluído, rail incompatível ou resultado desconhecido.

### RecoverFromResponsibleParty

- **Status:** superseded para novas emissões pelos Commands específicos de recovery.
- **Owner:** nenhum novo dispatch genérico é permitido.
- **Precondições:** decisão oficial e recovery permitido pela policy.
- **Efeito:** recovery entry append-only.
- **Idempotência:** decisionId + revision + recovery obligation.
- **Falhas:** autorização ausente, duplicidade ou valor não reconciliado.

## Commands financeiros consolidados

Todos carregam idempotency key, expected revision, causation/correlation, valor BRL em quatro casas e policy versions aplicáveis.

### RefundAdvertiserUnusedCredit

- **Owner:** `PaymentLedger`.
- **Pré-condições:** crédito disponível em `LIA_ADVERTISER_CREDIT`; origem compensada; nenhuma aplicação/refund anterior.
- **Efeito:** JournalTransaction de refund.
- **Evento:** `AdvertiserUnusedCreditRefunded`.

### RegisterPartnerRecoveryObligation

- **Owner:** `PartnerLedger`.
- **Pré-condições:** decisão atribui `EDGE_PARTNER`; subject corresponde ao Partner; entry original e valor reconciliados.
- **Evento:** `PartnerRecoveryObligationRegistered`.
- **Idempotência:** decisionId + revision + originalFinancialEntryId.

### RegisterAdvertiserRecoveryObligation

- **Owner:** `PaymentLedger`.
- **Pré-condições:** decisão atribui `ADVERTISER`; responsibleSubjectId e direito de regresso identificados.
- **Evento:** `AdvertiserRecoveryObligationRegistered`.
- **Idempotência:** decisionId + revision + originalFinancialEntryId.

### RegisterThirdPartyRecoveryObligation

- **Owner:** `PaymentLedger`.
- **Pré-condições:** decisão atribui `INTEGRATED_THIRD_PARTY`; subject e direito de regresso identificados.
- **Evento:** `ThirdPartyRecoveryObligationRegistered`.
- **Idempotência:** decisionId + revision + originalFinancialEntryId.

### UpdateFinancialPolicy

- **Owner:** `FinancialPolicy`.
- **Pré-condições:** nova versão prospectiva, aprovadores e vigência.
- **Evento:** `FinancialPolicyChanged`.

### ReconcilePaymentOperation

- **Owner:** `PaymentLedger`.
- **Eventos:** `PaymentReconciliationRequired` ou `PaymentReconciliationCompleted`.

### ReconcileWithdrawalOperation

- **Owner:** `Withdrawal`.
- **Eventos:** `WithdrawalReconciliationRequired`, `WithdrawalExecuted` ou `WithdrawalFailed`, conforme fato autoritativo.

### ExecuteTaxPayment

- **Owner:** `PaymentLedger`.
- **Pré-condições:** lote fiscal e retenções identificados, ainda não recolhidos.
- **Efeito:** `DR LIA_TAX_HOLDING / CR ACT_BANK_SETTLED`.
- **Evento:** `TaxPaymentExecuted`.

### HoldParticipantPayout

- **Owner:** `PartnerLedger`.
- **Pré-condições:** Evidence revertida, parcelas/valor correlacionados e ausência de decisão definitiva.
- **Efeito:** bloqueio cautelar append-only, limitado ao valor.
- **Evento:** `ParticipantPayoutHeld`.
- **Timeout:** mantém bloqueio e publica `PartnerLedgerReconciliationRequired(GOVERNANCE_TIMEOUT)`; nunca libera automaticamente.
