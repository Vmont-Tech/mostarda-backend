# Payment Flow — Especificação de entrada de receita

## 1. Objetivo

Este documento especifica como uma obrigação comercial se transforma, ou deixa de se transformar, em capacidade financeira de execução.

O resultado normativo do fluxo não é “pagamento criado”. É uma resposta auditável para:

- a cobrança foi apenas solicitada, reconhecida ou efetivamente compensada?
- qual CampaignBudget pode receber o valor?
- qual parte do valor pertence ao orçamento e qual parte é taxa externa?
- o mesmo fato já foi aplicado?
- o que deve acontecer diante de atraso, duplicidade, disputa ou reversão?

## 2. Regra fundamental

Somente um fato confirmado de compensação pode aumentar `CampaignBudget.AvailableBudget`.

```text
Payment solicitado ≠ Payment recebido ≠ Payment compensado
Payment compensado → PaymentLedgerEntry
PaymentLedgerEntry → solicitação de aumento do CampaignBudget
CampaignBudget autorizado → AvailableBudget aumentado
```

O Event de compensação não modifica diretamente o CampaignBudget. Um consumidor autorizado emite novo Command ao owner do budget.

## 3. Por que “recebido” não é “disponível”

Uma cobrança reconhecida pode continuar:

- aguardando pagamento;
- em processamento;
- sujeita a falha;
- sujeita a expiração;
- contestada;
- não compensada.

Tratá-la como orçamento anteciparia um ativo que a Mostarda ainda não possui e permitiria execução sem lastro. Por isso, o fluxo distingue intenção, reconhecimento externo, compensação e disponibilidade interna.

Alternativa rejeitada: liberar todo o ContractValue na criação da cobrança. Isso converteria promessa contratual em crédito, transferiria risco de inadimplência para a rede e violaria a regra de não antecipação.

## 4. Participantes e owners

| Participante | Responsabilidade | Não responsabilidade |
| --- | --- | --- |
| Advertiser | cumprir a obrigação de pagamento pelo meio escolhido | declarar compensação |
| Campaign Management | manter intenção comercial e correlação com Campaign | calcular ou alterar saldo |
| Financial Platform | aplicar política, registrar fatos, creditar budget e reconciliar | escolher preço ou veiculação |
| Payment owner | decidir o lifecycle da cobrança e aceitar/rejeitar fatos externos | escrever no PaymentLedger ou alterar CampaignBudget |
| PaymentLedger owner | aceitar lançamentos financeiros por Command | interpretar callbacks ou alterar CampaignBudget |
| CampaignBudget owner | aceitar ou rejeitar aumento de saldo | consultar provider |
| Asaas | executar cobrança e comunicar fatos externos | autorizar execução de Campaign |
| Analytics/Notifications | projetar e informar | decidir estado financeiro |

`Payment` é o Aggregate owner do lifecycle. O adapter externo traduz a comunicação do provider em intenção/fato para o Payment; ele nunca escreve no PaymentLedger.

## 5. Conceitos

### 5.1 Payment obligation

Representa a obrigação de pagamento correlacionada a uma relação comercial. Não é saldo.

### 5.2 Charge

Representa uma instrução de cobrança ao provider, incluindo método e composição apresentada ao Advertiser. Uma obrigação pode exigir mais de uma tentativa de cobrança sem multiplicar o valor contratual.

### 5.3 Installment

É uma parcela individual cuja compensação possui identidade própria. Parcela futura não é crédito presumido.

### 5.4 PaymentLedgerEntry

É o fato interno append-only que reconhece valor compensado ou sua compensação posterior.

### 5.5 Budget allocation

É a correlação explícita entre um lançamento compensado e um `CampaignBudget`. Pagamento parcial usa somente o valor compensado/alocado; excedente e duplicata permanecem crédito do Advertiser. Nenhuma alocação pode ser inferida silenciosamente.

## 6. Valores que devem permanecer separados

Cada cobrança deve distinguir conceitualmente:

- valor contratado destinado à Campaign;
- taxa cobrada do Advertiser;
- valor bruto apresentado ao Advertiser;
- valor informado como compensado;
- impostos e retenções, quando aplicáveis;
- moeda;
- versão das políticas.

A contabilização gross/net, regras fiscais e precisão monetária seguem o Financial Decision Register.

Enquanto abertas:

- taxa de cartão não reduz `ContractValue` nem `AvailableBudget`;
- taxa não pode ser escondida dentro do saldo da Campaign;
- arredondamento não pode criar crédito sem origem;
- divergência de valores deve bloquear a aplicação automática e abrir reconciliação.

## 7. Lifecycle conceitual de Payment

| Estado | Significado | Pode aumentar budget? |
| --- | --- | --- |
| `CREATED` | obrigação/cobrança registrada internamente | não |
| `PENDING` | obrigação/cobrança criada, sem fato de recebimento | não |
| `RECEIVED` | provider reconheceu o pagamento, ainda sem compensação confirmada | não |
| `COMPENSATING` | provider indica processamento de compensação | não |
| `COMPENSATED` | compensação confirmada e reconhecida uma única vez | sim, por fluxo subsequente |
| `CANCELLED` | cobrança cancelada antes de crédito aplicável | não |
| `OVERDUE` | vencimento ultrapassado sem compensação | não |
| `DISPUTED` | pagamento sujeito a disputa | não cria novo crédito |
| `FAILED` | tentativa falhou sem compensação | não |

A eventual reversão posterior de um Payment compensado não apaga `COMPENSATED`; produz bloqueio e, após decisão autorizativa, fato compensatório.

`DISPUTED` representa exclusivamente o lifecycle financeiro do Payment. Financial publica esse fato e jamais conclui responsabilidade. Julgamento e eventual consequência baseada em culpa pertencem a Governance & Dispute Management.

## 8. Fluxo comum de compensação

### 8.1 Pré-condições

- existe correlação comercial identificável;
- método de pagamento é permitido pela `PaymentPolicyVersion`;
- valor, moeda e composição da cobrança estão declarados;
- a identidade externa ainda não foi usada para efeito incompatível;
- há autorização para registrar a cobrança/fato;
- a política capturada está vigente no instante da decisão.

### 8.2 Sequência

1. Financial Platform registra a obrigação ou reconhece sua existência.
2. Financial Platform solicita uma cobrança externa com identidade idempotente.
3. O provider aceita ou rejeita a instrução.
4. Fatos externos chegam uma ou mais vezes e possivelmente fora de ordem.
5. O owner do Payment valida origem, identidade, relação causal e transição.
6. Um fato `RECEIVED` ou `COMPENSATING` atualiza somente o lifecycle próprio.
7. Somente a confirmação válida de compensação registra o fato `COMPENSATED`.
8. Um consumidor autorizado emite `PostPaymentLedgerEntry` ao PaymentLedger.
9. O `PaymentLedger` cria uma única entrada correlacionada e publica seu Event.
10. Outro consumidor autorizado solicita `IncreaseCampaignBudget`.
11. O CampaignBudget valida identidade, valor, moeda e correlação.
12. Se aceito, aumenta `AvailableBudget` e publica sua própria decisão.
13. Campaign Management pode reagir ao novo budget, mas deve revalidar outros motivos de pausa.

### 8.3 Pós-condições

- existe trilha causal completa da cobrança ao budget;
- o valor compensado foi aplicado no máximo uma vez;
- taxas permanecem separadas do orçamento;
- nenhuma Campaign foi alterada diretamente pelo Payment;
- duplicatas futuras podem recuperar o resultado anterior.

## 9. Fluxo PIX

### 9.1 Caso feliz

1. É criada cobrança PIX correlacionada à obrigação.
2. O Advertiser realiza o pagamento.
3. O provider comunica reconhecimento e/ou compensação.
4. Eventos intermediários podem existir, mas não liberam budget.
5. A compensação confirmada cria o lançamento e inicia o aumento do CampaignBudget.

