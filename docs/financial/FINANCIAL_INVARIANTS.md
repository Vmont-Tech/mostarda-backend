# Financial Invariants — Constituição do contexto

## 1. Caráter normativo

Estas regras prevalecem sobre exemplos, projeções, integrações e conveniências de implementação.

Violação de invariant:

- rejeita o Command antes de produzir efeito;
- não é corrigida por “ajuste direto”;
- gera diagnóstico auditável;
- exige compensação por novo fato se um efeito anterior já foi confirmado;
- bloqueia implementação quando depender de decisão `OPEN`.

## 2. Ownership

### FIN-OWN-001

Settlement calcula direitos e termina sua responsabilidade ao publicar `SplitShare` elegível. Ele nunca paga, mantém Wallet, cria Withdrawal ou instrui provider.

**Por quê:** direito deve permanecer determinístico mesmo quando transferência falha.

### FIN-OWN-002

Payment é owner do lifecycle da cobrança. Provider informa fatos; não escreve no PaymentLedger.

### FIN-OWN-003

PaymentLedger aceita lançamentos por Command próprio. Ele nunca modifica CampaignBudget na mesma decisão.

### FIN-OWN-004

CampaignBudget é o único owner de Available, Reserved e Consumed Budget.

### FIN-OWN-005

PartnerLedger é a fonte financeira do Partner. PartnerWallet é projeção e nunca cria saldo.

### FIN-OWN-006

PartnerLedger, usando revisão e política, é a autoridade que reserva valor sacável. Wallet não autoriza Withdrawal.

### FIN-OWN-007

Withdrawal é owner de sua intenção e tentativas. Asaas executa instruções, mas não aprova e não altera o Aggregate.

### FIN-OWN-008

Financial Platform não calcula preço, split, Evidence ou eligibility de Settlement.

## 3. Entrada de receita

### FIN-IN-001

Somente `Payment.COMPENSATED`, seguido de PaymentLedgerEntry aceito, pode aumentar CampaignBudget.

### FIN-IN-002

`CREATED`, `PENDING`, `RECEIVED`, `COMPENSATING`, `OVERDUE`, `DISPUTED`, `CANCELLED` e `FAILED` não liberam budget.

### FIN-IN-003

Pagamento compensado, lançamento e incremento de budget são três decisões de owners distintos, ligadas por Events e Commands.

### FIN-IN-004

ContractValue é propriedade comercial da Campaign e nunca representa saldo. CampaignBudget mantém somente referência imutável e buckets financeiros.

### FIN-IN-005

Taxa de cartão é adicional ao Advertiser e nunca reduz ContractValue ou AvailableBudget.

### FIN-IN-006

A Mostarda não antecipa recebíveis. Cada parcela aumenta budget somente após sua própria compensação.

### FIN-IN-007

Um fato externo de compensação origina no máximo um PaymentLedgerEntry positivo.

### FIN-IN-008

Pagamento parcial, excedente ou de alocação ambígua não pode ser distribuído por heurística (`OPEN-025`).

## 4. CampaignBudget

### FIN-BUD-001

AvailableBudget nunca é negativo.

### FIN-BUD-002

Reserva ocorre antes de `SlotAllocated` e corresponde integralmente ao PricingQuote congelado.

### FIN-BUD-003

Um Slot possui no máximo uma reserva ativa; uma reserva pertence a exatamente um Slot.

### FIN-BUD-004

Reserva é indivisível. Saldo insuficiente rejeita a obrigação inteira.

### FIN-BUD-005

Reservas concorrentes são decididas pelo CampaignBudget contra revisão atual. Duas reservas não podem usar a mesma disponibilidade.

### FIN-BUD-006

Reserva move valor de Available para Reserved; não cria nem destrói valor.

### FIN-BUD-007

Playback concluído não consome definitivamente budget.

### FIN-BUD-008

Somente Evidence `VALID`, não revertida e com ancoragem confirmada converte a reserva correlacionada de Reserved para Consumed.

### FIN-BUD-009

