# Partner Wallet

Cada parceiro econômico possui `PartnerAccount`, `PartnerLedger` e `PartnerWallet`. PartnerAccount identifica elegibilidade e dados de saque; PartnerLedger preserva fatos financeiros; PartnerWallet é projeção derivada, nunca fonte independente de verdade.

| Saldo | Definição |
| --- | --- |
| `PendingBalance` | Créditos de direitos ainda pendentes de condição de disponibilidade. |
| `AvailableBalance` | Créditos disponíveis após política aplicável. |
| `BlockedBalance` | Créditos bloqueados por disputa, elegibilidade, compliance ou política. |
| `WithdrawableBalance` | Parte disponível e elegível para solicitação de saque vigente. |
| `NegativeBalance` | Débitos compensatórios que excederam créditos disponíveis. |

Settlement publica direito, e Financial Platform cria `PartnerLedgerCredit`; somente então a Wallet deriva saldo. A Wallet nunca cria ou paga SplitShare. Crédito futuro primeiro recupera `NegativeBalance`; somente excedente pode tornar-se withdrawable. Estados da Wallet: `ACTIVE`, `RESTRICTED`, `BLOCKED`, `CLOSED`; estado bloqueado impede novo saque, sem apagar créditos ou débitos.
