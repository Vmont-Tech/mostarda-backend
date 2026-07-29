# Financial Platform — Arquitetura Financeira

Financial Platform é o Bounded Context que organiza a entrada, guarda, disponibilidade e saída de dinheiro da Mostarda. Ele não substitui Pricing, Evidence, Settlement, Quantum ou Asaas: recebe fatos/direitos desses contextos e mantém o estado financeiro derivado em livros append-only.

## Dois fluxos independentes

```text
Entrada: Asaas → Payment Ledger → Campaign Budget (Available Budget) → Pricing / Slot
Saída:   Evidence → Settlement (direito) → Partner Ledger → Partner Wallet → Withdrawal → Asaas
```

Settlement **não realiza pagamentos**. Ele calcula direitos financeiros e publica créditos de parceiro. Financial Platform materializa o crédito no `PartnerLedger`, deriva a carteira e, somente após Withdrawal Policy, solicita execução ao Asaas. O fluxo de entrada também é independente: pagamento compensado aumenta orçamento disponível; ele não é uma Evidence nem um Settlement.

## Fronteiras e responsabilidade

| Contexto | É responsável por | Não é responsável por |
| --- | --- | --- |
| Pricing | Preço e quote congelado | Saldo de Campaign ou cobrança |
| Campaign Management | Contract Value, lifecycle e consumo autorizado de orçamento | Compensação de pagamento |
| Evidence Ledger | Provar exibição | Dinheiro ou saldo |
| Settlement | Calcular SplitShares/direitos | Ledger, carteira, saque ou pagamento |
| Financial Platform | Payment Ledger, Campaign Budget, Partner Ledger, Wallet, Withdrawal e políticas | Preço, prova, split ou rails próprios |
| Asaas | Cobrar e transferir conforme instrução | Política de negócio, saldo ou ledger Mostarda |
| Quantum | Provar hashes | Qualquer movimentação financeira |

Todos os Ledger Entries são append-only e auditáveis. Correções, chargebacks, taxas e recuperações são novos lançamentos vinculados à origem, jamais alterações destrutivas.