Evidence inválida, expirada ou definitivamente rejeitada libera a reserva conforme `BudgetReservationPolicy`.

### FIN-BUD-010

Liberação ou expiração não pode ocorrer depois do consumo da mesma reserva.

### FIN-BUD-011

Reversão depois do consumo cria ajuste financeiro compensatório. Não reduz `ConsumedBudget` editando o passado.

### FIN-BUD-012

Toda reserva possui identidade, Slot, Campaign, quote, valor, moeda, revisão, expiry e versão da política.

### FIN-BUD-013

Conservação mínima:

```text
total compensado + ajustes de crédito
= available + reserved + consumed + ajustes de débito
```

O modelo contábil completo permanece `OPEN-020`.

## 5. PartnerLedger e Wallet

### FIN-PART-001

PartnerLedger é append-only. Entrada aceita nunca é alterada ou apagada.

### FIN-PART-002

Cada `SplitShareId` origina no máximo um PartnerLedgerCredit.

### FIN-PART-003

Todo PartnerLedgerCredit nasce `PENDING`.

### FIN-PART-004

Maturação move classificação por novo fato segundo política; não edita o crédito.

### FIN-PART-005

Bloqueio preserva valor e beneficiário. Parcela nunca é redistribuída silenciosamente.

### FIN-PART-006

Chargeback gera lançamento compensatório e pode gerar NegativeBalance; nunca altera Evidence, Settlement, SplitShare ou crédito original.

### FIN-PART-007

Crédito futuro primeiro recupera NegativeBalance. Somente o excedente pode tornar-se withdrawable.

### FIN-PART-008

Saldo é derivado da sequência ordenada de lançamentos e políticas. Campos de Wallet não podem ser editados manualmente.

### FIN-PART-009

Rebuild de Wallet não cria Ledger Entry.

## 6. Withdrawal

### FIN-WDR-001

Todo saque nasce de `RequestWithdrawal`. Nenhum saque parte diretamente de Settlement, Wallet, Event ou provider.

### FIN-WDR-002

A política inicial permite no máximo um `WithdrawalExecuted` bem-sucedido por PartnerAccount em cada intervalo de 30 dias contado desde o último sucesso.

### FIN-WDR-003

Rejeição ou falha sem movimentação não reinicia a janela.

### FIN-WDR-004

Existe no máximo um Withdrawal não terminal por PartnerAccount.

### FIN-WDR-005

Valor solicitado e taxa de R$2 são reservados juntos no PartnerLedger antes da aprovação.

### FIN-WDR-006

Taxa é lançamento separado e só é debitada quando a execução é confirmada.

### FIN-WDR-007

Falha definitiva sem movimento libera valor e taxa por novos fatos, nunca por remoção da reserva.

### FIN-WDR-008

Timeout não é falha. Enquanto resultado externo for desconhecido, o valor permanece protegido contra outra Withdrawal.

### FIN-WDR-009

Nova tentativa só pode ser criada após confirmação de que a anterior não movimentou valor.

### FIN-WDR-010

Withdrawal `EXECUTED` ou `REJECTED` não reabre.

### FIN-WDR-011

Valor, moeda ou destino não mudam depois da aprovação. Mudança exige nova intenção.

## 7. WithdrawalBatch

### FIN-BATCH-001

Lifecycle canônico:

```text
OPEN → SEALED → SUBMITTED → RECONCILING → CLOSED
```

### FIN-BATCH-002

Depois de `SEALED`, membros e valores não mudam.

### FIN-BATCH-003

Resultado pertence a cada Withdrawal. O total do Batch não substitui reconciliação por item.

### FIN-BATCH-004

Batch só fecha quando todos os itens estão terminais ou explicitamente destacados para novo Batch.

### FIN-BATCH-005

Batch fechado nunca reabre. Correção é novo fato/Batch correlacionado.

## 8. Ledger

### FIN-LED-001

Todo lançamento possui origem, destino, motivo, valor, moeda, correlação, causação, política, timestamp, identidade e integridade.

### FIN-LED-002

Taxa, imposto, retenção, crédito, débito e compensação são linhas distinguíveis; nenhum custo é escondido.