### 9.2 Expiração sem pagamento

Uma cobrança PIX expirada:

- não aumenta budget;
- preserva histórico;
- pode permitir nova cobrança sob nova identidade;
- não transforma a nova cobrança em novo contrato;
- não apaga a cobrança anterior.

O prazo quantitativo de expiração é política e permanece sujeito às decisões abertas de TTL/SLA (`OPEN-031`).

### 9.3 Duplicidade

Duas notificações da mesma compensação representam um fato. A segunda deve produzir “já aplicado”, não novo crédito.

### 9.4 Evento tardio

Se uma confirmação válida chega depois de a cobrança ter sido observada como expirada/cancelada ou disputada, o Payment não pode ignorá-la nem aplicá-la cegamente. Ele registra a ocorrência para auditoria e abre reconciliação; saldo não é liberado automaticamente.

## 10. Fluxo de boleto

### 10.1 Caso feliz

1. É criada cobrança com vencimento explícito.
2. Antes da compensação, o estado permanece não financiado.
3. Reconhecimento de pagamento não basta se ainda houver compensação pendente.
4. Compensação confirmada cria um único lançamento.
5. O CampaignBudget é aumentado somente pelo valor destinado à Campaign.

### 10.2 Atraso

`OVERDUE` significa ausência de compensação no marco de vencimento observado. Não autoriza:

- consumir ContractValue;
- presumir multa ou juros;
- pausar ou cancelar definitivamente a Campaign sem regra do owner;
- rejeitar uma confirmação tardia sem reconciliação.

Juros, multa e tratamento fiscal, se aprovados, devem ser linhas explícitas. Não estão definidos nesta versão.

### 10.3 Boleto pago em duplicidade ou a maior

A alocação de pagamento duplicado/excedente segue `LIA_ADVERTISER_CREDIT`. É proibido:

- aumentar automaticamente o mesmo budget duas vezes;
- distribuir excedente entre Campaigns por heurística;
- tratar o excedente como receita livre;
- devolver valor sem uma decisão financeira auditada.

O valor deve permanecer identificado e reconciliável até decisão normativa.

## 11. Fluxo de cartão

### 11.1 Composição obrigatória

Para uma Campaign de R$100 e taxa externa exemplificativa de R$4,80:

```text
ContractValue destinado à Campaign: R$100,00
Taxa cobrada do Advertiser:          R$  4,80
Total apresentado/cobrado:           R$104,80
Máximo de budget originado:          R$100,00
```

O valor da taxa acima é apenas exemplo histórico da regra; taxas efetivas pertencem à política aplicável. A taxa nunca reduz os R$100 destinados à Campaign.

### 11.2 Caso feliz à vista

1. A cobrança discrimina orçamento e taxa.
2. O provider processa a autorização/captura segundo seu domínio externo.
3. Financial Platform não equipara autorização a compensação.
4. Somente fato de compensação reconhecido gera lançamento.
5. O lançamento aplicável aumenta o budget sem incluir a taxa.

### 11.3 Falha

Autorização negada, captura falha ou compensação não confirmada:

- não gera AvailableBudget;
- preserva a tentativa;
- permite nova tentativa sob identidade própria;
- não altera ContractValue;
- não produz crédito parcial sem fato correspondente.

### 11.4 Chargeback

Chargeback posterior nunca apaga:

- PaymentLedgerEntry original;
- budget já creditado;
- Evidence já criada;
- Settlement ou SplitShare;
- PartnerLedgerCredit.

Ele gera fatos correlacionados e bloqueio cautelar. A perda só é alocada após `ResponsibilityDecisionPublished`. Até a decisão:

- não reescrever histórico;
- não redistribuir perda silenciosamente;
- não criar débito em participante por suposição;
- bloquear automação que exija regra ainda não aprovada;
- preservar valor afetado e cadeia causal para reconciliação.

## 12. Parcelamento

### 12.1 Regra

A Mostarda não antecipa recebíveis.

