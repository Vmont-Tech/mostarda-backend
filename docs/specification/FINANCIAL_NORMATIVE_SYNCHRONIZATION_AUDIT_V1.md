# Financial Normative Synchronization Audit V1

**Data:** 2026-07-27
**Escopo:** decisões financeiras `DEC-043`
**Autoridade:** ADR-009, Platform Specification, Financial Decision Register
**Resultado:** NORMATIVE_SYNCHRONIZATION_ACCEPTED

## 1. Escopo certificado

Foram sincronizados:

- moeda, precisão, quantização e split;
- dupla entrada e plano de contas conceitual;
- Payment, PaymentLedger e CampaignBudget;
- reconhecimento de Platform Fee e direitos;
- pagamento parcial, excedente e refund sem disputa;
- NegativeBalance, recovery por tipo de responsável e write-off;
- Insurance Fund;
- Evidence reversal e bloqueio cautelar;
- Withdrawal, TaxPolicy e recolhimento consolidado;
- `responsibleSubjectId`;
- Commands, Events, Sagas, State Machines, Timelines, ownership e rastreabilidade.

## 2. Teste de owner único

| Command | Owner |
| --- | --- |
| RecordPaymentReceived | Payment |
| ConfirmPaymentCompensation | Payment |
| PostPaymentLedgerEntry | PaymentLedger |
| IncreaseCampaignBudget | CampaignBudget |
| CreditPartner | PartnerLedger |
| RefundAdvertiserUnusedCredit | PaymentLedger |
| RegisterPartnerRecoveryObligation | PartnerLedger |
| RegisterAdvertiserRecoveryObligation | PaymentLedger |
| RegisterThirdPartyRecoveryObligation | PaymentLedger |
| RecordPlatformLoss | PaymentLedger |
| UpdateFinancialPolicy | FinancialPolicy |
| ReconcilePaymentOperation | PaymentLedger |
| ReconcileWithdrawalOperation | Withdrawal |
| ExecuteTaxPayment | PaymentLedger |
| HoldParticipantPayout | PartnerLedger |

Contratos genéricos anteriores não aceitam novo dispatch.

## 3. Teste de producer único

Cada Event financeiro novo possui producer único no catálogo. Reconciliação foi separada por scope/owner para impedir producer variável. Aliases `FinancialPolicyUpdated`, `WithdrawalExecutionFailed` e estado `FAILED_TAX_POLICY_MISSING` são proibidos.

## 4. Teste contábil

- toda JournalTransaction exige débitos iguais a créditos;
- PaymentReceived não lança;
- PaymentCompensated reconhece crédito do Advertiser;
- Settlement materializa SplitShares e Platform Fee;
- recovery distingue Partner, Advertiser, terceiro, Mostarda e None;
- fundo sem terceiro devedor não cria recovery receivable;
- payout bruto fecha líquido mais retenção;
- tax payment reduz Tax Holding e Bank Settled;
- replay/rebuild não movimenta dinheiro.

## 5. Teste de fronteiras

- Payment não escreve Ledger;
- PaymentLedger não altera CampaignBudget;
- Campaign não consulta Financial;
- Settlement calcula direitos e não paga;
- Governance julga e não executa;
- Financial executa e não reinterpreta responsabilidade;
- PartnerWallet permanece projeção.

## 6. Itens remanescentes

### PRODUCTION_BLOCKER

- validação jurídica/fiscal das TaxPolicyVersions, documentos fiscais e regimes aplicáveis;
- configuração de caps, timeouts, retenções, limites e SLOs antes de produção;
- homologação dos adapters financeiro e fiscal.

### ARCHITECTURE_BLOCKER global, fora de DEC-043

- `OPEN-027/033` permanece para contratos não financeiros ainda não consolidados;
- `OPEN-028/034` permanece para partes não financeiras de Evidence/Quantum e Playback/Player;
- Architecture Lock e IRR globais precisam ser reexecutados após a sincronização.

### DOCUMENTATION_DEBT

Relatórios históricos V1/V2/V3 e Architecture Lock preservam o diagnóstico do instante em que foram emitidos. Eles não são reescritos retroativamente; este audit e `DEC-043` são a evidência posterior.

## 7. Autorização

O comportamento financeiro de `DEC-043` está autorizado para geração de contratos técnicos após nova execução do Architecture Lock/IRR. Este relatório não autoriza deploy em produção e não autoriza implementar artefatos ainda bloqueados por lacunas específicas de schema, error catalog ou suíte de conformidade.
