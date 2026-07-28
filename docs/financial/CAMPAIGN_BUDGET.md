# Campaign Budget — Especificação normativa

## 1. Propósito

`CampaignBudget` representa a capacidade financeira autorizada para execução de uma Campaign.

Ele existe para impedir que Campaign, Pricing, Slot ou provider interpretem promessa comercial como dinheiro disponível. É a única autoridade do Financial Platform capaz de responder:

```text
AUTHORIZED
ou
REJECTED
```

a uma solicitação de reserva, consumo ou liberação de valor.

Campaign nunca consulta Payment ou Asaas. Campaign não calcula disponibilidade. Ela solicita uma decisão ao `CampaignBudget` e reage ao resultado publicado pelo owner.

## 2. Por que é um Aggregate independente

O lifecycle comercial da Campaign e o lifecycle financeiro não avançam atomicamente.

Uma Campaign pode existir:

- sem pagamento;
- com pagamento parcialmente compensado;
- com saldo disponível;
- com saldo totalmente reservado;
- com saldo esgotado;
- com novas parcelas futuras;
- encerrada com histórico financeiro ainda auditável.

Separar `CampaignBudget`:

- mantém a Campaign independente do provider;
- centraliza concorrência de consumo;
- impede saldo negativo;
- permite parcelamento sem alterar o contrato;
- torna reserva e liberação auditáveis;
- permite reprocessar Events financeiros sem executar Campaign;
- preserva o owner único da autorização monetária.

Alternativa rejeitada: guardar apenas `remainingValue` dentro de Campaign. Isso mistura valor contratado e dinheiro compensado, dificulta reconciliação e permite que múltiplos fluxos concorrentes decrementem uma projeção sem autoridade clara.

## 3. Owner e fronteiras

O owner é o Aggregate `CampaignBudget`, dentro do Financial Platform.

Ele pode:

- reconhecer crédito originado em PaymentLedgerEntry elegível;
- decidir reserva;
- decidir consumo;
- decidir liberação de reserva;
- encerrar novas operações;
- publicar mudança de disponibilidade.

Ele não pode:

- alterar Campaign ou Slot;
- decidir quando um Slot deve existir;
- calcular preço;
- validar Evidence;
- consultar provider;
- decidir se pagamento compensou;
- criar SplitShare;
- debitar Wallet;
- retomar Campaign diretamente.

## 4. Modelo de valores

| Componente | Significado normativo |
| --- | --- |
| `AvailableBudget` | valor compensado, ainda não reservado nem consumido, elegível para nova autorização |
| `ReservedBudget` | valor temporariamente comprometido com uma obrigação identificada, ainda não consumido |
| `ConsumedBudget` | valor que deixou de estar disponível segundo uma decisão de consumo válida |
| `CreditedBudget` | total de créditos compensados aceitos pelo Aggregate; conceito derivável para auditoria |
| `ReleasedBudget` | total de reservas liberadas; conceito derivável, não dinheiro novo |
| `CompensatedAdjustment` | lançamentos posteriores que corrigem fatos sem reescrever buckets históricos |
| `BudgetPolicyVersion` | versão das regras aplicadas em cada decisão |

`ContractValue` não é saldo. Campaign é seu owner; `CampaignBudget` mantém somente uma referência imutável ao contrato para correlação e auditoria.

## 5. Equações mínimas

Sob o modelo contábil completo de `DEC-043`, estas relações são obrigatórias:

- `AvailableBudget >= 0`;
- `ReservedBudget >= 0`;
- `ConsumedBudget >= 0`;
- uma reserva reduz disponibilidade e aumenta reservado pelo mesmo valor conceitual;
- uma liberação reduz reservado e restaura disponibilidade pelo mesmo valor ainda não consumido;
- um consumo nunca excede a obrigação reservada ou o AvailableBudget conforme o caminho aprovado;
- o mesmo crédito não pode aumentar disponibilidade duas vezes;
- o mesmo compromisso não pode ser consumido duas vezes;
- taxa externa não entra na capacidade da Campaign.

