# Financial Platform — Especificação arquitetural

## 1. Propósito

Financial Platform é o Bounded Context responsável por transformar fatos financeiros externos e direitos econômicos internos em movimentos monetários rastreáveis da Mostarda.

Ele responde, de forma normativa, a quatro perguntas:

1. quanto dinheiro efetivamente compensado pode financiar a execução de uma Campaign;
2. quais lançamentos explicam esse saldo;
3. quanto cada Partner possui como direito pendente, disponível, bloqueado, sacável ou negativo;
4. quais saídas foram solicitadas, autorizadas, executadas ou reconciliadas.

Sua razão de existir é separar três conceitos que não são equivalentes:

- valor comercial contratado;
- dinheiro efetivamente compensado;
- direito econômico decorrente de uma exibição comprovada.

Sem essa separação, uma promessa comercial poderia ser tratada como dinheiro, um direito poderia ser confundido com pagamento e uma falha do provider poderia obrigar a reescrita de fatos de domínio.

## 2. Princípio estrutural

Existem dois fluxos financeiros independentes:

```text
Entrada:
Advertiser → cobrança externa → fato de compensação
→ PaymentLedger → CampaignBudget → autorização financeira de execução

Saída:
Settlement → direito financeiro imutável
→ PartnerLedger → PartnerWallet → Withdrawal
→ instrução externa → reconciliação
```

Eles podem ser correlacionados para auditoria, mas não formam uma transação distribuída única.

Uma entrada compensada não cria Evidence nem SplitShare. Um SplitShare não presume que exista saldo sacável, nem executa transferência. Essa independência permite que cada lado seja reprocessado sem alterar o outro.

## 3. Por que Settlement não paga

Settlement responde à pergunta: “quais direitos surgiram desta Evidence e segundo qual política?”.

Financial Platform responde à pergunta: “como esses direitos são registrados, disponibilizados e movimentados?”.

Manter essas responsabilidades separadas:

- preserva Settlement como cálculo determinístico e reexecutável;
- impede que indisponibilidade do provider altere o resultado econômico;
- permite que cada `SplitShare` tenha ciclo independente;
- evita acoplar Evidence, preço e percentuais a dados bancários;
- permite trocar o executor externo sem recalcular direitos;
- mantém retries de transferência fora do ciclo de liquidação;
- torna chargeback, bloqueio e recuperação lançamentos posteriores, e não mutações do Settlement.

Alternativa rejeitada: Settlement calcular e transferir no mesmo lifecycle. Essa alternativa mistura direito e execução, dificulta idempotência, transforma falha externa em falha de cálculo e ameaça a imutabilidade do ciclo encerrado.

Regra normativa: `SplitShare.CREDITED` significa que o direito foi materializado no `PartnerLedger`; não significa que o Partner recebeu uma transferência.

### 3.1 B-002 — Resultado do split versus lancamento

As sete posicoes da politica sao preservadas como sete resultados `SplitShare`.
`FinancialRight` e uma materializacao posterior e existe somente para parcela
quantizada maior que `0.0000`.

Resultado zero nao gera Journal ou PartnerLedger, nao e redistribuido e permanece
disponivel para replay e auditoria como parte do resultado deterministico. Gross
zero e rejeitado antes da abertura do Settlement financeiro.

## 4. Escopo

Financial Platform é owner de:

- registro financeiro de pagamentos reconhecidos;
- `PaymentLedger` e seus lançamentos;
- `CampaignBudget` e autorização de reserva/consumo;
- `PartnerAccount`, quando limitado à elegibilidade financeira;
- `PartnerLedger` e lançamentos de crédito/débito;
- `PartnerWallet` como visão derivada;
- `Withdrawal` e a aplicação de `WithdrawalPolicy`;
- `WithdrawalBatch`, sem antecipar as decisões ainda abertas sobre seu lifecycle;
- políticas financeiras versionadas;
- instruções de cobrança e transferência dirigidas ao provider;
- reconciliação entre instruções, fatos externos e Ledger;
- chargebacks, reversões e recuperações por lançamentos compensatórios;
- trilha de auditoria de toda decisão financeira.

## 5. Não responsabilidades

Financial Platform não:

- calcula preço;
- escolhe anúncio, TV, Slot ou horário;
- cria, valida ou ancora Evidence;
- calcula percentuais ou destinatários de SplitShare;
- determina se uma Evidence é elegível para Settlement;
- altera Campaign, Slot, Evidence, Settlement ou SplitShare;
- controla Edge, Player, TV ou conectividade;
- mantém rails de pagamento próprios;
- usa Quantum ou blockchain para custódia, cobrança ou transferência;
- presume regras fiscais ainda não aprovadas;
- concede crédito ou antecipa recebíveis.

