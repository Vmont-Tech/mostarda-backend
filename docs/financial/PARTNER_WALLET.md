# Partner Wallet — Especificação normativa

## 1. Propósito

`PartnerWallet` é a visão financeira explicável de um Partner.

Ela organiza os lançamentos do `PartnerLedger` em saldos com significados distintos:

- direito reconhecido, mas ainda pendente;
- valor disponível;
- valor bloqueado;
- valor potencialmente sacável;
- obrigação negativa a recuperar.

Wallet existe para apresentação, consulta operacional e suporte à avaliação de Withdrawal. Ela não cria direito, não movimenta dinheiro e não substitui o Ledger.

## 2. Por que Wallet é derivada

O mesmo direito pode atravessar condições de maturação, bloqueio, elegibilidade e saque sem que o fato original deixe de existir.

Se a Wallet fosse um saldo editável:

- um ajuste poderia perder a origem;
- replay poderia duplicar valor;
- chargeback exigiria reescrita;
- projeção atrasada poderia autorizar saída indevida;
- não seria possível explicar por que R$X está sacável e R$Y está bloqueado.

Por isso, PartnerLedger preserva fatos; Wallet deriva classificação e saldo.

## 3. Fronteira

PartnerWallet pertence ao Financial Platform.

Ela conhece:

- PartnerAccount financeiro;
- PartnerLedger;
- versões de políticas;
- bloqueios financeiros/compliance recebidos por contrato explícito;
- Withdrawals correlacionadas.

Ela não conhece:

- Campaign, anúncio, Slot ou TV como regras operacionais;
- Evidence como objeto mutável;
- cálculo do Settlement;
- percentuais;
- credenciais do Edge;
- saldo do provider como autoridade;
- Quantum.

Referências a Settlement/Campaign podem existir apenas para rastreabilidade dos lançamentos.

## 4. PartnerAccount

`PartnerAccount` identifica o participante econômico no Financial Platform e sua elegibilidade operacional.

Responsabilidades conceituais:

- vincular Partner à conta financeira;
- preservar estado de elegibilidade;
- associar dados necessários à instrução externa sob minimização;
- registrar restrições;
- correlacionar Wallet, Ledger e Withdrawals.

A matriz completa de autorização/compliance permanece `OPEN-002/032`.

## 5. Saldos

| Saldo | Definição | Não significa |
| --- | --- | --- |
| `PendingBalance` | créditos reconhecidos que ainda não satisfizeram condição de disponibilidade | valor sacável |
| `AvailableBalance` | créditos que satisfizeram as condições de disponibilidade aplicáveis | reserva garantida para saque |
| `BlockedBalance` | valor impedido de avançar por disputa, elegibilidade, compliance ou política | perda ou redistribuição |
| `WithdrawableBalance` | parcela disponível que satisfaz os critérios vigentes para solicitação | transferência executada |
| `NegativeBalance` | débitos compensatórios acima dos créditos aplicáveis | edição de direitos anteriores |
| `ReservedForWithdrawal` | principal e taxa comprometidos atomicamente pelo PartnerLedger para uma Withdrawal | débito executado |

`ReservedForWithdrawal` é projetado de fatos do PartnerLedger. A Wallet não cria a reserva. O compromisso nasce em `ReserveWithdrawableBalance`, antes de `WithdrawalApproved`, e termina por débito confirmado ou liberação explícita.

## 6. Regra de derivação

Conceitualmente:

```text
Ledger Entries ordenados
+ versões históricas de política
+ estado financeiro do PartnerAccount
+ Withdrawals correlacionadas
= Wallet em uma fronteira de leitura identificada
```

A Wallet deve informar sua fronteira de atualização. Uma visão sem essa referência não pode se apresentar como saldo definitivo em fluxo sensível.

## 7. Maturação

Um `PartnerLedgerCredit` não se torna automaticamente withdrawable.

As transições conceituais possíveis são:

```text
Pending → Available → Withdrawable
Pending/Available/Withdrawable → Blocked
Blocked → Pending/Available/Withdrawable
Available/Withdrawable → recuperação de NegativeBalance
Withdrawable → comprometido/retirado por Withdrawal
```

Todo `PartnerLedgerCredit` nasce `PENDING`. `MaturePartnerCredit` pode movê-lo a `AVAILABLE` somente quando a política versionada confirma elegibilidade, ausência de disputa/bloqueio e cumprimento da retenção aplicável. Causa impeditiva explícita usa `BlockPartnerCredit`; simples espera temporal mantém `PENDING`.

O valor quantitativo da retenção, quando aplicável, é parâmetro de política e não pode ser inventado. Independentemente desse número:

