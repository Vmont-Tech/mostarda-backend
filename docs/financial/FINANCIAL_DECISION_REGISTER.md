# Financial Decision Register

**Status:** ACCEPTED
**Escopo:** Financial Platform, interfaces com Settlement, Campaign Management, Governance & Dispute Management e provedores financeiros/fiscais
**Autoridade:** especialização normativa de [PLATFORM_SPECIFICATION.md](../specification/PLATFORM_SPECIFICATION.md)
**Decisão consolidada:** Opção B aprovada pelo fundador, com as quatro correções arquiteturais obrigatórias

## 1. Propósito

Este registro congela as decisões financeiras que antes permaneciam em `OPEN-006`, `OPEN-009`, `OPEN-016` a `OPEN-020` e `OPEN-025`. Ele define comportamento de domínio e contabilidade, não stack, banco, broker ou formato físico.

Financial Platform:

- registra fatos monetários reconhecidos;
- conserva dinheiro por transações append-only de dupla entrada;
- materializa direitos publicados por Settlement;
- executa consequências autorizadas por Governance;
- nunca decide responsabilidade;
- nunca altera Evidence, SettlementRight, SplitShare ou lançamento histórico;
- nunca aumenta CampaignBudget a partir de `PaymentReceived`.

## 2. Fronteiras e owners

| Responsabilidade | Aggregate owner |
| --- | --- |
| lifecycle da cobrança externa | `Payment` |
| fatos financeiros de pagamento, crédito do anunciante, tesouraria, continuidade operacional, recovery de Advertiser/terceiro e recolhimento fiscal consolidado | `PaymentLedger` |
| buckets financeiros de uma Campaign | `CampaignBudget` |
| créditos, débitos, reservas de saque, NegativeBalance e recovery de Edge Partner | `PartnerLedger` |
| lifecycle de um saque | `Withdrawal` |
| lote de saques | `WithdrawalBatch` |
| política financeira versionada | `FinancialPolicy` |
| política de saque versionada | `WithdrawalPolicy` |

`PartnerWallet` é projeção e nunca decide ou lança dinheiro.

## 3. Dinheiro, precisão e quantização

### FIN-DEC-001 — Moeda e escala

- moeda normativa: `BRL`;
- valor persistido em Ledger: `DECIMAL(18,4)`;
- payout e apresentação externa: duas casas decimais;
- conversão de duas para quatro casas acrescenta zeros à direita;
- valores negativos preservam o sinal.

### FIN-DEC-002 — Operação individual

Uma operação individual calculada em precisão ampliada é quantizada para quatro casas na criação de cada `JournalLine`, usando Half-Even. A redução para duas casas no payout também usa Half-Even.

### FIN-DEC-003 — Split 1:N

Split entre participantes usa Hamilton-Hare:

1. quantizar o total normativo `T` em quatro casas;
2. calcular cotas exatas em precisão ampliada;
3. truncar cada cota para quatro casas;
4. calcular as unidades de `0,0001` ainda não distribuídas;
5. ordenar restos decrescentes;
6. desempatar por `ParticipantId` em ordem lexicográfica ascendente;
7. distribuir uma unidade aos primeiros participantes;
8. exigir soma final igual a `T`.

Quando percentuais válidos somam 100%, Hamilton-Hare não produz residual técnico. `LIA_TECHNICAL_RESIDUAL` existe somente para diferenças externas de reconciliação ou valores sem beneficiário financeiro normativamente atribuível; nunca é receita da Mostarda e nunca substitui participante conhecido.

## 4. Dupla entrada

Uma `JournalTransaction`:

- é append-only;
- possui `transactionId`, `causationId`, `correlationId`, instante autoritativo, moeda, policy versions e uma ou mais linhas;
- exige ao menos uma linha de débito e uma de crédito;
- exige `sum(debits) = sum(credits)` na mesma moeda e escala;
- é aceita uma vez por fato causal e finalidade;
- é revertida somente por nova transação correlacionada.

### 4.1 Plano de contas inicial

