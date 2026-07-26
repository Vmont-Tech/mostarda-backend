# Financial Invariants

1. Settlement nunca realiza pagamento; ele apenas cria direitos financeiros.
2. Partner Ledger é append-only; Partner Wallet deriva exclusivamente do Ledger.
3. Campaign consome somente Available Budget; Contract Value nunca representa saldo disponível.
4. Pagamento só aumenta orçamento após compensação confirmada.
5. Taxas de cartão nunca reduzem Contract Value ou Available Budget da Campaign.
6. A Mostarda não antecipa recebíveis; parcelas não compensadas não são orçamento.
7. Chargeback nunca altera Evidence, Settlement, SplitShare ou Ledger anterior; cria novos lançamentos compensatórios.
8. Saldo negativo é recuperado por créditos futuros, nunca por reescrita de histórico.
9. Nenhum saque ocorre diretamente de Settlement; toda saída segue Withdrawal Policy.
10. Taxa de saque pertence à política Mostarda, não ao Asaas; a política inicial é R$2,00 e um saque por 30 dias.
11. Blockchain/Quantum nunca participa de movimentação financeira.
12. Cada lançamento financeiro possui origem, destino, motivo, valor, moeda, correlação, causação, políticas, hash e timestamp.
13. Falha de uma transferência não apaga Withdrawal, Ledger Entry ou direito; abre nova tentativa/compensação permitida.
