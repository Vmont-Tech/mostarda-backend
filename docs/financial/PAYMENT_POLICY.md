# Payment Policy

`FinancialPolicy` governa formas aceitas, estados de compensação, prazo de validade de cobrança, tratamento de cartão, parcelamento, contestação, inadimplência e versões aplicáveis. Asaas é provider executante; a política pertence à Mostarda e pode sobreviver à substituição do provider.

Regras obrigatórias:

- Formas iniciais: PIX, boleto e cartão; assinaturas são extensão futura.
- Apenas compensação confirmada autoriza `CampaignBudgetIncreased`.
- Taxa de cartão é adicionada à cobrança do anunciante e fica fora de Contract Value/Available Budget.
- Não há antecipação de recebíveis, crédito implícito ou consumo de parcela pendente.
- Cancelamento, contestação, inadimplência ou falha não consomem nem aumentam orçamento; fatos já compensados são tratados por novos lançamentos, conforme origem.
- Toda decisão registra `FinancialPolicyVersion`, `PaymentPolicyVersion`, moeda, provider, correlação e hash de auditoria.