Para ContractValue de R$1.200 em 12 parcelas econômicas de R$100:

- antes da primeira compensação: R$0 financiado;
- após uma parcela compensada: até R$100 pode ser creditado;
- após duas: até R$200 acumulados, menos reservas/consumos;
- parcelas futuras: R$0 de disponibilidade até sua própria compensação.

Taxas associadas continuam separadas.

### 12.2 Independência das parcelas

Cada parcela:

- possui identidade;
- possui lifecycle;
- pode compensar, atrasar, falhar ou ser contestada;
- origina no máximo um lançamento positivo;
- não herda automaticamente o estado de outra.

### 12.3 Esgotamento entre parcelas

Quando o AvailableBudget se esgota, o CampaignBudget publica o fato correspondente. Campaign Management decide a consequência sobre o lifecycle da Campaign.

Nova parcela compensada remove somente a causa financeira. Campaign retoma automaticamente quando, após revalidar seus gates, nenhuma outra causa de pausa permanecer.

## 13. Pagamentos parciais

Pagamento menor que a obrigação libera somente o valor compensado e explicitamente alocado.

Invariantes enquanto aberta:

- somente a parte efetivamente compensada pode ser considerada;
- o sistema não completa o valor por crédito implícito;
- a diferença continua identificável;
- aplicar o parcial a uma ou mais Campaigns exige decisão explícita;
- nenhuma alocação pode ultrapassar o lançamento de origem.

## 14. Cancelamento antes da compensação

Cancelamento válido:

- encerra ou marca a tentativa conforme lifecycle;
- não gera lançamento positivo;
- não reduz budget que nunca aumentou;
- não apaga fatos anteriores;
- não invalida outra cobrança com identidade distinta.

Se cancelamento e compensação forem observados concorrentemente, o owner deve reconciliar pela ordem efetiva e validade dos fatos. Nunca deve aceitar os dois como comandos independentes que se anulam por mutação.

## 15. Estorno, refund e disputa após compensação

São operações compensatórias, não edição do passado.

Quando refund, perda ou recovery decorrer de julgamento de responsabilidade, o Command financeiro exige `governanceCaseId + decisionId + decisionRevision`. Um chargeback isolado não autoriza Financial a escolher quem absorve a perda.

O fluxo mínimo é:

1. reconhecer fato externo com identidade própria;
2. correlacionar ao Payment e ao Ledger Entry original;
3. impedir aplicação duplicada;
4. registrar novo lançamento ou estado de disputa;
5. emitir Events próprios;
6. aplicar somente política aprovada aos saldos derivados;
7. preservar a necessidade de reconciliação se os valores já foram consumidos.

Detalhes de alocação seguem o owner indicado por `ResponsibleParty` e o Financial Decision Register.

## 16. Falhas distribuídas

### 16.1 Provider indisponível ao criar cobrança

A obrigação interna permanece; cobrança externa não é presumida. Retry reutiliza a identidade da mesma intenção quando isso for semanticamente a mesma tentativa.

### 16.2 Confirmação recebida, Event interno não propagado

O Payment/PaymentLedger permanece correto. A propagação pode ser refeita. O CampaignBudget não deve ser alterado por operador sem Command causal.

### 16.3 Budget creditado, resposta ao consumidor perdida

Retry do mesmo `IncreaseCampaignBudget` retorna o efeito existente. Não cria novo incremento.

### 16.4 Eventos fora de ordem

Um `PaymentCompensated` válido pode chegar antes de projeções intermediárias. O owner usa o lifecycle autorizado e fatos causais; consumidores não inventam estados faltantes.

### 16.5 Resultado externo ambíguo

Ausência de resposta não equivale a falha. O sistema entra em reconciliação e consulta/aguarda fato autoritativo antes de repetir uma operação capaz de cobrar novamente.

## 17. Concorrência

### 17.1 Duas confirmações

Mesmo fato externo, mesma identidade: um lançamento.

### 17.2 Duas alocações

Um lançamento não pode financiar duas Campaigns além de seu valor. Cada alocação multi-Campaign possui identidade e valor explícitos; heurística é proibida.