## 6. Relações com outros contextos

| Contexto | Fato ou solicitação recebido | Resposta do Financial Platform | Limite obrigatório |
| --- | --- | --- | --- |
| Campaign Management | solicitação de autorização financeira e correlação contratual | autorizado ou rejeitado; eventos de budget | Campaign não lê Payment nem calcula saldo |
| Pricing | quote congelado referenciado pela reserva/consumo | nenhuma decisão de preço | Financial Platform não recalcula quote |
| Slot Allocation | intenção de reservar ou liberar valor | decisão atômica do `CampaignBudget` | reserva integral ocorre antes de `SlotAllocated` |
| Evidence | fato `VALID`, não revertido e com anchor confirmado, ou rejeição definitiva | consumo ou liberação da reserva por Command ao `CampaignBudget` | playback isolado nunca consome budget |
| Settlement | direito imutável por `SplitShare` | crédito único no `PartnerLedger` | Settlement nunca instrui pagamento |
| Asaas | fatos externos de cobrança/transferência | instruções e reconciliação | provider não decide política ou saldo |
| Hardware Continuity | cobrança/obrigação autorizada | lançamento explícito de receita/custo do serviço | Financial não decide manutenção, troca ou responsabilidade |
| Quantum | nenhum | nenhum | blockchain nunca movimenta dinheiro |
| Analytics | eventos financeiros | projeções descartáveis/reconstruíveis | Analytics nunca é fonte de saldo |

## 7. Modelo conceitual

### 7.1 Payment e PaymentLedger

`Payment` é o Aggregate owner do lifecycle de uma obrigação de pagamento externa. O adapter comunica fatos por Commands ao Payment; ele não escreve no PaymentLedger. Ao confirmar compensação, Payment publica `PaymentCompensated`; um consumidor emite `PostPaymentLedgerEntry`, e somente depois outro consumidor emite `IncreaseCampaignBudget`.

O `PaymentLedger` registra fatos monetários reconhecidos. Somente compensação confirmada pode produzir lançamento que aumente orçamento.

### 7.2 CampaignBudget

`CampaignBudget` é o Aggregate que decide se uma solicitação financeira de execução pode ser atendida. Ele mantém buckets conceituais de valor disponível, reservado e consumido. A reserva integral do PricingQuote ocorre antes de `SlotAllocated`; somente Evidence `VALID`, não revertida e ancorada converte Reserved em Consumed. Rejeição definitiva ou expiração elegível libera a reserva por novo Command.

`ContractValue` nunca é saldo. Campaign é seu owner; o CampaignBudget mantém referência imutável ao contrato, sem criar segunda autoridade comercial.

### 7.3 PartnerLedger

`PartnerLedger` é a fonte append-only dos movimentos de um parceiro. Direito de Settlement cria crédito. Saque, taxa, chargeback ou recuperação criam lançamentos próprios, sem editar entradas anteriores.

### 7.4 PartnerWallet

`PartnerWallet` deriva `PendingBalance`, `AvailableBalance`, `BlockedBalance`, `WithdrawableBalance` e `NegativeBalance` do Ledger e das políticas aplicadas.

A Wallet não cria dinheiro nem autoriza saque. `RequestWithdrawal` solicita ao PartnerLedger a reserva transacional do valor e da taxa usando a revisão do Ledger. Revisão obsoleta, NegativeBalance ou compromisso concorrente rejeitam ou exigem reavaliação.

### 7.5 Withdrawal

`Withdrawal` preserva a intenção do parceiro, a avaliação da política, as tentativas externas e o resultado reconciliado. Transferência externa só pode ser solicitada após decisão válida do Aggregate.

### 7.6 FinancialPolicy

Políticas são versionadas e aplicadas prospectivamente. Uma nova versão não reinterpreta lançamento, reserva, crédito ou Withdrawal já decidido sob versão anterior.

## 8. Consistência e fronteiras transacionais

Cada Aggregate decide somente seu próprio estado.

Um Command dirigido ao `PaymentLedger` não pode, na mesma decisão, modificar `CampaignBudget`. O owner:

1. valida o Command;
2. registra sua própria decisão;
3. publica um Event;
4. um consumidor autorizado traduz o Event em novo Command ao próximo owner.

Portanto, a propagação entre Aggregates é eventualmente consistente. Durante essa janela:

- o Payment pode estar compensado antes de o budget refletir o crédito;
- o PartnerLedger pode conter o crédito antes de a Wallet refletir o saldo;
- uma Withdrawal pode estar executada externamente antes da reconciliação local final;
- projeções podem estar atrasadas sem que o Ledger esteja incorreto.

Nenhum consumidor pode “corrigir” essa janela escrevendo em Aggregate alheio.

## 9. Concorrência

