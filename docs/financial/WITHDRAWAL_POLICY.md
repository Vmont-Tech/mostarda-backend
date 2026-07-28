# Withdrawal Policy — Especificação normativa

## 1. Propósito

Withdrawal é o único fluxo pelo qual um Partner solicita a transferência externa de valor elegível.

`WithdrawalPolicy` existe para separar:

- direito econômico;
- saldo derivado;
- elegibilidade para solicitar;
- compromisso de saldo;
- instrução ao provider;
- confirmação/reconciliação da saída.

Um direito não é pagamento. Um saldo disponível não é transferência. Uma solicitação não é aprovação. Uma instrução externa não é confirmação.

## 2. Por que o saque é separado de Settlement

Se Settlement transferisse automaticamente cada SplitShare:

- falhas do provider contaminariam o ciclo de direitos;
- cada pequeno direito geraria uma saída independente;
- bloqueio de Partner exigiria reabrir Settlement;
- taxa e frequência ficariam acopladas ao split;
- retry poderia duplicar pagamentos;
- troca de provider alteraria domínio de Settlement.

Withdrawal permite consolidar direitos, aplicar política e reconciliar a execução sem alterar Evidence, Settlement ou SplitShare.

## 3. Regra vigente

A política inicial aprovada estabelece:

- no máximo um saque por PartnerAccount a cada 30 dias;
- taxa fixa Mostarda de R$2,00 por saque.

As seguintes semânticas também são normativas nesta versão:

- os 30 dias são contados desde o último `WithdrawalExecuted` bem-sucedido;
- rejeição e falha sem movimentação externa não reiniciam a janela;
- existe no máximo uma Withdrawal não terminal por PartnerAccount;
- PartnerLedger reserva atomicamente o valor solicitado e a taxa antes da aprovação;
- a taxa e o principal são debitados em lançamentos separados somente após execução confirmada;
- falha definitiva sem movimentação libera principal e taxa por novos fatos;
- `WithdrawalBatch` segue `OPEN → SEALED → SUBMITTED → RECONCILING → CLOSED`.

Somente os valores mínimo e máximo permanecem `OPEN-008`. Nenhuma implementação pode inventá-los, interpretar sua ausência como zero ou bloquear todo saque por falta desses limites.

## 4. Owner e participantes

| Participante | Responsabilidade |
| --- | --- |
| Partner | solicitar saque de sua própria PartnerAccount |
| Withdrawal | decidir e preservar lifecycle da solicitação |
| WithdrawalPolicy | definir elegibilidade, frequência e taxa aplicável |
| PartnerLedger | registrar créditos, débitos, taxa e compensações |
| PartnerWallet | projetar saldos e restrições |
| WithdrawalBatch | agrupar instruções compatíveis e preservar o lifecycle do lote |
| Financial Platform | orquestrar Commands entre owners e reconciliar |
| Asaas | executar transferência instruída e comunicar fatos |

Provider não aprova saque. Wallet não executa transferência. Settlement não cria Withdrawal.

## 5. Identidade e conteúdo da solicitação

Uma Withdrawal deve preservar:

- `withdrawalId`;
- Partner e PartnerAccount;
- valor solicitado;
- moeda;
- política e versão;
- taxa aplicável;
- conta/destino externo referenciado de forma segura;
- idempotency key;
- correlation e causation;
- estado;
- avaliação de elegibilidade;
- motivo de rejeição/bloqueio;
- batch, se aplicável;
- tentativas externas;
- resultado reconciliado;
- atores e timestamps;
- trilha de auditoria.

## 6. Estados de Withdrawal

| Estado | Significado |
| --- | --- |
| `REQUESTED` | intenção aceita para avaliação; não aprovada |
| `APPROVED` | regras conhecidas satisfeitas e decisão registrada |
| `BATCHED` | associada a um batch elegível |
| `EXECUTING` | existe tentativa externa em curso ou aguardando reconciliação |
| `EXECUTED` | transferência confirmada e reconciliada |
| `REJECTED` | solicitação rejeitada por regra permanente/contextual |
| `FAILED` | foi confirmado que a tentativa não movimentou dinheiro; a disposição registra se admite retry |

