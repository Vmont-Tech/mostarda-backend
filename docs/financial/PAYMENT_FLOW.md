# Payment Flow — Entrada de Receita

## Fluxo de compensação

```text
Advertiser → Asaas (PIX / Boleto / Cartão) → PaymentReceived
→ PaymentCompensated → PaymentLedgerEntry → CampaignBudgetIncreased
→ AvailableBudget → Pricing / Slot Allocation / Campaign Execution
```

Um pagamento recebido não é orçamento disponível. Somente `PaymentCompensated` cria `PaymentLedgerEntry` e aumenta `CampaignBudget.AvailableBudget`. Pagamentos aguardando, em compensação, sob contestação, cancelados, inadimplentes ou falhos não aumentam o saldo e não autorizam Slots.

## Campaign Budget

`ContractValue` é o valor comercial contratado; `AvailableBudget` é o saldo compensado que pode ser consumido. Pricing, alocação de Slot e execução de Campaign só consomem `AvailableBudget`; o consumo é atômico no Aggregate `CampaignBudget`. Ao esgotá-lo, a Campaign entra em pausa automática por orçamento e só retorna quando um novo pagamento compensado aumentar o saldo.

## Cartão e parcelamento

Para cartão, a taxa do Asaas é absorvida pelo anunciante: Campaign de R$100 com taxa de R$4,80 gera cobrança de R$104,80 e `ContractValue`/AvailableBudget de R$100. A taxa é uma linha de cobrança distinta; ela nunca reduz o orçamento contratado ou disponível da Campaign.

A Mostarda não antecipa recebíveis. Em uma Campaign de R$1.200 em 12 parcelas, cada parcela compensada aumenta Available Budget em R$100. Se não houver saldo antes da compensação seguinte, Campaign pausa; a retomada é causada por novo crédito compensado, não por crédito presumido.
