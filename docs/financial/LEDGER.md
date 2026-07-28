# Financial Ledger — Especificação normativa

## 1. Propósito

O Financial Ledger é o registro oficial, append-only e causal dos fatos monetários reconhecidos pela Mostarda.

Ele existe para responder:

- de onde surgiu cada valor;
- por qual decisão ele entrou, saiu, foi bloqueado ou compensado;
- qual política estava vigente;
- qual fato anterior uma correção compensa;
- como um saldo pode ser reconstruído sem confiar em campos editáveis.

Um Ledger não é apenas um extrato de provider. O extrato externo informa o que o executor observou; o Ledger registra o significado aceito pelo domínio Mostarda.

## 2. Por que append-only

Editar ou apagar um lançamento destruiria:

- causalidade;
- capacidade de auditoria;
- idempotência;
- explicação de saldo;
- reconstrução histórica;
- prova de que uma correção ocorreu depois do fato original.

Por isso, erro, refund, chargeback, taxa, falha e recuperação são novos lançamentos correlacionados. O lançamento original permanece verdadeiro como registro do que foi reconhecido naquele instante.

Alternativa rejeitada: atualizar o valor ou status do lançamento anterior. Essa abordagem faz o passado mudar, impede conciliação temporal e permite que saldos iguais escondam histórias economicamente diferentes.

## 3. Livros oficiais

### 3.1 PaymentLedger

Registra a entrada de valores de Advertisers e as compensações posteriores relacionadas.

Seu lançamento positivo elegível pode causar uma solicitação de aumento de `CampaignBudget`. Ele não modifica o budget diretamente.

### 3.2 PartnerLedger

Registra:

- créditos originados em direitos de `SplitShare`;
- disponibilização/bloqueio quando modelados por lançamento/política;
- reservas vinculadas a Withdrawal, conforme decisão pendente;
- débito de saque;
- taxa de saque;
- chargeback;
- recuperação de saldo negativo;
- ajustes compensatórios explicitamente autorizados.

O PartnerLedger não recalcula o split e não cria direito sem `SplitShare` imutável.

## 4. Fonte de verdade e projeções

Ledger é fonte de fatos financeiros.

São derivadas e reconstruíveis:

- saldos de PartnerWallet;
- relatórios;
- extratos apresentados;
- totais por Campaign;
- visões de conciliação;
- métricas.

Nenhuma projeção pode gerar lançamento para “fazer o Ledger bater”. A divergência é um diagnóstico que deve ser investigado.

## 5. Owner

Cada Ledger possui owner dentro do Financial Platform. O owner:

- valida a origem do fato;
- verifica autorização;
- verifica unicidade;
- aplica política;
- aceita ou rejeita o lançamento;
- atribui ordem autorizada;
- publica Event.

Consumidores não inserem lançamentos diretamente. Eles emitem Commands ao owner.

## 6. Estrutura conceitual de Ledger Entry

Todo lançamento deve conter, quando aplicável:

- `ledgerEntryId`;
- livro e conta lógica;
- tipo do lançamento;
- direção econômica;
- valor e moeda;
- origem e destino;
- motivo;
- identidade do fato de negócio;
- Campaign, Partner, Payment, Settlement, SplitShare e EvidenceRecord correlacionáveis;
- `correlationId`;
- `causationId`;
- idempotency key;
- política e versão;
- referência do provider;
- lançamento original compensado;
- ator/emissor;
- instante efetivo informado;
- instante de observação;
- ordem autorizada;
- integridade/hash;
- metadados mínimos de auditoria.

Campos não aplicáveis permanecem ausentes de forma explícita; não recebem valores fictícios.

## 7. Tipos conceituais de lançamento

| Livro | Tipo | Origem obrigatória | Efeito conceitual |
| --- | --- | --- | --- |
| PaymentLedger | crédito compensado | fato de Payment compensado | reconhece valor aplicável a budget |
| PaymentLedger | compensação/reversão | lançamento compensado + fato posterior | reconhece redução/correção sem apagar origem |
| PartnerLedger | crédito de direito | `SplitShareId` | reconhece direito único do Partner |
| PartnerLedger | débito de Withdrawal | Withdrawal executada/reconciliada | reconhece saída |
| PartnerLedger | taxa de Withdrawal | política + Withdrawal | reconhece taxa Mostarda |
| PartnerLedger | bloqueio/desbloqueio | decisão de política | reclassifica disponibilidade sem perder origem |
| PartnerLedger | chargeback/recuperação | fato financeiro + origem | reconhece obrigação compensatória |
| PartnerLedger | recuperação de negativo | novo crédito + saldo negativo | aplica ordem normativa sem editar créditos |

