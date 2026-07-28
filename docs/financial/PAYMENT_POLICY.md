# Payment Policy — Especificação normativa

## 1. Propósito

`PaymentPolicy` define as regras pelas quais a Mostarda reconhece e trata uma obrigação de pagamento, sem delegar decisões de domínio ao provider.

Ela existe para que:

- formas de pagamento possam evoluir sem alterar Campaign;
- troca de provider não mude o significado de compensação;
- taxas, parcelamento e inadimplência sejam decisões explícitas;
- cada Payment preserve a regra que o governou;
- reprocessamento não aplique política nova a fatos antigos.

## 2. Owner e fronteira

`FinancialPolicy`/`PaymentPolicy` pertencem ao Financial Platform.

O provider:

- executa cobrança;
- atribui referências externas;
- comunica fatos observados;
- não decide quando uma Campaign pode consumir budget;
- não define `ContractValue`;
- não escolhe como um pagamento é alocado;
- não altera Ledger ou budget.

Campaign Management:

- declara/correlaciona a obrigação comercial;
- não interpreta status do provider;
- não calcula taxa;
- não transforma Payment em AvailableBudget.

## 3. Formas aprovadas

As formas iniciais são:

- PIX;
- boleto;
- cartão.

Assinaturas são possibilidade futura, não comportamento aprovado atual. Sua introdução exige versão de política e especificação do lifecycle recorrente.

## 4. Estrutura conceitual da política

Cada versão deve poder declarar:

- identificador e versão;
- vigência;
- métodos permitidos;
- estados externos reconhecíveis e seu significado interno;
- composição de cobrança por método;
- regras de parcelamento;
- regras de compensação;
- expiração e atraso;
- retry permitido;
- tratamento de cancelamento, disputa, refund e chargeback;
- requisitos de reconciliação;
- moedas admitidas;
- requisitos de auditoria;
- ator que aprovou a versão;
- decisão/ADR de origem.

Parâmetros ainda não aprovados permanecem ausentes, e não recebem defaults de implementação.

## 5. Regras não negociáveis

1. Apenas compensação confirmada pode originar aumento de CampaignBudget.
2. `RECEIVED`, `PENDING` e `COMPENSATING` não são sinônimos de `COMPENSATED`.
3. Taxa de cartão é adicionada à obrigação do Advertiser e fica fora de ContractValue/AvailableBudget.
4. Não há antecipação de recebíveis.
5. Cada parcela aumenta budget apenas após sua própria compensação.
6. Falha, atraso, cancelamento ou disputa sem compensação não aumenta budget.
7. Fato posterior a uma compensação é representado por novo registro/lançamento.
8. PaymentPolicy nunca altera Evidence, Settlement ou SplitShare.
9. Cada decisão captura a versão da política.
10. Política nova nunca reinterpreta fato histórico.

## 6. Seleção de política

Uma decisão usa a versão vigente segundo o marco temporal aprovado para a operação.

O marco exato entre criação de obrigação, criação de cobrança e processamento de cada fato deve ser declarado pela versão. Se não estiver declarado, a operação dependente deve permanecer `OPEN`, em vez de selecionar uma versão por conveniência.

Uma política não pode:

- retroagir;
- ser substituída silenciosamente durante retry;
- perder sua referência após expiração;
- aplicar regra de outro método;
- aceitar método não declarado.

## 7. Compensação

Uma confirmação é elegível para reconhecimento somente quando:

- a origem externa é autenticável;
- existe referência externa correlacionável;
- método, valor e moeda são compatíveis;
- o fato ainda não produziu efeito;
- a transição é válida;
- não há divergência material que exija reconciliação;
- a política aplicável reconhece o fato como compensação.

O Financial Platform não deve inferir compensação:

- pela passagem do tempo;
- pela emissão de recibo local;
- por status ambíguo;
- pela existência de autorização de cartão;
- por notificação sem identidade;
- por saldo informado em uma projeção externa.

## 8. Taxas

### 8.1 Cartão

A taxa é encargo adicional do Advertiser. Deve ser distinguível do valor destinado à Campaign.

Para todo método, `CheckoutTotal = RequestedCampaignBudget + PaymentMethodFees + IssuanceFees + ApplicableTaxes`. Após compensação, somente `RequestedCampaignBudget` aumenta AvailableBudget. A Mostarda não absorve taxa e o Advertiser não recebe budget inferior ao solicitado.

### 8.2 Outros métodos

Valores efetivos de PIX/boleto pertencem à versão da política/provedor, mas são sempre adicionais e discriminados. Boleto somente aporta saldo antecipado; nunca cria hold de inventário.

### 8.3 Regras gerais

- taxa não pode ser escondida em AvailableBudget;
- taxa não pode alterar preço de Slot;
- taxa não pode alterar split;
- taxa deve preservar versão e origem;
- reconhecimento contábil, gross/net e tratamento tributário seguem o Financial Decision Register.

## 9. Parcelamento