Decisões concorrentes são serializadas logicamente pelo owner do Aggregate, sem prescrever mecanismo técnico.

Regras obrigatórias:

- duas solicitações não podem consumir o mesmo `AvailableBudget`;
- duas compensações do mesmo fato externo não podem criar dois créditos;
- dois créditos para o mesmo `SplitShareId` não podem coexistir;
- duas Withdrawals não podem comprometer o mesmo valor sacável;
- confirmação e falha concorrentes da mesma tentativa externa exigem reconciliação, nunca escolha silenciosa;
- Command baseado em versão de estado obsoleta deve ser rejeitado ou reavaliado pelo owner;
- rejeição por concorrência não autoriza retry cego com nova identidade.

A escolha do mecanismo de controle de concorrência é implementação e não pertence a este documento.

## 10. Idempotência e duplicidade

Toda operação com efeito financeiro possui chave idempotente vinculada ao fato de negócio:

- compensação: identidade externa + ocorrência de compensação;
- incremento de budget: lançamento de PaymentLedger que o causou;
- reserva/consumo/liberação: identidade da obrigação de Slot/quote e fase;
- crédito de parceiro: `SplitShareId`;
- Withdrawal: solicitação do Partner dentro da política aplicável;
- tentativa externa: `WithdrawalId + attempt`;
- compensação de Ledger: lançamento original + motivo de compensação.

Reentrega com a mesma identidade e o mesmo significado retorna o resultado já conhecido e não produz novo efeito.

A resposta a mesma chave com payload divergente e o prazo de retenção das chaves permanecem `OPEN-030`. Até essa decisão, divergência nunca pode produzir silenciosamente um segundo efeito.

## 11. Falhas e recuperação

| Falha | Comportamento obrigatório |
| --- | --- |
| fato externo temporariamente indisponível | manter estado anterior; retry com a mesma identidade |
| Event entregue duas vezes | consumidor reconhece efeito já aplicado |
| Event fora de ordem | owner rejeita transição inválida, posterga ou reconcilia; nunca pula estado |
| consumidor indisponível | produtor permanece concluído; entrega pode ser refeita |
| projeção inconsistente | reconstruir do Ledger/Event history sem editar origem |
| tentativa de transferência sem resposta | manter resultado desconhecido e reconciliar antes de repetir |
| chargeback após compensação | bloqueio cautelar até decisão; depois, novo lançamento/recovery no owner definido por `DEC-043` |
| saldo insuficiente por concorrência | rejeitar uma das solicitações; nunca criar saldo negativo de budget |
| política alterada durante operação | preservar versão capturada na decisão original |

Timeouts e quantidades de retry permanecem `OPEN-031`. Uma implementação não pode convertê-los em regra de negócio sem decisão normativa.

## 12. Replay, reidratação e rebuild

Replay reapresenta fatos já registrados; não cria nova ocorrência de negócio.

Reidratação reconstrói o estado de um Aggregate a partir de seu histórico autorizado.

Rebuild reconstrói uma projeção, como PartnerWallet ou relatório financeiro, a partir das fontes append-only.

São invariantes:

- a mesma sequência ordenada produz o mesmo estado derivado;
- replay não cria novo Ledger Entry;
- projeção reconstruída não substitui Ledger;
- falha parcial de rebuild mantém a projeção anterior ou a marca como indisponível; não publica saldo incompleto como definitivo;
- mudanças de política não reclassificam o passado durante replay;
- qualquer divergência entre rebuild e estado publicado gera diagnóstico e reconciliação auditada.

O modelo contábil detalhado e suas equações de conservação são definidos pelo Financial Decision Register.

## 13. Auditoria

Toda decisão financeira registra, no mínimo:

- Aggregate e identidade;
- Command e ator/emissor;
- autorização aplicada;
- idempotency key;
- correlation e causation;
- valor e moeda;
- estado anterior e decisão;
- política e versão;
- referência externa, quando houver;
- horário observado e horário efetivo informado;
- Events publicados;
- motivo de rejeição, compensação ou intervenção;
- hash ou mecanismo equivalente de integridade conceitual.

O histórico é append-only. “Corrigir” significa anexar novo fato correlacionado.

## 14. Segurança e autorização

O owner revalida autorização no momento da decisão. A origem de um Event ou a validação feita por outro contexto não substitui essa verificação.

Princípios mínimos:

- Partner só solicita operação para sua própria conta;
- adapter só comunica fatos do provider sob identidade autenticada;
- decisões administrativas exigem ator identificável e justificativa;
- mudança de política não pode ser retroativa;
- operações sensíveis devem permitir segregação de funções.

A matriz completa de papéis e a segregação obrigatória permanecem `OPEN-002` e `OPEN-032`.

## 15. Exemplos normativos