- nenhum crédito é sacável apenas por existir;
- classificação exige Command ao PartnerLedger;
- bloqueios preservam o crédito;
- toda mudança de classificação possui causa e política;
- Wallet apenas reflete a decisão.

## 8. Estados da Wallet/PartnerAccount

| Estado | Significado | Efeito |
| --- | --- | --- |
| `ACTIVE` | conta apta a participar das avaliações permitidas | não garante saldo sacável |
| `RESTRICTED` | operações limitadas por condição identificada | política define quais; sem apagar saldo |
| `BLOCKED` | novas Withdrawals impedidas | créditos/débitos continuam registrados |
| `CLOSED` | conta encerrada para novas operações | histórico e obrigações permanecem |

## 9. Transições de estado

| Origem | Decisão | Destino | Evento conceitual |
| --- | --- | --- | --- |
| `ACTIVE` | aplicar restrição válida | `RESTRICTED` | `PartnerWalletRestricted` |
| `ACTIVE/RESTRICTED` | aplicar bloqueio válido | `BLOCKED` | `PartnerBalanceBlocked` |
| `RESTRICTED` | remover causa | `ACTIVE` | `PartnerWalletRestrictionCleared` |
| `BLOCKED` | remover todas as causas aplicáveis | `ACTIVE` ou `RESTRICTED` | `PartnerBalanceUnblocked` |
| não final | encerrar conta autorizado | `CLOSED` | `PartnerWalletClosed` |

O Event não altera a Wallet por conta própria; é registro da decisão do owner ou insumo para reconstrução.

## 10. Crédito de parceiro

Fluxo:

1. Settlement publica direito imutável.
2. Consumidor autorizado solicita crédito ao PartnerLedger.
3. PartnerLedger valida unicidade por `SplitShareId`.
4. Crédito é registrado uma única vez.
5. `PartnerCredited` é publicado.
6. Wallet incorpora o lançamento em sua próxima fronteira consistente.
7. O crédito permanece `PENDING` até `MaturePartnerCredit` ou `BlockPartnerCredit`.
8. PartnerLedger publica a decisão de classificação.
9. Wallet projeta `AVAILABLE` ou `BLOCKED` na nova fronteira.

## 11. Saldo negativo e recuperação

Quando um débito compensatório supera créditos aplicáveis:

1. Ledger preserva o débito e sua origem;
2. Wallet deriva `NegativeBalance`;
3. novo crédito futuro é registrado integralmente;
4. política aplica o crédito primeiro à recuperação;
5. lançamentos/classificações explicam quanto foi recuperado;
6. somente excedente pode seguir para disponibilidade/sacabilidade.

Exemplo conceitual:

```text
NegativeBalance anterior: R$30
Novo crédito:             R$50
Recuperação:              R$30
Máximo restante:          R$20
```

Os R$20 ainda seguem a política de maturação antes de se tornarem withdrawable.

## 12. Bloqueio

Bloqueio:

- requer motivo categorizado;
- possui ator/origem;
- registra política;
- pode afetar crédito específico ou conta conforme regra;
- não redistribui valor;
- não apaga Ledger Entry;
- não converte automaticamente valor em NegativeBalance;
- publica Event;
- deve permitir remoção auditada quando a causa cessar.

O comportamento detalhado por tipo de compliance permanece sujeito às decisões de autorização e segurança.

## 13. Relação com Withdrawal

Partner solicita Withdrawal; Financial Platform avalia a política.

Regras obrigatórias:

- Settlement nunca inicia Withdrawal;
- Wallet não transfere;
- `WithdrawableBalance` não equivale a valor já reservado;
- uma solicitação deve ser avaliada contra uma autoridade consistente;
- duas solicitações não podem comprometer o mesmo valor;
- execução externa só ocorre depois de aprovação válida;
- falha não apaga a intenção.

PartnerLedger é a autoridade transacional. `RequestWithdrawal` inicia o fluxo que emite `ReserveWithdrawableBalance` com a revisão esperada. Somente `WithdrawalBalanceReserved` permite `ApproveWithdrawal`; a Wallet pode apoiar leitura e explicação, mas nunca substituir essa decisão.

## 14. Concorrência

### 14.1 Duas Withdrawals

Ambas podem observar a mesma projeção. Isso não autoriza ambas. O owner da decisão deve comprometer/validar valor de forma serializada logicamente.

### 14.2 Crédito e bloqueio

O crédito continua existindo. A ordem autorizada determina sua classificação; bloqueio não impede registrar direito.

### 14.3 Chargeback e Withdrawal

