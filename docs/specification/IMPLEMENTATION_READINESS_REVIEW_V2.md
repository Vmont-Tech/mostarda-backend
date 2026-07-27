# Implementation Readiness Review V2

**Data:** 2026-07-27  
**Base:** IRR V1 + Technical Behavioral Specification `TBS-1`  
**Escopo:** somente gates transversais preenchidos pela TBS

## 1. Regra mecânica de promoção

Para cada artefato:

1. foram copiados os gates do IRR V1;
2. somente gates demonstravelmente cobertos pela TBS ou spec própria foram promovidos;
3. lacunas específicas de payload, Value Object, Entity, Policy, lifecycle ou contrato próprio foram preservadas;
4. ausência de evidência permaneceu parcial/ausente;
5. `IMPLEMENTATION_READY` exige todos os gates aplicáveis satisfeitos, sem exceção.

A TBS não promove artefato por associação. Ela preenche exclusivamente:

- semântica transversal de Command Result;
- envelope/famílias de Error;
- optimistic concurrency;
- atomicidade;
- replay/rebuild;
- snapshot policy conceitual;
- schema evolution/upcasting transversal;
- idempotência/ordering/gaps;
- conformidade técnica transversal.

## 2. Impacto da TBS

| Gate transversal | IRR V1 | Após TBS |
| --- | --- | --- |
| Command Result comum | ausente | satisfeito transversalmente |
| famílias/envelope de Error | ausente | satisfeito transversalmente |
| error codes específicos | ausente | continua ausente |
| optimistic concurrency | desigual | semântica transversal satisfeita |
| snapshot policy conceitual | ausente | satisfeita |
| frequência/storage de snapshot | fora do readiness comportamental | permanece configuração |
| replay desconhecido/gap/estado parcial | incompleto | satisfeito transversalmente |
| schema evolution/upcast | incompleto | semântica transversal satisfeita |
| schemas/payloads específicos | incompletos | continuam incompletos |
| testes de conformidade exigidos | ausentes | perfil normativo definido; implementação ainda deverá executá-lo |

## 3. Matriz de readiness atualizada

### 3.1 Aggregates

| Aggregate | V1 | V2 | Lacunas remanescentes |
| --- | --- | --- | --- |
| `GovernanceCase` | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | error codes específicos; schemas completos dos Events; contratos internos parciais de EvidenceReference/Investigation/Appeal/GovernancePolicyVersion |
| `Campaign` | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | payloads completos; error codes específicos; tipos/VOs parciais |
| `CreativeAsset` | `IMPLEMENTATION_NOT_READY` | `IMPLEMENTATION_NOT_READY` | root/state/reidratação próprios não especificados |
| `DeviceRegistry` | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | payloads/identidades/error codes específicos |
| `Installation` | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | error codes, payloads e resultados específicos por transição |
| `EdgeInstallation` | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | estado persistido completo, schemas e error codes |
| `TVCapability` | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | policy lookup/fallback específico, schemas e error codes |
| `WithdrawalBatch` | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | tipos de totals/membership/external identity e error codes |
| `FinancialPolicy` | `IMPLEMENTATION_NOT_READY` | `IMPLEMENTATION_NOT_READY` | Aggregate e State Machine próprios incompletos |

### 3.2 Entities e Value Objects

| Artefato | V2 |
| --- | --- |
| `ResponsibilityDecision` | `IMPLEMENTATION_READY` |
| `ResponsibleParty` | `IMPLEMENTATION_READY` |
| `ResponsibilityCategory` | `IMPLEMENTATION_READY` |
| `Severity` | `IMPLEMENTATION_READY` |
| `Confidence` | `IMPLEMENTATION_READY` |
| `EvidenceReference` | `IMPLEMENTATION_PARTIAL` |
| `Investigation` | `IMPLEMENTATION_PARTIAL` |
| `Appeal` | `IMPLEMENTATION_PARTIAL` |
| `GovernancePolicyVersion` | `IMPLEMENTATION_PARTIAL` |
| `DecisionRevision` | `IMPLEMENTATION_PARTIAL` |
| Campaign/TV/Device identity VOs | `IMPLEMENTATION_PARTIAL` |

### 3.3 Commands

Todos os Commands autorizados permanecem `IMPLEMENTATION_PARTIAL`.

A TBS define o resultado transversal, mas não cria:

- error codes específicos;
- payload tipado específico;
- validações específicas serializáveis;
- tipos de identidade/referência;
- policy lookup result próprio;
- schema version do Command.

Isso se aplica aos Commands autorizados de Governance, Campaign, TV identity/install/capability, WithdrawalBatch e FinancialPolicy.

### 3.4 Events

Todos os Events autorizados permanecem `IMPLEMENTATION_PARTIAL` como contratos serializados.

A TBS fecha comportamento de versionamento, upcast, unknown schema, ordering e replay. Permanecem ausentes:

- schema concreto por Event;
- tipos físicos/conceituais completos de todos os campos;
- compatibilidade declarada por versão;
- cadeia de upcast específica;
- regras específicas do consumidor para cada error condition.

