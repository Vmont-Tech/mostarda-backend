# ADR-007 — Financial Platform

- **Status:** Aceito
- **Data:** 2026-07-26
- **Supersede parcialmente:** ADR-003 e ADR-005 somente quanto à execução de pagamento/repasses pelo Settlement.

## Decisão

Settlement calcula direitos financeiros derivados de Evidence válida e ancorada; ele não instrui nem confirma pagamentos. O novo Bounded Context Financial Platform mantém Payment Ledger, Campaign Budget, Partner Ledger, Partner Wallet, Withdrawal e políticas. Asaas permanece adapter de cobrança e transferência, acionado exclusivamente pelo Financial Platform.

Entrada e saída são fluxos independentes. Pagamento compensado aumenta Available Budget, não Contract Value. Direito do Settlement gera crédito de Ledger, não PIX automático. Chargebacks e falhas são lançamentos compensatórios append-only.

## Consequências

- A Campaign não consome valor contratado sem compensação.
- Parceiros recebem direitos auditáveis antes da disponibilidade para saque.
- Troca de provider não altera Withdrawal Policy ou Ledger.
- Blockchain/Quantum não participa de qualquer movimento financeiro.
