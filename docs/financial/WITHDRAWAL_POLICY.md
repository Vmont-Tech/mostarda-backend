# Withdrawal Policy

Withdrawal Policy é política da Mostarda, independente do provider de pagamento. Versão inicial: um saque por PartnerAccount a cada 30 dias e taxa fixa de R$2,00 por saque. A taxa é debitada como lançamento de Ledger, nunca regra ou taxa implícita do Asaas.

`WithdrawalPolicy` é versionada e admite, sem mudança de domínio, valor mínimo, máximo, frequência/janela, dias permitidos, taxa fixa/variável, moeda, elegibilidade, exigência de saldo negativo quitado e aprovação. A versão aplicada fica no Withdrawal, Batch e Ledger Entries.

Fluxo: parceiro solicita → Financial Platform verifica Wallet e política → reserva saldo → aprova/rejeita → inclui em `WithdrawalBatch` → instrui Asaas → confirma/falha → cria lançamentos. Falha libera a reserva ou cria estado de retry conforme política; execução nunca apaga a solicitação. Nenhum saque parte diretamente de Settlement.