### 3.5 State Machines

| State Machine | V1 | V2 |
| --- | --- | --- |
| GovernanceCase | `IMPLEMENTATION_READY` | `IMPLEMENTATION_READY` |
| Campaign | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` |
| CreativeAsset moderation | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` |
| WithdrawalBatch | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` |
| Installation | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` |
| EdgeInstallation | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` |
| TVCapability | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` |

As lacunas remanescentes são específicas das transições/errors/payloads, não transversais.

### 3.6 Sagas

| Saga | V1 | V2 | Lacunas remanescentes |
| --- | --- | --- | --- |
| Governance investigation/review | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | state schema específico, Commands pendentes, timeout policy reference e error codes |
| Governance appeal/reevaluation | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | state schema, checkpoint específico e error codes |

### 3.7 Projections e Read Models

| Artefato | V1 | V2 | Lacunas remanescentes |
| --- | --- | --- | --- |
| Governance case timeline | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | schema/version/checkpoint específicos |
| Responsibility current view | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | schema, staleness contract e swap contract específicos |
| NetworkInventory | `IMPLEMENTATION_PARTIAL` | `IMPLEMENTATION_PARTIAL` | checkpoint/invalidation/migration específicos |

### 3.8 Policies e Integration Contract

| Artefato | V2 | Lacuna |
| --- | --- | --- |
| GovernancePolicyVersion | `IMPLEMENTATION_PARTIAL` | formato, resolução e compatibilidade específica |
| Campaign pause policy | `IMPLEMENTATION_PARTIAL` | contrato/error codes específicos |
| Slot equivalence policy | `IMPLEMENTATION_PARTIAL` | input/output/errors específicos |
| FinancialPolicy versioning | `IMPLEMENTATION_PARTIAL` | state/lifecycle/precedência específica |
| ResponsibilityDecisionPublished | `IMPLEMENTATION_PARTIAL` | schema concreto e compatibilidade declarada por versão |

## 4. Checklist mecânico de GovernanceCase

| Gate | Evidência | Resultado |
| --- | --- | --- |
| root/boundary | Governance spec | satisfeito |
| invariantes | Governance invariants | satisfeito |
| lifecycle | Governance State Machine | satisfeito |
| optimistic concurrency | Governance spec + TBS-CON | satisfeito |
| snapshot policy | TBS-SNP | satisfeito transversalmente |
| Aggregate versioning | Governance revision rules | satisfeito |
| reidratação | Governance spec + TBS-RPL | satisfeito |
| Events suficientes para replay | Governance Events | satisfeito |
| famílias/envelope de erros | TBS-ERR | satisfeito transversalmente |
| error codes específicos | nenhum catálogo específico | **não satisfeito** |
| schema evolution semântica | TBS-EVT | satisfeito transversalmente |
| schemas/upcasters específicos | não definidos por Event | **não satisfeito** |
| Entity/VO contracts completos | EvidenceReference/Investigation/Appeal/PolicyVersion parciais | **não satisfeito** |
| testes normativos requeridos | perfil TBS definido; suíte ainda não materializada | parcial |

**Resultado mecânico:** `GovernanceCase = IMPLEMENTATION_PARTIAL`.

Nenhuma exceção foi aplicada.

## 5. Artefatos IMPLEMENTATION_READY

Lista definitiva após TBS:

- `ResponsibleParty`;
- `ResponsibilityCategory`;
- `Severity`;
- `Confidence`;
- `ResponsibilityDecision`;
- GovernanceCase State Machine.

Nenhum Aggregate root, Command, Event, Saga, Projection, Read Model, Policy ou Integration Contract foi promovido.

## 6. Ajustes específicos mínimos para GovernanceCase

Para promoção futura, sem reabrir domínio:

1. catálogo de error codes específicos dos nove Commands;
2. schema conceitual completo e versionado dos nove Events;
3. contratos completos de EvidenceReference, Investigation, Appeal e GovernancePolicyVersion;
4. cadeia de compatibilidade/upcast por Event versionado;
5. suíte de conformidade GovernanceCase baseada no perfil TBS.

Snapshot, replay, concurrency, Command Result e comportamento para Unknown Event não são mais lacunas.

## 7. Vertical Slice

GovernanceCase continua sendo o candidato preferencial, mas ainda não está autorizado como referência definitiva.

É permitido preparar:

- harness da suíte de conformidade TBS;
- tipos genéricos da CGS Parte A;
- experimentos descartáveis de infraestrutura.

Não é permitido declarar o slice conforme ou congelar a CGS Parte B antes dos cinco ajustes específicos da seção 6.

## 8. Parecer

**TBS transversal:** cobre as lacunas técnicas comuns identificadas no IRR V1.  
**GovernanceCase Aggregate:** `IMPLEMENTATION_PARTIAL`.  
**Aggregate roots READY:** zero.  
**Promoções indevidas:** zero.

A TBS foi aplicada como norma transversal e não como mecanismo automático de promoção.