`EXECUTED` e `REJECTED` são finais para aquela solicitação. `FAILED` é final quando sua disposição é `FINAL`; com disposição `RETRYABLE`, permanece não terminal, conserva a reserva e só transita por `RetryWithdrawal`. Resultado desconhecido não é `FAILED`: permanece `EXECUTING` em reconciliação.

Ausência de `TaxPolicyVersion` válida é falha confirmável anterior à instrução bancária: nenhuma transferência é enviada; produz `WithdrawalFailed(reason=MISSING_TAX_POLICY, disposition=RETRYABLE)`; conserva a reserva; exige policy válida e `RetryWithdrawal`. O estado `FAILED_TAX_POLICY_MISSING` é proibido.

## 7. Transições

| Origem | Command | Pré-condição resumida | Destino | Event |
| --- | --- | --- | --- | --- |
| inexistente | `RequestWithdrawal` | Partner autorizado, dados válidos | `REQUESTED` | `WithdrawalRequested` |
| `REQUESTED` | `ApproveWithdrawal` | política e autoridade de saldo satisfeitas | `APPROVED` | `WithdrawalApproved` |
| `REQUESTED` | `RejectWithdrawal` | motivo explícito | `REJECTED` | `WithdrawalRejected` |
| `APPROVED` | `AddWithdrawalToBatch` | batch `OPEN` e compatível | `BATCHED` | `WithdrawalBatched` |
| `BATCHED` | `ExecuteWithdrawal` | batch `SEALED` ou `SUBMITTED`, compromisso válido, instrução permitida | `EXECUTING` | `WithdrawalExecutionRequested` |
| `EXECUTING` | `ConfirmWithdrawalExecution` | fato externo autoritativo e reconciliado | `EXECUTED` | `WithdrawalExecuted` |
| `EXECUTING` | `FailWithdrawalAttempt` | não movimentação confirmada e falha categorizada | `FAILED` | `WithdrawalFailed` |
| `FAILED` retryable | `RetryWithdrawal` | nenhuma execução confirmada; reserva válida; política permite | `EXECUTING` | `WithdrawalRetryScheduled`, `WithdrawalExecutionRequested` |

Não existe atalho `APPROVED → EXECUTING`: toda Withdrawal executável pertence a um Batch, ainda que o Batch contenha um único item.

## 8. Transições proibidas

- `REQUESTED → EXECUTING` sem aprovação;
- `APPROVED → EXECUTED` sem tentativa/fato reconciliado;
- `APPROVED → EXECUTING` sem `BATCHED`;
- `REJECTED → APPROVED`;
- `EXECUTED → FAILED`;
- `FAILED` final → `EXECUTING`;
- repetir `EXECUTED` como nova saída;
- executar diretamente a partir de SplitShare;
- alterar valor/destino após aprovação sem nova solicitação;
- remover taxa editando valor histórico;
- “voltar” estado para apagar tentativa.

## 9. RequestWithdrawal

### Quem emite

Partner autenticado, para sua própria PartnerAccount, ou ator expressamente autorizado por política ainda a detalhar.

### Pré-condições

- PartnerAccount existe e não está `CLOSED`;
- solicitação possui valor/moeda;
- destino é elegível;
- idempotency key é válida;
- não existe solicitação incompatível com a mesma identidade;
- não existe outra Withdrawal não terminal para a PartnerAccount;
- política aplicável está identificada.

Saldo sacável e frequência são revalidados pelo owner competente; o cliente não declara elegibilidade.

### Efeito

Cria Withdrawal `REQUESTED` e publica Event. Não transfere, não debita Ledger e não garante aprovação.