O modelo contábil definitivo é de dupla entrada multilinhas conforme [FINANCIAL_DECISION_REGISTER.md](./FINANCIAL_DECISION_REGISTER.md); toda transação exige débitos iguais a créditos.

## 8. Invariantes de lançamento

1. Todo lançamento possui uma causa identificável.
2. Um fato de negócio origina no máximo um lançamento de cada efeito semântico.
3. Valor zero ou negativo não é aceito como valor de lançamento; direção/tipo expressa o efeito.
4. Moeda é explícita.
5. Não há conversão implícita de moeda.
6. Um lançamento aceito nunca é alterado ou apagado.
7. Compensação referencia o lançamento/fato que corrige.
8. Soma e saldo são derivados de lançamentos aceitos em ordem autorizada.
9. Taxa é lançamento separado, não desconto invisível.
10. Provider reference não substitui a identidade interna.
11. Ledger não aceita direito sem owner de origem.
12. Replay não cria cópia.

Precisão e arredondamento seguem BRL `DECIMAL(18,4)`, Half-Even para operação individual e Hamilton-Hare para split 1:N.

## 9. Aceitação de PaymentLedgerEntry

### Pré-condições

- fato de compensação é reconhecido pelo owner competente;
- referência externa é válida e correlacionada;
- valor/moeda são conhecidos;
- aplicação não ocorreu;
- política aplicável foi capturada;
- divergências materiais foram resolvidas ou bloqueiam automação.

### Efeitos

- cria lançamento imutável;
- publica `PaymentLedgerEntryRecorded`;
- habilita consumidor a solicitar incremento do budget;
- não altera CampaignBudget.

### Rejeições

- duplicidade;
- origem desconhecida;
- valor divergente;
- moeda incompatível;
- fato não compensado;
- transição inválida;
- política ausente;
- conflito de idempotência.

## 10. Aceitação de PartnerLedgerCredit

### Pré-condições

- `SplitShare` pertence a Settlement encerrado/autorizado conforme contrato;
- direito está imutável e elegível para materialização;
- Partner e valor estão identificados;
- `splitShareId` ainda não originou crédito;
- versões de split/settlement estão presentes;
- emissor é autorizado.

### Efeitos

- cria crédito único;
- publica `PartnerCredited`;
- não marca o valor como sacável por suposição;
- permite que Wallet derive nova posição.

### Rejeições

- share duplicada;
- Partner divergente;
- valor divergente;
- share bloqueada/não elegível;
- política ausente;
- origem mutável ou incompleta.

## 11. Compensações

Uma compensação:

- é novo lançamento;
- possui sua própria identidade;
- referencia a origem;
- explica motivo;
- não altera a validade histórica da origem;
- não pode superar ou redistribuir valor sem política;
- publica Event próprio;
- participa do saldo somente conforme o modelo aprovado.

Chargeback/refund e recovery seguem os owners e a decisão de Governance definidos no Financial Decision Register.

## 12. Saldo negativo

Quando débitos compensatórios excedem créditos aplicáveis, o Partner pode possuir `NegativeBalance`.

Regras aprovadas:

- negativo não apaga direitos;
- crédito futuro recupera negativo antes de se tornar withdrawable;
- recuperação é explicável por lançamentos;
- Partner não saca enquanto o valor elegível está absorvido pelo negativo;
- histórico mostra origem do débito e créditos usados na recuperação.

A alocação de responsabilidade decorre exclusivamente de `ResponsibilityDecisionPublished`; Financial não escolhe responsável.

## 13. Ordering

Ordering é obrigatório dentro de cada livro/conta lógica relevante.

Ele deve garantir que:

- compensação não anteceda logicamente a origem que referencia;
- saldo derivado use sequência determinística;
- duas decisões concorrentes sejam posicionadas sem “última escrita vence”;
- timestamps externos não sejam a única autoridade de ordem;
- eventos atrasados sejam incorporados como fatos tardios, sem reescrever a sequência já aceita.

Não existe requisito de ordem global entre todos os Ledgers.

## 14. Concorrência

### Mesmo SplitShare

Duas solicitações de crédito: somente uma entrada.

### Mesmo Payment

Duas notificações da mesma compensação: somente um crédito.

### Crédito e débito concorrentes

O owner ordena as decisões. Saldo derivado reflete ambas. Uma projeção intermediária pode estar atrasada, mas não decide o resultado.

### Chargeback e Withdrawal

Se concorrem, ambos são fatos preservados. A política de bloqueio/alocação ainda depende de `OPEN-016/017/022`; até lá, nenhuma ordem pode ser escolhida para favorecer silenciosamente uma saída.

## 15. Idempotência

Chaves mínimas:

- Payment credit: fato de compensação;
- Partner credit: `SplitShareId`;
- Withdrawal debit: `WithdrawalId` + efeito reconciliado;
- fee: `WithdrawalId` + `WithdrawalPolicyVersion` + efeito;
- compensação: entrada original + fato compensatório;
- recuperação: débito negativo + crédito aplicado.