### 17.3 Compensação e chargeback simultâneos

Ambos são fatos preservados e ordenados segundo sua causalidade. O resultado é obtido por lançamentos, não por “última escrita vence”.

### 17.4 Atualização de política durante cobrança

A cobrança e cada decisão registram a versão aplicável. Uma nova política não altera retroativamente composição ou elegibilidade já decidida.

## 18. Idempotência

Cada etapa possui escopo próprio:

| Etapa | Identidade de negócio mínima |
| --- | --- |
| criar/reconhecer cobrança | obrigação + tentativa |
| reconhecer fato externo | provider + referência + tipo de ocorrência |
| compensar Payment | Payment + ocorrência de compensação |
| criar PaymentLedgerEntry | fato compensado |
| aumentar CampaignBudget | Ledger Entry + budget alvo |
| compensar lançamento | lançamento original + tipo/motivo |

Uma chave não deve ser reutilizada para significados diferentes. O tratamento normativo de chave igual com payload divergente permanece `OPEN-030`; segundo efeito silencioso é sempre proibido.

## 19. Ordering

Ordering é exigido por entidade causal, não globalmente.

- fatos do mesmo Payment devem ser avaliados contra seu lifecycle;
- lançamentos do mesmo Ledger devem possuir ordem determinística;
- aumentos do mesmo CampaignBudget devem ser decididos pelo owner;
- um Event posterior não pode exigir que consumidor altere um fato anterior;
- timestamps externos ajudam auditoria, mas não substituem a ordem aceita pelo Aggregate.

## 20. Retry e timeout

Retry:

- reutiliza a identidade quando repete a mesma intenção;
- cria nova tentativa identificada quando a intenção anterior terminou;
- nunca muda valor ou destino silenciosamente;
- registra quantidade, causa e resultado;
- para diante de rejeição permanente ou conflito semântico;
- não transforma timeout em confirmação.

Valores quantitativos de timeout, backoff, validade e número máximo permanecem `OPEN-005/031`.

## 21. Auditoria

Cada fluxo deve permitir reconstruir:

- quem originou a obrigação;
- qual Campaign e contrato foram correlacionados;
- qual cobrança e tentativa foram criadas;
- método, valores, taxa e moeda;
- referências e estados externos;
- quando cada fato foi observado;
- qual política decidiu cada etapa;
- qual Ledger Entry foi criado;
- qual CampaignBudget recebeu o crédito;
- quais duplicatas foram ignoradas;
- quais divergências exigiram reconciliação;
- quais compensações foram posteriores.

## 22. Exemplos válidos

### Exemplo A — PIX duplicado

O provider entrega três vezes a mesma confirmação. Um PaymentLedgerEntry é criado. Um incremento de budget é aceito. As demais entregas recuperam os resultados anteriores.

### Exemplo B — duas parcelas, uma compensada

Uma cobrança possui duas parcelas. A primeira compensou e a segunda está pendente. Apenas o valor destinado à primeira pode aumentar budget.

### Exemplo C — pagamento reconhecido sem compensação

O provider comunica recebimento, mas ainda não compensação. O Payment pode avançar no lifecycle; AvailableBudget não muda.

## 23. Casos inválidos

- liberar budget na criação da cobrança;
- usar autorização de cartão como compensação sem fato aprovado;
- incluir taxa de cartão no AvailableBudget;
- consumir parcela futura;
- duplicar Ledger Entry por webhook repetido;
- alocar excedente por ordem de chegada das Campaigns;
- apagar lançamento diante de chargeback;
- tratar timeout como falha definitiva e cobrar novamente;
- reativar Campaign ignorando outro motivo de pausa;
- permitir que Asaas escreva diretamente no CampaignBudget.

## 24. Decisões abertas aplicáveis

Este fluxo permanece condicionado a `OPEN-005`, `OPEN-030` e `OPEN-031`. As decisões financeiras foram encerradas por `DEC-043`.