### FIN-LED-003

Compensação referencia a origem e preserva ambas.

### FIN-LED-004

Saldo externo do provider nunca sobrescreve Ledger.

### FIN-LED-005

Replay não cria lançamento nem efeito externo.

### FIN-LED-006

A mesma sequência histórica e políticas aplicáveis deve reconstruir o mesmo estado derivado.

## 9. Distribuição

### FIN-DIST-001

Um Event nunca altera estado. Consumidor emite Command ao owner.

### FIN-DIST-002

Entrega duplicada não duplica efeito financeiro.

### FIN-DIST-003

Command com mesma idempotency key e mesmo conteúdo retorna o resultado original.

### FIN-DIST-004

Mesma chave com conteúdo divergente é conflito; nunca segundo efeito silencioso.

### FIN-DIST-005

Ordering é por Aggregate/Ledger relevante, não global.

### FIN-DIST-006

Event fora de ordem não pode pular transição obrigatória.

### FIN-DIST-007

Timeout significa ausência de confirmação.

### FIN-DIST-008

Resultado externo desconhecido exige reconciliação antes de retry ou compensação incompatível.

### FIN-DIST-009

Projeção atrasada não é corrigida escrevendo no Aggregate.

### FIN-DIST-010

Falha de consumidor não reverte automaticamente a decisão do produtor.

## 10. Política, auditoria e segurança

### FIN-POL-001

Toda decisão captura a versão de política efetivamente aplicada.

### FIN-POL-002

Política nova é prospectiva e não reinterpreta histórico.

### FIN-POL-003

Owner revalida autorização. Confiança no emissor não substitui a decisão.

### FIN-POL-004

Operação administrativa/compensatória exige ator e motivo.

### FIN-POL-005

Segregação de funções completa permanece `OPEN-032`; implementação não pode conceder autoridade ampla por conveniência.

### FIN-POL-006

Blockchain/Quantum nunca participa de cobrança, custódia, saldo, saque ou transferência.

## 11. Invariantes diante de decisões abertas

Enquanto uma regra permanece `OPEN`:

- nenhum valor quantitativo pode ser inventado;
- automação que dependa da regra deve bloquear ou encaminhar para decisão;
- histórico e contexto devem ser preservados;
- não se escolhe o comportamento mais permissivo;
- a especificação oficial é atualizada antes destes derivados.

Aplicam-se especialmente `OPEN-005/006/008`, `OPEN-016` a `OPEN-020`, `OPEN-025`, `OPEN-030` a `OPEN-032`.

## 12. Contraexemplos constitucionais

Qualquer um destes comportamentos invalida a implementação:

- Payment compensado aumentar budget diretamente.
- Campaign ler status do provider.
- Slot ser alocado antes da reserva.
- consumir budget ao concluir playback.
- consumir sem Evidence válida e ancorada.
- aceitar reserva parcial do Slot.
- duas Withdrawals reservarem o mesmo crédito.
- debitar taxa em solicitação rejeitada.
- repetir transferência por timeout.
- alterar Ledger Entry.
- usar Wallet reconstruída para criar ajuste no Ledger.
- reabrir Batch fechado.
- fazer Quantum custodiar valor.

## 13. Invariantes de Campaign e falha operacional

1. Falha sem execução válida libera reserva; nunca cria consumo.
2. Realocação cria nova obrigação e nova reserva.
3. Underdelivery não gera refund antes da tentativa de reaproveitamento definida por Campaign Management.
4. Overdelivery técnico não debita CampaignBudget.
5. Cancelamento preserva consumos comprovados.
6. Saldo cancelado não é devolvido pelo Aggregate Campaign.
7. Custo absorvido pela Mostarda deve possuir lançamento e owner explícitos; nunca é escondido por edição de Evidence ou Ledger.
8. Crédito interno cancelado pertence ao Advertiser e não expira sem política legal aprovada.
9. Refund nunca inclui consumo comprovado.
10. Overdelivery válido usa obrigação financiada pela Mostarda e remunera o parceiro integralmente.
