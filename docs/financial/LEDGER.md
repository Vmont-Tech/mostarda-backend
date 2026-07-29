# Financial Ledger

Financial Platform mantém dois livros append-only: `PaymentLedger` para entrada e `PartnerLedger` para direitos, saques, taxas, chargebacks e recuperações. O Ledger não é Settlement e não é o extrato do Asaas; ele é o registro financeiro oficial da Mostarda.

Todo lançamento contém: `ledgerEntryId`, livro, origem, destino, motivo, valor, moeda, `correlationId`, `causationId`, Campaign, Partner, Settlement, EvidenceRecord quando existir, versões de política, provider reference quando aplicável, hash, timestamp e referência ao lançamento compensado quando aplicável.

`PaymentLedgerEntry` nasce de compensação e alimenta CampaignBudget. `PartnerLedgerCredit` nasce de direito calculado no Settlement. `PartnerLedgerDebit` representa saque, taxa de saque, chargeback ou recuperação. Saldo é derivado da soma ordenada dos lançamentos, nunca campo editado. Chargeback cria débito compensatório; se superar créditos disponíveis, cria saldo negativo recuperável por créditos futuros.