Precisão, arredondamento e moeda seguem o Financial Decision Register. Nenhuma implementação pode satisfazer uma equação criando residual sem lançamento/origem.

## 6. Identidade das obrigações

Toda reserva ou consumo deve referenciar uma obrigação de negócio identificável, no mínimo:

- CampaignBudget;
- Campaign;
- Slot ou unidade econômica equivalente;
- PricingQuote congelado;
- valor e moeda;
- versão de política;
- idempotency key;
- correlation e causation.

A reserva integral ocorre antes de `SlotAllocated`. O consumo ocorre somente depois de Evidence `VALID`, não revertida e com ancoragem confirmada. Conclusão do playback, isoladamente, mantém o valor reservado.

## 7. Estados do Aggregate

Os estados expressam disponibilidade operacional; os buckets continuam sendo a fonte quantitativa.

| Estado | Condição conceitual | Operações permitidas |
| --- | --- | --- |
| `UNFUNDED` | nenhum crédito compensado aplicável foi aceito | receber crédito; encerrar |
| `AVAILABLE` | há AvailableBudget positivo e nenhuma condição de fechamento | receber crédito; reservar/consumir; encerrar conforme regras |
| `RESERVED` | existe valor reservado; pode ou não restar AvailableBudget | receber crédito; novas decisões se houver saldo; consumir/liberar |
| `DEPLETED` | não existe valor disponível para nova autorização | receber crédito; consumir/liberar reservas existentes; encerrar |
| `CLOSED` | nenhuma nova obrigação financeira pode ser criada | somente reconciliação/compensação histórica permitida |

`RESERVED` não significa necessariamente que todo o budget está reservado. O estado quantitativo deve sempre acompanhar os buckets.

## 8. Transições

| Estado de origem | Command/fato aceito | Estado possível | Event |
| --- | --- | --- | --- |
| `UNFUNDED` | crédito compensado positivo | `AVAILABLE` | `CampaignBudgetIncreased` |
| `AVAILABLE` | reserva aceita antes do Slot | `AVAILABLE`, `RESERVED` ou `DEPLETED`, conforme buckets | `BudgetReservationAuthorized` |
| `RESERVED` | nova reserva independente aceita | `RESERVED` ou `DEPLETED` | `BudgetReservationAuthorized` |
| `RESERVED` | Evidence válida e ancorada consome a obrigação | `AVAILABLE`, `RESERVED` ou `DEPLETED` | `BudgetReservationConsumed` |
| `RESERVED` | liberação/rejeição/expiração válida | `AVAILABLE`, `RESERVED` ou `DEPLETED` | `BudgetReservationReleased/Expired` |
| `DEPLETED` | novo crédito compensado | `AVAILABLE` ou `RESERVED` | `CampaignBudgetIncreased` |
| qualquer não final | encerramento autorizado | `CLOSED` | `CampaignBudgetClosed` |

Transições entre `AVAILABLE`, `RESERVED` e `DEPLETED` são consequências dos buckets, não comandos autônomos.

## 9. Estados e transições proibidos

É proibido:

- `UNFUNDED → RESERVED` sem crédito aplicável;
- `DEPLETED → AVAILABLE` por ContractValue, promessa ou parcela pendente;
- `CLOSED → AVAILABLE`;
- liberar obrigação já totalmente consumida;
- consumir obrigação já liberada;
- reservar valor zero/negativo;
- reservar/consumir moeda incompatível;
- reduzir `ConsumedBudget` para “desfazer” execução;
- reabrir histórico por chargeback;
- pular a decisão financeira e autorizar no consumidor.

## 10. IncreaseCampaignBudget

### Emissor

Serviço de domínio autorizado, em reação a um fato do PaymentLedger. O Event não altera o Aggregate.

### Pré-condições

- PaymentLedgerEntry é elegível e imutável;
- crédito está correlacionado a este CampaignBudget;
- moeda é compatível;
- valor é positivo e não inclui taxa externa;
- origem ainda não foi aplicada;
- Aggregate não rejeita o crédito por condição final incompatível;
- política e autorização são válidas.

### Decisão

`AUTHORIZED`:

- registra a origem;
- aumenta `AvailableBudget`;
- publica `CampaignBudgetIncreased`.

`REJECTED`:

- não altera buckets;
- registra motivo;
- pode abrir reconciliação, especialmente se o crédito pertence a destino desconhecido/fechado.

### Idempotência

Chaveada pelo PaymentLedgerEntry e budget alvo. Retry idêntico retorna a decisão original.

### Falhas

- origem duplicada;
- destino divergente;
- moeda incompatível;
- valor divergente;
- Aggregate fechado;
- política ausente;
- conflito de versão.

Pagamentos parciais aumentam budget somente pelo valor compensado e explicitamente alocado; excedente/duplicado permanece crédito do Advertiser.

## 11. AuthorizeBudgetReservation

### Propósito

Comprometer valor para uma obrigação identificada e impedir que outra decisão concorrente utilize o mesmo saldo.

### Quem solicita

Saga de alocação, após PricingQuote válido. Ela não calcula o resultado e só pode solicitar `SlotAllocated` depois da autorização.

### Pré-condições

- Campaign, Slot intent e quote são identificáveis;
- valor solicitado é positivo;
- moeda é compatível;
- quote/política aplicáveis estão referenciados;
- não existe reserva ativa para o mesmo Slot;
- `AvailableBudget` cobre integralmente o pedido;
- Aggregate aceita novas obrigações;
- autorização do emissor é válida.

### Resultado `AUTHORIZED`

- cria uma reserva com identidade própria, `expiresAt` derivado da janela do Slot e revisão;
- reduz `AvailableBudget`;
- aumenta `ReservedBudget`;
- publica `BudgetReservationAuthorized`;
- preserva o valor congelado da obrigação.

### Resultado `REJECTED`

- não altera buckets;
- publica `BudgetReservationRejected` com motivo de domínio;
- não reserva parcialmente por padrão.

Reserva parcial do mesmo Slot é proibida. Saldo insuficiente rejeita a reserva inteira.

### Concorrência

Se duas solicitações disputam o mesmo saldo:

1. o owner avalia cada uma contra seu estado autorizado;
2. somente as que couberem integralmente podem ser aceitas;
3. uma decisão baseada em estado anterior não garante autorização;
4. a rejeitada pode ser reapresentada apenas como nova avaliação explícita, sem fingir que a decisão anterior não existiu.

Não se escolhe prioridade por ordem comercial presumida. Se uma política de prioridade for necessária, ela deve ser aprovada.

## 12. ConsumeBudgetReservation

### Propósito

Transformar capacidade disponível/reservada em valor consumido por uma obrigação reconhecida.

### Pré-condições

- reserva existe e está ativa;
- ainda não foi consumida;
- Slot, Evidence, valor e quote correspondem ao compromisso;
- Evidence está `VALID`, não revertida e com ancoragem confirmada;
- política capturada é válida.

### Efeitos

- reduz `ReservedBudget`;
- aumenta `ConsumedBudget` pelo valor integral da reserva;
- marca a obrigação como consumida;
- publica `BudgetReservationConsumed`.

Consumo direto de AvailableBudget é proibido. Playback concluído sem Evidence elegível não consome.

### Idempotência

Mesma obrigação/fase e mesmo valor: um consumo.

Mesmo identificador com valor ou quote divergente: conflito, nunca segundo consumo.

## 13. ReleaseBudgetReservation

### Propósito

Liberar valor reservado que não será consumido pela obrigação original.

### Causas válidas

Podem incluir expiração, revogação, cancelamento ou falha da obrigação, desde que o owner correspondente publique fato explícito e a política reconheça a causa.

### Pré-condições

- reserva existe;
- ainda há valor não consumido;
- causa é identificável;
- a liberação ainda não foi aplicada;
- valor não excede o remanescente reservado;
- política permite liberação.

### Efeitos

- reduz `ReservedBudget`;
- aumenta `AvailableBudget`;
- marca a reserva/fração como liberada;
- publica `BudgetReservationReleased`.

Liberação não é crédito novo e não altera `CreditedBudget`.

### Proibições