Cada parcela é unidade independente de compensação.

A política deve impedir:

- liberar valor total na primeira autorização;
- consumir parcela futura;
- transportar saldo entre parcelas sem lançamento;
- ignorar disputa de uma parcela;
- usar antecipação do provider como antecipação concedida pela Mostarda.

Se um provider adiantar recursos por relação externa, isso não altera automaticamente a política de budget. Qualquer mudança exigiria decisão arquitetural.

## 10. Pagamento parcial, excedente e duplicado

A regra completa de parcial/excedente/duplicidade está em `DEC-043`.

Contrato mínimo enquanto aberta:

- identificar o valor sem perda;
- não aplicar além do compensado;
- não duplicar aplicação;
- não escolher Campaign destino por heurística;
- não converter excedente em crédito livre;
- não realizar devolução automática sem regra;
- abrir reconciliação auditável.

## 11. Overdue e inadimplência

`OVERDUE` registra que o marco de vencimento passou sem compensação reconhecida.

Ele não significa, por si:

- cancelamento de Campaign;
- perda definitiva da obrigação;
- autorização para multa/juros;
- baixa contábil;
- proibição de reconhecer pagamento tardio;
- alteração de ContractValue.

Qualquer consequência além do estado financeiro deve ser solicitada ao owner correspondente.

## 12. Cancelamento

Cancelamento de cobrança antes da compensação:

- não cria orçamento;
- preserva histórico;
- não cancela automaticamente o contrato;
- não impede nova tentativa válida;
- não pode ser usado para apagar uma compensação já reconhecida.

Cancelamento de Campaign não apaga Payment. O tratamento de valores já compensados segue política financeira própria.

## 13. Disputa, refund e chargeback

Depois de compensação, nenhuma reversão edita o lançamento original.

O Financial Platform deve:

1. reconhecer o novo fato;
2. correlacioná-lo à origem;
3. verificar duplicidade;
4. registrar decisão append-only;
5. publicar Event próprio;
6. aplicar compensação somente conforme política aprovada.

Alocação de perdas exige `ResponsibilityDecisionPublished` e Command do owner financeiro correspondente.

## 14. Retry

Retry repete a mesma intenção somente quando:

- a operação anterior não possui resultado definitivo incompatível;
- a identidade original é preservada;
- valor, moeda, destino e política são os mesmos;
- o retry é permitido;
- não há indicação de que repetir possa cobrar duas vezes sem reconciliação.

Nova intenção exige nova tentativa identificada e correlação com a anterior.

Quantidade, intervalos e timeouts permanecem `OPEN-031`.

## 15. Idempotência

Política exige identidade idempotente em qualquer operação capaz de:

- criar cobrança;
- reconhecer compensação;
- criar Ledger Entry;
- aumentar budget;
- criar compensação.

Mesma identidade e mesmo conteúdo: retornar resultado existente.

Mesma identidade e conteúdo divergente: jamais aplicar novo efeito silencioso. A classificação final desse conflito permanece `OPEN-030`.

## 16. Concorrência

### Compensação versus cancelamento

Ambos são avaliados segundo causalidade, estado e política. “Última notificação vence” é proibido.

### Compensação versus chargeback

São dois fatos, não estados que se sobrescrevem. Ambos permanecem no histórico.

### Duas compensações

Se representam o mesmo fato, uma produz efeito. Se são pagamentos realmente distintos, cada uma exige identidade e alocação próprias.

### Alteração de política

Operação em curso não troca de versão silenciosamente.

## 17. Autorização

Política distingue:

- Partner/Advertiser originando uma intenção permitida;
- Financial Platform tomando decisão;
- provider comunicando fato;
- operador reconciliando exceção;
- administrador publicando nova versão.

Todos são auditáveis. A matriz completa e segregação de funções permanecem `OPEN-002/032`.

## 18. Auditoria

Cada decisão registra:

- política e versão;
- método;
- valores e moeda;
- composição da cobrança;
- identidade externa;
- estado anterior e novo estado;
- ator/origem;
- idempotency key;
- correlação/causação;
- motivo;
- divergências;
- compensações;
- Events resultantes.

## 19. Exemplos

### Válido

Cartão para Campaign de R$100 com taxa aplicável de R$4,80: Advertiser é cobrado em R$104,80; somente R$100 podem originar budget após compensação.

### Válido

Parcela 1 compensou; parcela 2 está pendente. Somente a primeira pode gerar lançamento positivo.

### Inválido

Liberar o total parcelado porque o provider aprovou a transação.

### Inválido

Aplicar a política de taxa atual a uma cobrança criada e decidida sob versão anterior.

## 20. Decisões abertas

Detalhes quantitativos ou contábeis não aprovados são regidos por `OPEN-005`, `OPEN-006`, `OPEN-016` a `OPEN-019`, `OPEN-025`, `OPEN-030` e `OPEN-031` da [PLATFORM_SPECIFICATION.md](../specification/PLATFORM_SPECIFICATION.md).
