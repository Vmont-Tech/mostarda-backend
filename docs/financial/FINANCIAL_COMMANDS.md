# Financial Commands and State Machines

| Command | Owner | Emissor | Pré-condição, efeito e idempotência |
| --- | --- | --- |
| `RegisterPayment` | PaymentLedger | Asaas adapter | Cobrança reconhecida; registra recebido, sem crédito; `providerPaymentId`. |
| `CompensatePayment` | PaymentLedger | Financial Platform | Pagamento confirmado; cria entry e `CampaignBudgetIncreased`; `paymentId+compensation`. |
| `IncreaseCampaignBudget` / `ConsumeCampaignBudget` | CampaignBudget | Financial Platform / Campaign Management | Crédito compensado / quote e saldo disponível; chave por pagamento ou Slot. |
| `CreditPartner` | PartnerLedger | Financial Platform | Direito de Settlement imutável; cria crédito por `splitShareId`. |
| `RequestWithdrawal` | Withdrawal | Partner | Wallet withdrawable e política atendida; uma solicitação por chave do parceiro/janela. |
| `ApproveWithdrawal` / `RejectWithdrawal` | Withdrawal | Financial Platform | Solicitação pendente e política vigente; decisão auditada. |
| `OpenWithdrawalBatch` / `CloseWithdrawalBatch` | WithdrawalBatch | Financial Platform | Withdrawals aprovados compatíveis; chave por janela/batch. |
| `ExecuteWithdrawal` | Withdrawal | Financial Platform / Asaas adapter | Batch fechado, saldo reservado e instrução válida; tentativa idempotente. |
| `RecoverNegativeBalance` | PartnerLedger | Financial Platform | Novo crédito disponível; abate débito por credit/negative entry. |
| `ChangeFinancialPolicy` | FinancialPolicy | administrador financeiro | Nova versão, vigência e auditoria aprovadas; nunca reinterpreta lançamentos antigos. |

| Máquina | Estados, finais e recuperação |
| --- | --- |
| Payment | `PENDING → RECEIVED → COMPENSATING → COMPENSATED`; `PENDING/RECEIVED → CANCELLED/OVERDUE/DISPUTED/FAILED`. Finais: compensado, cancelado, overdue, falho; disputa abre novos fatos. |
| CampaignBudget | `UNFUNDED → AVAILABLE ↔ RESERVED → DEPLETED`; `DEPLETED → AVAILABLE` por compensação; `CLOSED` final. Reserva expirada é liberada; nunca saldo negativo. |
| PartnerWallet | `ACTIVE ↔ RESTRICTED/BLOCKED`; `CLOSED` final. Saldos são derivados, e créditos recuperam negativo antes de disponibilidade. |
| Withdrawal | `REQUESTED → APPROVED → BATCHED → EXECUTING → EXECUTED`; `REQUESTED → REJECTED`; `APPROVED/BATCHED/EXECUTING → FAILED → APPROVED` quando retry permitido. Executado/rejeitado são finais. |
| WithdrawalBatch | `OPEN → SEALED → EXECUTING → CLOSED`; `OPEN/SEALED → CANCELLED`. Itens falhos permanecem Withdrawal próprio, sem reabrir batch fechado. |
