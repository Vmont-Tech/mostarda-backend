# Campaign Budget

`CampaignBudget` é Aggregate do Financial Platform e é a única fonte financeira de autorização de consumo de uma Campaign. Campaign Management mantém Contract Value como contrato; Financial Platform mantém disponibilidade real.

| Campo | Significado |
| --- | --- |
| `ContractValue` | Valor total contratado. Nunca é saldo utilizável. |
| `AvailableBudget` | Crédito compensado ainda não reservado/consumido. |
| `ReservedBudget` | Parte temporariamente comprometida por Slot ainda não resolvido. |
| `ConsumedBudget` | Parte associada a execução/preço elegível conforme política. |
| `BudgetPolicyVersion` | Política de saldo, reserva e pausa aplicada. |

Estados: `UNFUNDED → FUNDED → AVAILABLE → DEPLETED`; `AVAILABLE ↔ RESERVED`; `DEPLETED → AVAILABLE` somente por `PaymentCompensated`; `CLOSED` é final por encerramento de Campaign. É proibido `AvailableBudget` negativo ou reserva/consumo que exceda o disponível. `CampaignBudgetConsumed` é idempotente por Slot/quote; expiração/revogação libera apenas reserva ainda não consumida.