| Código | Natureza | Nome |
| --- | --- | --- |
| `1.1.1.0` | Asset | `ACT_GATEWAY_CLEARING` |
| `1.1.2.0` | Asset | `ACT_INSURANCE_RESERVE` |
| `1.1.3.0` | Asset | `ACT_RECOVERY_RECEIVABLE` |
| `1.1.4.0` | Asset | `ACT_BANK_SETTLED` |
| `2.1.1.0` | Liability | `LIA_PARTICIPANT_PAYABLE` |
| `2.1.2.0` | Liability | `LIA_TAX_HOLDING` |
| `2.1.3.0` | Liability | `LIA_ADVERTISER_CREDIT` |
| `2.1.4.0` | Liability | `LIA_PAYOUT_IN_TRANSIT` |
| `2.2.1.0` | Liability/compensation | `LIA_TECHNICAL_RESIDUAL` |
| `3.1.1.0` | Revenue | `REV_PLATFORM_FEE` |
| `4.1.1.0` | Expense | `EXP_GATEWAY_FEE` |
| `4.1.2.0` | Expense | `EXP_UNRECOVERABLE_LOSS` |

Subledgers preservam identidade de Advertiser, Partner, terceiro, Payment, Campaign, Settlement, SplitShare, Withdrawal e GovernanceDecision. Código de conta sem essas dimensões não é lançamento implementável.

## 5. Payment e CampaignBudget

### FIN-DEC-004 — Sequência autorizadora

```text
RecordPaymentReceived → Payment → PaymentReceived
ConfirmPaymentCompensation → Payment → PaymentCompensated
PostPaymentLedgerEntry → PaymentLedger → PaymentLedgerEntryPosted
IncreaseCampaignBudget → CampaignBudget → CampaignBudgetIncreased
```

`PaymentReceived` é fato autenticado de recebimento observado, ainda não compensado. Não cria lançamento e não altera budget.

Somente `PaymentCompensated` autoriza `PostPaymentLedgerEntry`. A entrada reconhece:

```text
DR ACT_BANK_SETTLED
CR LIA_ADVERTISER_CREDIT
```

Não existe alternativa de conta escolhida pela implementação. Se um futuro provider exigir lifecycle de clearing distinto, precisará de Event e decisão normativa próprios.

Pagamento parcial compensado aumenta CampaignBudget exatamente pelo valor compensado e alocado à Campaign. Pagamento não compensado, excedente ou duplicado não aumenta budget.

### FIN-DEC-005 — Excedente e duplicidade

Excedente/duplicado confirmado permanece em `LIA_ADVERTISER_CREDIT`, identificado por Advertiser e origem. Pode:

- ser aplicado prospectivamente por Command autorizado; ou
- ser devolvido por `RefundAdvertiserUnusedCredit → PaymentLedger → AdvertiserUnusedCreditRefunded`.

Refund por crédito não usado não exige GovernanceCase. Refund por responsabilidade usa contrato separado e decisão de Governance.

### FIN-DEC-006 — Budget esgotado

`CampaignBudgetDepleted` causa `AddCampaignPauseCause(BUDGET_DEPLETED)` em Campaign. Novo crédito causa `RemoveCampaignPauseCause(BUDGET_DEPLETED)`. Campaign retorna a `ACTIVE` somente se nenhuma outra causa permanecer. Não existe `PAUSED_NO_BUDGET`, e Campaign nunca consulta Financial sincronicamente para decidir estado.

## 6. Settlement e reconhecimento econômico

Payment compensado não reconhece Platform Fee nem direito de participante.

Somente Settlement, após Evidence válida e ancorada, publica direitos por `SplitShareId`. Cada `PartnerCreditRequested` causa `CreditPartner` exatamente uma vez. Financial preserva beneficiário, valor, moeda, policy versions e identidade da parcela.

Na materialização das parcelas:

```text
DR LIA_ADVERTISER_CREDIT
CR LIA_PARTICIPANT_PAYABLE   (uma linha por parcela elegível)
CR REV_PLATFORM_FEE          (parcela normativa da Mostarda)
```

A soma dos créditos é igual ao débito. Parcela `BLOCKED` ou `UNCLAIMED` não é redistribuída silenciosamente.

## 7. Chargeback, Evidence reversal e Governance

### FIN-DEC-011 — B-002: resultados do split e materializacao financeira