### Falhas

- conta inexistente/alheia;
- moeda ou valor inválido;
- identidade duplicada com conteúdo divergente;
- conta fechada;
- autorização inválida;
- política não determinável.

## 10. ApproveWithdrawal

### Pré-condições

- estado `REQUESTED`;
- política e versão capturadas;
- não existe `WithdrawalExecuted` nos 30 dias anteriores, contados desde o instante efetivo do último sucesso;
- reserva do principal e da taxa confirmada pelo PartnerLedger contra sua revisão vigente;
- PartnerAccount não bloqueada;
- valor atende limites aprovados;
- destino elegível;
- não há compromisso concorrente do mesmo valor;
- taxa é conhecida;
- segregação/autorização aplicável foi cumprida.

`OPEN-008` impede apenas completar os limites mínimo e máximo. Owner, momento da reserva, janela e concorrência já estão definidos e não podem ser tratados como opcionais.

### Efeito

Registra decisão `APPROVED`, valor, taxa, política, `reservationId` e revisão do PartnerLedger que fundamentaram a autorização. A aprovação nunca antecede `WithdrawalBalanceReserved`.

### Rejeição

Rejeitar exige motivo explícito e Event. Rejeição não apaga a solicitação, não reinicia a janela de 30 dias e, se por anomalia houver reserva correlacionada ainda ativa, exige `ReleaseWithdrawalBalance`.

## 11. Fee

A taxa:

- pertence à Mostarda, não ao provider;
- é fixa em R$2,00 na política inicial;
- é linha separada no PartnerLedger;
- preserva `WithdrawalId` e `WithdrawalPolicyVersion`;
- nunca é desconto invisível;
- não pode ser cobrada mais de uma vez para o mesmo efeito.

A taxa é comprometida na mesma decisão do PartnerLedger que reserva o principal. Ela só é debitada, em lançamento separado, depois de `WithdrawalExecuted`. Falha definitiva sem movimentação libera principal e taxa; retry da mesma Withdrawal não cria segunda taxa.

## 12. Frequência de 30 dias

A janela é móvel e começa no instante efetivo do último `WithdrawalExecuted` bem-sucedido da PartnerAccount. Antes do primeiro sucesso não existe marco anterior que, por si só, impeça a solicitação.

`REQUESTED`, `REJECTED`, falha confirmada sem movimentação e timeout não reiniciam a janela. Um sucesso tardio reconciliado passa a ser o novo marco, mesmo que a resposta tenha chegado depois do timeout.

Contrato de segurança:

- decisões registram o marco usado;
- apenas uma Withdrawal não terminal pode existir por PartnerAccount;
- duas solicitações concorrentes são serializadas pela identidade da conta e pela revisão do PartnerLedger;
- mudança de política não reinterpreta janela anterior;
- Partner recebe motivo claro de inelegibilidade;
- operador não pode ignorar a janela sem exceção aprovada/auditada.

## 13. WithdrawalBatch

Batch existe para agrupar Withdrawals aprovadas e compatíveis sem alterar sua autonomia.

Invariantes:

- cada Withdrawal mantém lifecycle próprio;
- batch não soma saldos como nova fonte de verdade;
- falha de item não apaga ou duplica outros;
- batch fechado não é reescrito;
- valores e quantidade devem corresponder aos itens;
- cada instrução mantém identidade;
- reconciliação ocorre por Withdrawal/tentativa, não apenas pelo total.

Lifecycle normativo:

| Origem | Command | Destino | Condição |
| --- | --- | --- | --- |
| inexistente | `OpenWithdrawalBatch` | `OPEN` | identidade, janela, moeda e política definidas |
| `OPEN` | `SealWithdrawalBatch` | `SEALED` | membros e totais reconciliados |
| `SEALED` | `SubmitWithdrawalBatch` | `SUBMITTED` | cada item possui identidade externa idempotente |
| `SUBMITTED` | `ReconcileWithdrawalBatch` | `RECONCILING` | há resultado, pendência ou divergência por item |
| `RECONCILING` | `CloseWithdrawalBatch` | `CLOSED` | todos os itens terminais ou destacados explicitamente |