### 15.1 Entrada válida

Uma parcela de R$100 é confirmada como compensada. O PaymentLedger reconhece o fato uma única vez. Depois, por Event e novo Command, o CampaignBudget recebe R$100 de crédito. Uma duplicata da confirmação não aumenta o saldo novamente.

### 15.2 Direito sem pagamento imediato

Settlement cria um direito de R$20 para um Partner. Financial Platform credita o PartnerLedger inicialmente como `PENDING`. A política de maturação decide `AVAILABLE` ou `BLOCKED` a partir de elegibilidade, disputa e retenção; parâmetros quantitativos não aprovados não são presumidos. Nenhuma transferência ocorre apenas porque o crédito existe.

### 15.3 Falha externa

Uma Withdrawal autorizada é enviada ao provider e a resposta é perdida. O sistema não presume sucesso nem emite automaticamente outra transferência. Ele preserva a tentativa como resultado desconhecido e reconcilia pela mesma identidade.

## 16. Contraexemplos proibidos

- Campaign consultar o Asaas para saber se pode executar.
- `ContractValue` ser decrementado como se fosse saldo.
- Settlement criar PIX ou atualizar Wallet.
- Wallet aceitar ajuste manual sem Ledger Entry.
- apagar crédito para representar chargeback.
- reduzir CampaignBudget por taxa de cartão cobrada do Advertiser.
- antecipar todas as parcelas de uma cobrança parcelada.
- repetir transferência porque um timeout foi interpretado como falha definitiva.
- usar Quantum para custodiar ou transferir valor.
- aplicar política atual a um lançamento histórico.

## 17. Decisões abertas

Este contexto não pode encerrar por suposição `OPEN-005`, `OPEN-008` e `OPEN-030` a `OPEN-032`. As antigas `OPEN-006`, `OPEN-009`, `OPEN-016` a `OPEN-020` e `OPEN-025` foram encerradas pelo [FINANCIAL_DECISION_REGISTER.md](./FINANCIAL_DECISION_REGISTER.md).

Quando uma dessas decisões for aprovada, a especificação oficial deve ser alterada primeiro e estes documentos derivados devem ser sincronizados.

## 18. AdvertiserAccount, cancelamento e overdelivery

`AdvertiserAccount` é o owner do crédito interno reutilizável. Cancelamento não apaga consumo comprovado:

1. Campaign publica cancelamento;
2. reservas revogáveis são liberadas;
3. saldo não consumido é creditado na AdvertiserAccount por padrão;
4. Advertiser pode manter o crédito ou solicitar refund;
5. refund usa o meio original quando elegível e permitido;
6. cada movimento é append-only e idempotente.

Overdelivery com Evidence válida cria direito normal do parceiro. O débito econômico não recai sobre CampaignBudget. A obrigação financeira aplicável é criada somente após `ResponsibilityDecisionPublished`, referencia `decisionId + revision` e financia os créditos derivados sem alterar Payment, CampaignBudget, Evidence ou Settlement histórico.

## 19. Governance e consequências de responsabilidade

Financial publica fatos financeiros, inclusive pagamento, chargeback, disputa interna, saldo, tentativa e reconciliação. Ele nunca decide culpa, responsibleParty ou ResponsibilityCategory.

Somente `ResponsibilityDecisionPublished` autoriza materializar consequência baseada em responsabilidade. `PlatformLossEntry`, `PartnerCompensation`, `AdvertiserRefund` e recovery contra parte responsável exigem:

- `governanceCaseId`;
- `decisionId`;
- `decisionRevision`;
- Event ID causal;
- lançamento original, quando existir;
- idempotency key;
- policy financeira aplicável.

Financial valida o contrato e executa por Command próprio. Confidence nunca controla execução. Nova revision não edita lançamento anterior; causa entry compensatória.

## 20. Sincronização normativa financeira

O Financial Decision Register é a autoridade especializada para dinheiro, precisão, dupla entrada, reconhecimento, continuidade operacional, recovery, refund, fiscalidade e pagamento parcial.

- `PaymentReceived` não lança dinheiro.
- `PaymentCompensated` causa `PostPaymentLedgerEntry`; entrada aceita causa `IncreaseCampaignBudget`.
- Payment compensado cria crédito do Advertiser; Platform Fee e Participant Payable somente nascem de Settlement.
- `PaymentLedger` governa fatos monetários reconhecidos, crédito do Advertiser, receita/obrigações de continuidade, recovery de Advertiser/terceiro e pagamento fiscal consolidado.
- `PartnerLedger` governa lançamentos e recovery de Edge Partner.
- Evidence revertida sem decisão de Governance bloqueia cautelarmente a parcela; não causa compensação definitiva.
- toda JournalTransaction é append-only, multilinhas e balanceada.