Mesmo fato e mesmo payload recuperam a entrada existente. Mesma chave e conteúdo divergente bloqueiam o segundo efeito; classificação final permanece `OPEN-030`.

## 16. Consistência eventual

É válido que:

- Ledger contenha crédito antes de budget;
- PartnerLedger contenha crédito antes da Wallet;
- Withdrawal externa esteja confirmada antes do débito reconciliado;
- relatório esteja atrasado.

Não é válido:

- criar segundo lançamento para “acelerar” projeção;
- alterar saldo projetado sem fonte;
- considerar ausência temporária na projeção como ausência no Ledger;
- usar Analytics para autorizar saque.

## 17. Retry e resultado desconhecido

Retry de Command:

- preserva identidade;
- retorna entrada já aceita;
- não cria nova ordem econômica;
- registra nova tentativa operacional quando relevante.

Resultado desconhecido:

- não é sucesso nem falha;
- impede emissão de efeito externo duplicado;
- exige reconciliação pela referência;
- preserva a tentativa;
- publica diagnóstico quando necessário.

Timeouts quantitativos permanecem `OPEN-031`.

## 18. Replay e reidratação

Reidratar um Ledger significa reproduzir a sequência de entradas aceitas, não reexecutar cobranças ou transferências.

Invariantes:

- replay é side-effect free fora da reconstrução;
- a mesma sequência produz o mesmo saldo;
- políticas históricas permanecem vinculadas;
- entradas duplicadas são detectáveis;
- lacunas de ordem interrompem publicação de saldo definitivo;
- compensações permanecem separadas.

## 19. Rebuild de projeções

PartnerWallet e relatórios devem ser reconstruíveis a partir do Ledger.

O rebuild:

1. seleciona uma fronteira consistente do histórico;
2. aplica entradas em ordem;
3. aplica as versões históricas relevantes;
4. calcula saldos derivados;
5. valida invariantes;
6. compara com projeção anterior;
7. publica/substitui a projeção somente após conclusão integral;
8. registra divergências e a versão do rebuild.

Rebuild parcial não pode ser apresentado como saldo definitivo.

## 20. Reconciliação externa

Reconciliação compara:

- instruções emitidas;
- fatos comunicados pelo provider;
- referências externas;
- lançamentos internos;
- efeitos derivados.

Possíveis resultados:

- `MATCHED`: sem divergência;
- `MISSING_INTERNAL_FACT`: fato externo válido ainda não reconhecido;
- `MISSING_EXTERNAL_FACT`: instrução sem confirmação;
- `VALUE_MISMATCH`;
- `DUPLICATE_EXTERNAL_FACT`;
- `UNKNOWN_REFERENCE`;
- `POLICY_CONFLICT`.

Esses resultados são diagnósticos conceituais; não prescrevem uma máquina final ainda não aprovada. Divergência nunca autoriza edição direta do Ledger.

## 21. Auditoria

Deve ser possível partir de qualquer saldo e navegar até:

- lançamentos componentes;
- fatos originadores;
- Commands;
- atores;
- políticas;
- Events;
- tentativas externas;
- compensações;
- decisões de reconciliação.

## 22. Exemplos

### Crédito idempotente

O `SplitShare S-10` de R$20 gera `PartnerLedgerEntry P-1`. Reentrega do direito retorna P-1; não gera P-2.

### Chargeback

Um crédito histórico permanece. Um novo lançamento compensatório registra a perda e pode gerar NegativeBalance. O crédito não é editado para zero.

### Rebuild

A Wallet é perdida/corrompida. Ela é recalculada do PartnerLedger. Nenhum novo crédito é publicado.

## 23. Contraexemplos proibidos

- usar saldo do Asaas como Ledger da Mostarda;
- editar valor de entrada;
- criar crédito manual sem causa;
- registrar taxa como redução invisível;
- duplicar crédito por replay;
- ordenar por timestamp externo apenas;
- reconstruir Wallet e escrever “ajuste” no Ledger para igualar;
- apagar débito após recuperação;
- criar PaymentLedgerEntry em `PaymentReceived`.

## 24. Decisões abertas

O modelo respeita o Financial Decision Register e permanece condicionado somente às OPENs ainda listadas na Platform Specification.

## 25. JournalTransaction normativa

Todo fato monetário reconhecido cria uma `JournalTransaction` append-only com uma ou mais `JournalLine`. Cada linha possui conta, natureza débito/crédito, valor BRL em quatro casas e dimensões causais. A transação é rejeitada quando não fecha, mistura moedas, repete causa/finalidade ou usa conta incompatível.

Rebuild e replay nunca geram nova transação.