Depois de `SEALED`, membros, valores e identidades não mudam. Resultado parcial atualiza somente os itens observados; não transforma pendência em falha. Um item destacado para novo Batch preserva o vínculo com o Batch anterior e só recebe nova tentativa quando não houver risco de movimentação duplicada.

## 14. Execução externa

### Antes de instruir

- Withdrawal está aprovada/elegível;
- principal e taxa possuem reserva ativa no PartnerLedger;
- batch está `SEALED` ou `SUBMITTED` e contém a Withdrawal imutável;
- destino e valor correspondem à aprovação;
- existe identidade da tentativa;
- não há sucesso anterior;
- política permite execução.

### Depois de instruir

O sistema registra tentativa e aguarda fato autoritativo. Uma resposta síncrona, se houver, não elimina reconciliação.

### Confirmação

Somente confirmação validada:

- leva a `EXECUTED`;
- causa lançamentos de débito/taxa no momento normativamente aprovado;
- associa recibo/referência;
- atualiza projeções por Events.

## 15. Resultado desconhecido

Se a instrução foi enviada e não há resposta conclusiva:

- estado permanece `EXECUTING` ou equivalente de reconciliação;
- valor não volta a ser reutilizável;
- retry capaz de duplicar transferência é proibido;
- consulta/reconciliação usa a mesma identidade;
- nova tentativa só nasce após certeza de ausência de execução ou mecanismo externo idempotente reconhecido;
- operador não pode marcar `FAILED` apenas por timeout;
- histórico preserva todas as observações.

Timeouts quantitativos permanecem `OPEN-031`.

## 16. Falha confirmada

Falha confirmada:

- registra tentativa;
- transita a `FAILED`;
- publica motivo categorizado;
- não apaga aprovação;
- não altera Settlement/SplitShare;
- não gera novo pagamento automaticamente;
- se `FINAL`, causa `ReleaseWithdrawalBalance` para liberar principal e taxa;
- se `RETRYABLE`, mantém a reserva até nova tentativa ou decisão final;
- permite retry apenas quando política aprovar.

## 17. Retry

Retry:

- referencia Withdrawal e tentativa anterior;
- mantém valor, Partner, moeda e destino aprovados;
- usa nova identidade de tentativa ligada à mesma intenção;
- não reaplica taxa sem regra;
- revalida restrições que possam ter surgido;
- não contorna frequência;
- não ocorre se resultado anterior for desconhecido;
- registra ator, motivo e política.

## 18. Cancelamento

Esta versão não define `CancelWithdrawal`. Uma intenção inválida em `REQUESTED` é rejeitada; uma falha confirmada após tentativa segue `FAILED`; resultado desconhecido permanece em reconciliação.

Adicionar cancelamento no futuro exige decisão normativa prospectiva que defina transição, autoridade, efeito na reserva e na tentativa externa. Em nenhuma hipótese cancelamento poderá apagar histórico, desfazer `EXECUTED` ou presumir que uma instrução externa não movimentou valor.

## 19. Concorrência

### Duas solicitações na mesma janela

O owner da política deve impedir que ambas sejam aprovadas se violarem o limite, mesmo que ambas tenham sido criadas.

### Duas solicitações sobre o mesmo saldo

Uma projeção positiva não basta. `ReserveWithdrawableBalance`, dirigido ao PartnerLedger com revisão esperada, serializa o compromisso. A primeira reserva aceita avança a revisão; a concorrente obsoleta é rejeitada ou reavaliada e nunca usa o mesmo crédito.

### Falha e confirmação simultâneas

Fatos são reconciliados pela tentativa e origem. Confirmação autoritativa não pode ser descartada porque `FAILED` foi observado primeiro.