`DEC-068` aprova a semantica de zero para `SPLIT-PERFORMANCE-RESIDUAL-V1`.

- As sete posicoes da politica sao sete resultados deterministas (`SplitShare`), nao sete lancamentos financeiros obrigatorios.
- `grossAmount = 0.0000` e rejeitado antes da criacao de `SettlementCycle` financeiro, `FinancialRight`, `JournalLine` ou `PartnerLedgerEntry`.
- Um resultado com basis points zero continua existindo como `SplitShare`, mas nao cria `FinancialRight` nem lancamento.
- Um resultado matematicamente positivo que quantiza para `0.0000` continua existindo como `SplitShare`, mas nao cria `FinancialRight` nem lancamento.
- Nenhum valor zero e redistribuido depois da quantizacao Hamilton-Hare e nenhum residual e criado para Mostarda.
- Somente resultados quantizados estritamente maiores que `0.0000` sao materializados como `FinancialRight`, credito Journal e `PartnerLedgerEntry`.
- A soma das sete parcelas quantizadas permanece exatamente igual ao gross. Para qualquer Settlement aceito, a soma dos direitos positivos materializados tambem e exatamente igual ao gross.
- Replay preserva as sete linhas, seus valores quantizados e quais linhas foram ou nao materializadas.

Esta decisao nao altera percentuais, a politica comercial, Wallet, Withdrawal, Asaas, chargeback ou recovery.

### FIN-DEC-007 — Fatos versus julgamento

Financial registra chargeback, reversão, saldo e liquidez. Apenas Governance publica julgamento oficial. `EvidenceReversed` sem `ResponsibilityDecisionPublished`:

- não causa estorno ou recovery definitivo;
- causa bloqueio cautelar append-only, limitado ao valor e às parcelas correlacionadas;
- publica `ParticipantPayoutHeld`;
- solicita Governance/reconciliação.

Ao expirar o prazo versionado sem decisão, o bloqueio permanece e o owner publica `FinancialReconciliationRequired(reason=GOVERNANCE_TIMEOUT)`. Não existe liberação automática.

### FIN-DEC-008 — Correlação

A cadeia causal é:

```text
EvidenceId + reversalRevision
→ SettlementId
→ SplitShareId
→ PartnerLedgerCreditId
→ eventual Governance decisionId + revision
→ lançamento compensatório/recovery
```

Reentrega da mesma reversão/decisão não duplica bloqueio, lançamento ou obrigação.

## 8. ResponsibilityDecision e recovery

`ResponsibilityDecisionPublished` contém `responsibleSubjectId` condicional:

| ResponsibleParty | Regra |
| --- | --- |
| `ADVERTISER` | obrigatório; AdvertiserId |
| `EDGE_PARTNER` | obrigatório; PartnerId |
| `INTEGRATED_THIRD_PARTY` | obrigatório; terceiro integrado |
| `MOSTARDA` | proibido/nulo |
| `NONE` | proibido/nulo |

### FIN-DEC-009 — Commands por owner

| ResponsibleParty | Command | Owner | Resultado |
| --- | --- | --- | --- |
| `EDGE_PARTNER` | `RegisterPartnerRecoveryObligation` | `PartnerLedger` | `PartnerRecoveryObligationRegistered` |
| `ADVERTISER` | `RegisterAdvertiserRecoveryObligation` | `PaymentLedger` | `AdvertiserRecoveryObligationRegistered` |
| `INTEGRATED_THIRD_PARTY` | `RegisterThirdPartyRecoveryObligation` | `PaymentLedger` | `ThirdPartyRecoveryObligationRegistered` |
| `MOSTARDA` | `RecordPlatformLoss` | `PaymentLedger` | `PlatformLossRecorded` |
| `NONE` | nenhum recovery; aplicar fundo/perda conforme policy | `PaymentLedger` | lançamento correspondente |

Cada obrigação referencia `decisionId`, `decisionRevision`, `responsibilityDecisionEventId`, `responsibleSubjectId` quando permitido, `originalFinancialEntryId`, valor, moeda e policy version.

### FIN-DEC-010 — Amortização