- liberar uma reserva e depois consumi-la;
- liberar mais do que reservado;
- liberar por timeout local não normativo;
- apagar o histórico da reserva;
- usar liberação para compensar chargeback.

## 14. Expiração de reserva

A reserva possui `expiresAt` derivado da janela do Slot e da `BudgetReservationPolicy`. Intervalo numérico adicional para processamento tardio permanece `OPEN-031`; ausência de parâmetro aprovado não autoriza reserva infinita.

Contrato mínimo:

- expiração deve ser decidida pelo owner por Command;
- passagem do tempo, sozinha, não modifica estado;
- o Command informa a reserva e o marco observado;
- owner revalida se a reserva ainda é expirável;
- retry é idempotente;
- consumo confirmado concorrentemente impede liberação incompatível;
- expiração publica `BudgetReservationExpired`;
- histórico preserva deadline/política que fundamentou a decisão.

## 15. Depletion e reação da Campaign

`CampaignBudgetDepleted` informa ausência de saldo disponível para novas autorizações. Ele não altera Campaign.

Campaign Management consome esse fato e envia `AddCampaignPauseCause(BUDGET_DEPLETED)` à Campaign. Novo `CampaignBudgetIncreased` causa remoção dessa causa; retomada só ocorre quando nenhuma outra causa permanece. Campaign nunca consulta CampaignBudget sincronicamente e `PAUSED_NO_BUDGET` é proibido.

Pagamento parcial somente aumenta AvailableBudget depois de `PaymentCompensated`, entrada aceita no PaymentLedger e `IncreaseCampaignBudget`. Excedente/duplicado permanece crédito do Advertiser e não é alocado por heurística.

Campaign Management pode emitir seu próprio Command para pausar execução. Ao receber novo crédito:

- `CampaignBudgetIncreased` informa nova capacidade;
- Campaign Management revalida todos os motivos de pausa;
- apenas o motivo financeiro pode ter sido resolvido;
- a remoção da causa financeira permite retomada automática somente quando nenhuma outra causa de pausa permanecer; Campaign revalida seus próprios gates.

## 16. Encerramento

`CLOSED` impede novas reservas/consumos como novas obrigações. O encerramento:

- não apaga buckets;
- não apaga reservas;
- exige tratamento explícito das obrigações pendentes;
- não impede lançamento compensatório necessário;
- não transforma saldo remanescente em refund automaticamente;
- preserva possibilidade de auditoria/rebuild.

Destino de saldo remanescente e refunds dependem das decisões `OPEN-016/025`.

## 17. Concorrência detalhada

### 17.1 Duas reservas

Budget disponível: R$10. Duas solicitações independentes pedem R$8.

Resultado obrigatório: no máximo uma pode ser autorizada se avaliadas antes de novo crédito. Autorizar R$16 viola o Aggregate.

### 17.2 Reserva e consumo

Consumo de uma obrigação e nova reserva para outra não podem usar o mesmo valor. O owner decide contra uma ordem autorizada.

### 17.3 Liberação e consumo da mesma obrigação

Somente um efeito incompatível pode vencer. O outro recebe rejeição por estado/transição e inicia reconciliação se houver fato externo divergente.

### 17.4 Crédito e fechamento

Se chegarem concorrentemente, nenhum consumidor decide por “última escrita”. O owner aceita/rejeita segundo transição e mantém o crédito não alocado reconciliável.

## 18. Consistência eventual

Janelas válidas:

- PaymentLedgerEntry existe antes de budget aumentado;
- budget foi aumentado antes de Campaign observar;
- budget está depleted antes de Campaign pausar;
- reserva foi liberada antes de Slot observar.

Durante a janela:

- consumidores não recalculam saldo;
- Commands repetidos usam mesma identidade;
- projeções podem exibir status “em sincronização”;
- decisão financeira do owner prevalece sobre projeção.

## 19. Replay, reidratação e rebuild

Reidratação deve reconstruir:

- créditos aceitos;
- reservas por obrigação;
- consumos;
- liberações;
- buckets;
- estado;
- versões de política.

Replay:

- não reaplica crédito;
- não duplica reserva;
- não consome novamente;
- não transforma reserva histórica em expirada sob política atual.

Rebuild de projeções:

- parte do histórico append-only;
- valida equações mínimas;
- compara o resultado com snapshots/projeções existentes;
- registra divergência;
- nunca “ajusta” o Aggregate editando entradas.

## 20. Falhas e recuperação

| Falha | Recuperação normativa |
| --- | --- |
| Event de crédito perdido | reentrega e Command idempotente |
| resposta de reserva perdida | retry com mesma identidade retorna resultado |
| consumidor recebe Event duplicado | nenhum novo Command sem dedupe causal |
| projeção atrasada | consultar autoridade do Aggregate no fluxo de decisão; não usar visão como saldo |
| reserva órfã | diagnóstico + Command de expiração/liberação segundo política |
| conflito valor/quote | bloquear obrigação e reconciliar |
| histórico não fecha equação | impedir novas decisões de risco e abrir investigação auditável |

## 21. Auditoria

Cada decisão deve registrar:

- budget e Campaign correlacionada;
- obrigação;
- quote;
- valor/moeda;
- buckets antes e depois;
- estado antes e depois;
- Command, ator e autorização;
- idempotency key;
- correlation/causation;
- política e versão;
- Event publicado;
- motivo de rejeição;
- conflito ou compensação.

## 22. Exemplos normativos

### 22.1 Reserva válida

AvailableBudget é R$50. Uma obrigação identificada solicita R$10. O owner autoriza, deixa R$40 disponíveis e R$10 reservados.

### 22.2 Reserva duplicada

A mesma obrigação R$10 é reenviada com a mesma identidade. O owner retorna a reserva original. Os buckets permanecem R$40/R$10.

### 22.3 Concorrência

AvailableBudget é R$10. Pedidos A e B de R$8 concorrem. A foi autorizada primeiro; B é rejeitado por saldo insuficiente na avaliação atual.

### 22.4 Parcela nova

Budget depleted recebe crédito de uma nova parcela compensada. O estado pode voltar a AVAILABLE. A Campaign não é reativada diretamente.

## 23. Contraexemplos proibidos

- Campaign diminuir um campo `balance`.
- Slot assumir autorização porque viu uma projeção positiva.
- reservar parcialmente R$7 de um pedido R$10 sem regra aprovada.
- liberar reserva só porque um relógio local passou do prazo.
- autorizar duas reservas sobre o mesmo saldo.
- consumir ContractValue.
- incluir taxa de cartão no crédito.
- voltar `ConsumedBudget` para corrigir falha.
- usar novo pagamento para esconder divergência anterior.
- reabrir `CLOSED` por Event tardio.

## 24. Decisões abertas

- `OPEN-019`: precisão, moeda, arredondamento e residual;
- `OPEN-020`: modelo contábil e conservação;
- `OPEN-025`: pagamentos parciais/excedentes/duplicados e alocação;
- `OPEN-030`: conflito de idempotency key;
- `OPEN-031`: TTL e retries quantitativos.

As decisões pertencem à [PLATFORM_SPECIFICATION.md](../specification/PLATFORM_SPECIFICATION.md) e não podem ser resolvidas localmente.

## 25. Falha operacional, realocação e cancelamento

Falha operacional confirmada sem execução válida libera a reserva pelo Command idempotente do owner. O valor retorna a `AvailableBudget` e pode financiar novo Slot com nova identidade, Quote e reserva. O Slot original permanece histórico.

Campaign Management solicita realocação; CampaignBudget não escolhe candidato. Underdelivery não cria refund automático.

No cancelamento, consumo comprovado permanece em `ConsumedBudget`; reservas revogáveis retornam a `AvailableBudget`. O saldo é creditado por padrão na `AdvertiserAccount`. Mediante solicitação, Financial Platform pode executar refund ao meio original conforme elegibilidade, política e legislação. CampaignBudget não executa a devolução.

Overdelivery técnico nunca cria consumo adicional contra o Advertiser. A ocorrência é reconciliada separadamente como custo da plataforma.