### Bloqueio após aprovação

Antes da instrução, autorização e restrições devem ser revalidadas. Após instrução, o resultado deve ser reconciliado; não se presume capacidade de cancelar externamente.

## 20. Idempotência

| Operação | Identidade mínima |
| --- | --- |
| solicitação | Partner + intenção/idempotency key |
| aprovação/rejeição | Withdrawal + decisão/version |
| inclusão em batch | Withdrawal + batch |
| tentativa | Withdrawal + attempt |
| confirmação externa | provider reference + ocorrência |
| débito | Withdrawal executada |
| taxa | Withdrawal + política + efeito |

Reentrega idêntica não cria novo efeito. Payload divergente sob a mesma chave é conflito. Apenas o prazo quantitativo de retenção das chaves permanece `OPEN-030`.

## 21. Consistência eventual

Janelas permitidas:

- Withdrawal executada antes de Wallet reconstruir saldo;
- provider confirmou antes do Ledger receber Command;
- Ledger debitou antes de notificação ao Partner;
- item falhou enquanto outros do batch avançaram.

Cada consumidor deve ser idempotente. Nenhuma janela autoriza segundo saque.

## 22. Replay e rebuild

Replay de Events:

- não executa transferência;
- não debita novamente;
- não cobra taxa novamente;
- reconstrói lifecycle e tentativas.

Rebuild:

- correlaciona Withdrawal, Ledger, Wallet e fatos externos;
- identifica instruções sem conclusão;
- identifica execução sem lançamento interno;
- preserva divergências;
- não cria correção automática sem Command autorizado.

## 23. Auditoria

Deve responder:

- quem solicitou;
- quanto e para qual conta;
- qual saldo/fronteira fundamentou a decisão;
- qual política, taxa e janela;
- quem aprovou/rejeitou;
- em qual batch;
- quais tentativas foram feitas;
- quais respostas/fatos externos ocorreram;
- qual lançamento registrou saída/taxa;
- como falhas e retries foram tratados.

## 24. Exemplos

### Caso feliz

Partner solicita valor elegível. O PartnerLedger reserva principal e R$2 contra a revisão vigente. Withdrawal é aprovada, incluída em Batch `OPEN`, o Batch é selado, submetido e reconciliado. A instrução é confirmada uma vez; Ledger debita principal e taxa em linhas distintas e o sucesso inicia a janela de 30 dias.

### Resposta perdida

Provider recebeu instrução, mas a resposta não chegou. Withdrawal permanece em reconciliação; o sistema não envia outro pagamento apenas por timeout.

### Solicitação duplicada

O Partner reenvia a mesma idempotency key. Recebe a Withdrawal original; não nasce nova solicitação.

## 25. Contraexemplos proibidos

- pagar no momento do Settlement.
- considerar crédito como saque automático.
- aprovar usando apenas projeção defasada.
- cobrar R$2 editando o crédito.
- permitir duas Withdrawals sobre o mesmo saldo.
- marcar falha por timeout e reenviar sem reconciliação.
- reabrir `EXECUTED`.
- apagar Withdrawal rejeitada.
- modificar valor após aprovação.
- contar os 30 dias desde solicitação, aprovação, rejeição ou falha sem movimentação.
- liberar reserva enquanto o resultado da tentativa for desconhecido.
- modificar membros de Batch depois de `SEALED`.

## 26. Decisões abertas

Aplicam-se `OPEN-002`, `OPEN-008`, `OPEN-016` a `OPEN-020` quando houver compensação, e `OPEN-030` a `OPEN-032` da [PLATFORM_SPECIFICATION.md](../specification/PLATFORM_SPECIFICATION.md). Os `OPEN-030/031` limitam somente retenção de chaves e parâmetros temporais/retry; não reabrem as semânticas de idempotência, resultado desconhecido ou janela de 30 dias definidas acima.