Obrigações do mesmo devedor são amortizadas FIFO por `createdAt`, com desempate lexicográfico por `obligationId`. Uma origem financeira não pode ser recuperada duas vezes.

`PartnerLedger` amortiza obrigação de Edge Partner atomicamente quando aplica crédito futuro ao NegativeBalance. Advertiser e terceiro possuem Commands específicos no PaymentLedger e fontes de amortização próprias; nenhum crédito de Campaign é consumido por inferência.

## 9. Continuidade operacional

`DEC-048` supersede o Insurance Fund. A mensalidade do Plano de Continuidade é receita de serviço e nunca CampaignBudget, SplitShare ou patrimônio restrito. Payment/PaymentLedger preservam finalidade, preço/policy version, TV e competência; contabilidade reconhece receita e obrigações operacionais sem criar Aggregate securitário.

Reparo, logística, TV temporária, mini PC e inventário circular são custos do serviço. Hardware Continuity autoriza o caso; Financial registra e executa. Recovery por dano imputável continua exigindo decisão do owner competente e, quando baseado em responsabilidade, `ResponsibilityDecisionPublished`.

## 10. Withdrawal e fiscalidade

Withdrawal reserva valor bruto antes da execução. Na confirmação de execução:

```text
DR LIA_PAYOUT_IN_TRANSIT (bruto)
CR ACT_BANK_SETTLED      (líquido pago)
CR LIA_TAX_HOLDING       (retenção)
```

`gross = net + withholding`.

Sem `TaxPolicyVersion` ativa e válida, nenhuma instrução bancária é enviada. O resultado é:

```text
WithdrawalFailed(
  reason = MISSING_TAX_POLICY,
  disposition = RETRYABLE
)
```

A reserva permanece. Após policy válida, somente `RetryWithdrawal` inicia nova tentativa.

Pagamento consolidado de tributos usa:

```text
ExecuteTaxPayment → PaymentLedger → TaxPaymentExecuted
DR LIA_TAX_HOLDING
CR ACT_BANK_SETTLED
```

O Event referencia o lote e todas as retenções incluídas. Repetição não recolhe duas vezes.

## 11. Contratos canônicos e supersessões

| Contrato | Situação normativa |
| --- | --- |
| `ConfirmPaymentCompensation` | Command vigente posterior a `RecordPaymentReceived`; não é alias |
| `CreditPartner` | permanece canônico para materializar `SplitShareId` |
| `RefundAdvertiserUnusedCredit` | adicional; não substitui refund por responsabilidade |
| `RegisterPartnerRecoveryObligation` | adicional; não substitui `RecoverNegativeBalance` |
| `RegisterAdvertiserRecoveryObligation` | adicional |
| `RegisterThirdPartyRecoveryObligation` | adicional |
| `UpdateFinancialPolicy` | Command canônico; produz o Event vigente `FinancialPolicyChanged` |
| `ReconcilePaymentOperation` | especializa o antigo Command genérico para `PaymentLedger` |
| `ReconcileWithdrawalOperation` | especializa o antigo Command genérico para `Withdrawal` |
| `FinancialReconciliationCompleted` | Event canônico de conclusão; aliases de “resolved” são proibidos |
| `WithdrawalFailed` | Event canônico; `WithdrawalExecutionFailed` e estado `FAILED_TAX_POLICY_MISSING` são proibidos |

## 12. Invariantes de implementação

1. Nenhum Command possui owner variável ou separado por `/`.
2. Nenhum Event possui mais de um produtor.
3. Payment não grava Ledger.
4. PaymentLedger não altera CampaignBudget na mesma decisão.
5. Financial não decide responsabilidade.
6. `NONE` nunca cria RecoveryObligation.
7. `MOSTARDA` nunca cria recebível contra terceiro.
8. Lançamento aceito nunca é editado.
9. Toda transação contábil fecha débitos e créditos.
10. Replay/rebuild não publica efeitos externos.
11. Resultado externo desconhecido entra em reconciliação.
12. Ausência de TaxPolicy bloqueia execução bancária.

## 13. Gate

Este registro autoriza sincronização normativa. Implementação depende da auditoria pós-sincronização, da certificação dos contratos específicos e da validação fiscal/jurídica antes de produção.
