# Financial Events

Todos os eventos possuem envelope do Execution Model e são produzidos por Financial Platform, salvo eventos de provider recebidos pelo respectivo adapter. Consumidores são idempotentes por `eventId`; ordering é por Aggregate/ledger entry; retry não recria lançamento.

| Evento | Produtor | Consumidores | Payload conceitual e compensação |
| --- | --- | --- |
| `PaymentReceived` | Asaas adapter | PaymentLedger, CampaignBudget, Analytics | cobrança/provider reference, valor bruto, método, Campaign; sem saldo. |
| `PaymentCompensated` | Financial Platform | PaymentLedger, CampaignBudget, Campaign, Analytics | pagamento, valor compensado, políticas; cria entrada, não edita pagamento. |
| `PaymentCancelled/Disputed/Overdue` | Financial Platform | CampaignBudget, Notifications, Analytics | motivo, valor, referência; nenhum crédito disponível. |
| `CampaignBudgetIncreased/Reserved/Consumed/Released/Depleted` | CampaignBudget | Campaign, Slot, Analytics | saldos, Slot/quote, versão; release é compensação de reserva. |
| `PartnerCredited` | PartnerLedger | PartnerWallet, Analytics, Notifications | credit, Settlement/SplitShare, parceiro, políticas. |
| `PartnerBalanceAvailable/Blocked` | PartnerWallet | Withdrawal, Notifications | carteira, saldo e motivo. |
| `WithdrawalRequested/Approved/Rejected/Executed/Failed` | Withdrawal | Batch, PartnerWallet, Notifications | Withdrawal, valor, taxa, política, tentativa/recibo. |
| `WithdrawalBatchOpened/Closed` | WithdrawalBatch | Asaas adapter, Analytics | batch, itens, política e total. |
| `NegativeBalanceCreated/Recovered` | PartnerLedger | PartnerWallet, Analytics | lançamento, origem e saldo remanescente. |
| `FinancialPolicyChanged` | FinancialPolicy | Financial Platform, Analytics | política, versão, vigência e ator. |

`PaymentCompensated`, `PartnerCredited`, `WithdrawalExecuted` e eventos de saldo são financeiramente auditáveis e append-only. O evento não muda outro Aggregate: seu consumidor emite Command ao owner.