Ambos são preservados. A reserva impede reutilização do valor enquanto a Withdrawal não for conclusiva. A alocação econômica de chargeback ainda depende de `OPEN-016/017`, mas o sistema nunca libera compromisso por timeout ou edita crédito anterior.

### 14.4 Rebuild durante novas entradas

O rebuild usa uma fronteira consistente. Entradas posteriores são aplicadas depois; não podem desaparecer ou ser contadas duas vezes.

## 15. Consistência eventual

É esperado que a Wallet fique temporariamente atrás do PartnerLedger.

Durante esse período:

- a UI pode indicar atualização pendente;
- notificações não são autoridade;
- Withdrawal não pode confiar em saldo sem validação transacional aprovada;
- retry do crédito não cria nova entrada;
- Analytics não corrige a Wallet.

## 16. Idempotência e duplicidade

- crédito é único por `SplitShareId`;
- bloqueio é único por causa/escopo/versão;
- recuperação é única por par débito-crédito aplicado;
- classificação repetida na mesma fronteira não cria movimento;
- atualização de projeção pode ser repetida;
- mesmo Event reaplicado não muda o saldo duas vezes.

Mesma chave com conteúdo diferente é conflito e bloqueia o segundo efeito. Somente o prazo quantitativo de retenção das chaves permanece `OPEN-030`.

## 17. Retry

Retry de atualização:

- reaplica fatos na mesma ordem;
- não cria Ledger Entry;
- preserva fronteira;
- registra falha operacional quando necessário;
- pode reconstruir a projeção integralmente.

Retry de Withdrawal pertence ao Aggregate Withdrawal, não à Wallet.

## 18. Replay e rebuild

### Replay

Reapresenta Entries existentes. Deve resultar nos mesmos saldos sob suas políticas históricas.

### Rebuild integral

1. selecionar PartnerLedger e fronteira;
2. validar ordem e integridade;
3. iniciar saldos derivados em zero;
4. aplicar cada Entry uma única vez;
5. aplicar classificação/política histórica;
6. aplicar estados de PartnerAccount e Withdrawals;
7. validar não negatividade dos buckets que não admitem negativo;
8. comparar resultado;
9. publicar projeção apenas se completa.

### Divergência

Se rebuild divergir:

- não escrever ajuste no Ledger;
- não escolher o maior saldo;
- marcar a projeção como não confiável para decisão sensível;
- abrir reconciliação;
- preservar ambos os resultados para auditoria.

## 19. Resultado desconhecido

Se não for possível saber se uma Withdrawal foi executada:

- Wallet mantém principal e taxa em `ReservedForWithdrawal`;
- também não deve confirmar débito definitivo sem reconciliação;
- nova solicitação concorrente não usa o mesmo valor;
- o provider é reconciliado pela identidade da tentativa.

Confirmação posterior converte a reserva em débito; falha definitiva comprovada libera a reserva por novos fatos. Rebuild deve produzir a mesma classificação a partir da mesma sequência.

## 20. Auditoria

Cada saldo apresentado deve permitir explicar:

- valor total;
- fronteira de atualização;
- Ledger Entries componentes;
- políticas;
- bloqueios;
- maturações;
- Withdrawals;
- saldo negativo e recuperações;
- divergências/rebuilds.

## 21. Exemplos válidos

### Crédito ainda pendente

Settlement cria direito de R$20. Ledger registra R$20. Wallet mostra R$20 em Pending, quando a política assim determinar. Não há saque automático.

### Bloqueio

Um crédito é bloqueado por disputa. Ele migra de classificação sem desaparecer do Ledger e sem ser redistribuído.

### Recuperação

Partner possui NegativeBalance de R$30 e recebe novo crédito de R$50. R$30 são recuperados de forma rastreável; até R$20 seguem as regras de maturação.

## 22. Contraexemplos proibidos

- Wallet creditar diretamente um SplitShare.
- operador editar `AvailableBalance`.
- usar projeção atrasada para aprovar duas Withdrawals.
- apagar crédito bloqueado.
- redistribuir saldo de Partner bloqueado.
- esconder NegativeBalance reduzindo crédito histórico.
- tratar `Pending` como withdrawable.
- rebuild criar novo Ledger Entry.
- provider informar saldo e sobrescrever Wallet.

## 23. Decisões abertas

Aplicam-se `OPEN-002`, `OPEN-016` a `OPEN-020` e `OPEN-030` a `OPEN-032` da [PLATFORM_SPECIFICATION.md](../specification/PLATFORM_SPECIFICATION.md). Nenhuma dessas decisões reabre a autoridade do PartnerLedger, o estado inicial `PENDING` ou a reserva obrigatória para Withdrawal.
