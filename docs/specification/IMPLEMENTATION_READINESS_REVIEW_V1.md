# Implementation Readiness Review V1

**Data:** 2026-07-27  
**Commit-base:** `83fcd8d`  
**Escopo:** exclusivamente artefatos `IMPLEMENTATION_AUTHORIZED` em `ARCHITECTURE_LOCK_REVIEW_V1.md`  
**Critério:** três engenheiros independentes devem produzir o mesmo comportamento.

## 1. Restrições

Esta revisão:

- não reavalia Domain Freeze;
- não reavalia Architecture Lock;
- não reclassifica OPEN, SYNC ou decisões;
- não define stack, persistência física ou estrutura de projeto;
- não cria comportamento ausente.

Status:

- `IMPLEMENTATION_READY`: documentação suficiente para implementação comportamentalmente determinística;
- `IMPLEMENTATION_PARTIAL`: comportamento principal existe, mas detalhes normativos necessários permitem implementações divergentes;
- `IMPLEMENTATION_NOT_READY`: falta informação suficiente para implementar o artefato como unidade coerente.

Uma lacuna de snapshot, error code ou schema evolution não invalida o domínio. Ela impede somente afirmar que implementações independentes serão equivalentes.

## 2. Resultado executivo

Nenhum Aggregate root autorizado atingiu `IMPLEMENTATION_READY`.

O padrão recorrente é:

1. Aggregate, lifecycle, Commands e Events estão conceitualmente definidos;
2. optimistic concurrency e replay aparecem em vários contextos;
3. não existe política normativa de snapshot por Aggregate;
4. não existe catálogo normativo de erros com código, significado, condição e consumidor;
5. compatibilidade e evolução de schema não estão completas por Event;
6. alguns Commands descrevem falhas, mas não resultados normativos serializáveis;
7. políticas de reidratação raramente especificam comportamento diante de Event desconhecido, gap irrecuperável ou upcast.

Consequentemente, o projeto pode preparar a CGS Parte A, mas ainda não deve gerar implementação de domínio como contrato definitivo.

## 3. Matriz completa de readiness

### 3.1 Bounded Context

| Artefato | Status | Lacuna determinante |
| --- | --- | --- |
| Governance & Dispute Management | `IMPLEMENTATION_PARTIAL` | Aggregate e contratos maduros; error catalog, snapshot policy e schema evolution incompletos |

### 3.2 Aggregates

| Aggregate | Status | Lacunas |
| --- | --- | --- |
| `GovernanceCase` | `IMPLEMENTATION_PARTIAL` | snapshot policy; error codes; upcasting/schema compatibility; resposta normativa a Event desconhecido na reidratação |
| `Campaign` | `IMPLEMENTATION_PARTIAL` | snapshot policy; error codes; payload completo de todos os Commands/Events; schema evolution |
| `CreativeAsset` | `IMPLEMENTATION_NOT_READY` | não possui especificação autônoma completa de root, estado persistido, reidratação e snapshot |
| `DeviceRegistry` | `IMPLEMENTATION_PARTIAL` | snapshot/rebuild do root; error codes; payloads completos; evolução de schema |
| `Installation` | `IMPLEMENTATION_PARTIAL` | optimistic concurrency não detalhada por transição; snapshot; error codes; schema evolution |
| `EdgeInstallation` | `IMPLEMENTATION_PARTIAL` | estado persistido completo, snapshot, catálogo de erros e evolução de schema |
| `TVCapability` | `IMPLEMENTATION_PARTIAL` | snapshot, códigos de erro, fallback de policy incompatível e schema evolution |
| `WithdrawalBatch` | `IMPLEMENTATION_PARTIAL` | snapshot, error codes, reidratação sob gap/schema desconhecido e compatibilidade de Events |
| `FinancialPolicy` | `IMPLEMENTATION_NOT_READY` | não há especificação completa do Aggregate, state machine, estado reidratado e regras de snapshot |

### 3.3 Entities

| Entity | Status | Lacunas |
| --- | --- | --- |
| `ResponsibilityDecision` | `IMPLEMENTATION_READY` | campos, imutabilidade, revision, policy e invariantes definidos |
| `EvidenceReference` | `IMPLEMENTATION_PARTIAL` | formato de URI/digest/schema e resposta normativa a referência inacessível não formam contrato interno completo |
| `Investigation` | `IMPLEMENTATION_PARTIAL` | campos persistidos, lifecycle próprio e invariantes locais não estão enumerados integralmente |
| `Appeal` | `IMPLEMENTATION_PARTIAL` | admissibilidade é referida à policy, mas resultado/erro interno não possui contrato normativo completo |

### 3.4 Value Objects

| Value Object | Status | Lacunas |
| --- | --- | --- |
| `ResponsibleParty` | `IMPLEMENTATION_READY` | enum normativo completo incluindo `NONE` |
| `ResponsibilityCategory` | `IMPLEMENTATION_READY` | enum normativo completo; `UNKNOWN` proibido |
| `Severity` | `IMPLEMENTATION_READY` | enum normativo completo |
| `Confidence` | `IMPLEMENTATION_READY` | decimal obrigatório em `[0.00,1.00]`, sem semântica probabilística ou efeito decisório |
| `GovernancePolicyVersion` | `IMPLEMENTATION_PARTIAL` | identidade e imutabilidade definidas; formato, comparação e resolução da versão não |
| `DecisionRevision` | `IMPLEMENTATION_PARTIAL` | monotonicidade definida; tipo, limites e overflow não especificados |
| `CampaignIdentifier` | `IMPLEMENTATION_PARTIAL` | identidade conceitual sem formato/validação/serialização normativa |
| `TVIdentifier` | `IMPLEMENTATION_PARTIAL` | identidade conceitual sem formato/validação/serialização normativa |
| `PlaybackWindow` | `IMPLEMENTATION_PARTIAL` | boundary temporal existe; timezone, inclusividade e normalização não são contrato completo |
| `AssetReference` | `IMPLEMENTATION_PARTIAL` | identidade/integridade/versão não formam contrato único |
| `DeviceIdentity` | `IMPLEMENTATION_PARTIAL` | formato, algoritmo de validação e serialização não estão congelados |
| `EdgeInstallationIdentity` | `IMPLEMENTATION_PARTIAL` | formato e validação não estão congelados |
| `CapabilityManifestVersion` | `IMPLEMENTATION_PARTIAL` | ordenação/compatibilidade existem conceitualmente; representação não está congelada |

### 3.5 Domain Services

| Domain Service | Status | Lacunas |
| --- | --- | --- |
| avaliação determinística de equivalência de realocação | `IMPLEMENTATION_NOT_READY` | não há contrato de entrada/saída, códigos de rejeição e algoritmo normativo executável |
| reconciler de Desired/Current/Observed State | `IMPLEMENTATION_NOT_READY` | não há contrato único de diff, precedência, resultado e Command produzido por divergência |

### 3.6 Projections e Read Models

| Artefato | Status | Lacunas |
| --- | --- | --- |
| Governance case timeline | `IMPLEMENTATION_PARTIAL` | projection version, checkpoint, invalidation e schema migration ausentes |
| Responsibility decision current view | `IMPLEMENTATION_PARTIAL` | rebuild definido por maior revision; staleness, checkpoint e swap atômico ausentes |
| NetworkInventory | `IMPLEMENTATION_PARTIAL` | replay/stale definidos; checkpoint, invalidation total, migration e atomic rebuild não |

### 3.7 Policies

| Policy | Status | Lacunas |
| --- | --- | --- |
| `GovernancePolicyVersion` | `IMPLEMENTATION_PARTIAL` | imutabilidade/precedência histórica definidas; formato, lookup failure e compatibilidade não |
| Campaign pause policy | `IMPLEMENTATION_PARTIAL` | composição de causas definida; contrato técnico, error codes e fallback ausentes |
| Slot reallocation/equivalence policy | `IMPLEMENTATION_PARTIAL` | dimensões obrigatórias definidas; contrato de avaliação e erros não |
| `FinancialPolicy` versioning | `IMPLEMENTATION_PARTIAL` | prospectividade definida; representação, precedência entre tipos e lookup failure não |

### 3.8 Integration Contract

| Artefato | Status | Lacunas |
| --- | --- | --- |
| `ResponsibilityDecisionPublished` | `IMPLEMENTATION_PARTIAL` | payload conceitual completo; tipos serializados, compatibilidade backward/forward, upcast e error contract ausentes |

## 4. Checklist por Aggregate

Legenda: `S` suficiente; `P` parcial; `N` ausente/não suficiente; `NA` não aplicável.

| Gate | GovernanceCase | Campaign | CreativeAsset | DeviceRegistry | Installation | EdgeInstallation | TVCapability | WithdrawalBatch | FinancialPolicy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| root/boundary | S | S | P | S | S | S | S | S | P |
| invariantes | S | S | P | S | S | P | S | S | P |
| lifecycle/state machine | S | S | P | S | S | S | S | S | N |
| optimistic concurrency | S | S | N | P | P | P | S | S | P |
| snapshot policy | N | N | N | N | N | N | N | N | N |
| versionamento do Aggregate | S | S | P | P | P | S | S | S | P |
| reidratação | S | S | N | P | P | P | S | S | N |
| Events suficientes para replay | S | S | P | S | S | P | S | S | P |
| regras de erro | P | P | N | P | P | P | P | P | P |
| error codes normativos | N | N | N | N | N | N | N | N | N |
| schema evolution | P | N | N | N | N | N | N | P | N |
| testes normativos mínimos | N | N | N | N | N | N | N | N | N |

## 5. Checklist por Command

Todos os Commands autorizados possuem nome e owner. Nenhum possui catálogo de error codes normativos; por isso nenhum Command está `IMPLEMENTATION_READY`.

### 5.1 Governance Commands

| Command | Status | Informação faltante |
| --- | --- | --- |
| `OpenGovernanceCase` | `IMPLEMENTATION_PARTIAL` | error codes e contrato serializado de resultado |
| `AttachEvidenceReference` | `IMPLEMENTATION_PARTIAL` | error codes; tipos normativos de digest/URI/schema |
| `StartInvestigation` | `IMPLEMENTATION_PARTIAL` | error codes; resultado de policy lookup incompatível |
| `RequestHumanReview` | `IMPLEMENTATION_PARTIAL` | error codes; identidade normativa da solicitação ativa |
| `ClassifyResponsibility` | `IMPLEMENTATION_PARTIAL` | error codes; contrato da proposta interna |
| `PublishDecision` | `IMPLEMENTATION_PARTIAL` | error codes; resultado serializado de concurrency/idempotency conflict |
| `AppealDecision` | `IMPLEMENTATION_PARTIAL` | error codes; contrato de admissibilidade |
| `ReevaluateGovernanceCase` | `IMPLEMENTATION_PARTIAL` | error codes; resultado para Appeal concorrente correlacionado |
| `CloseGovernanceCase` | `IMPLEMENTATION_PARTIAL` | error codes; contrato de consequência obrigatória pendente |

### 5.2 Campaign Commands

| Command | Status | Informação faltante |
| --- | --- | --- |
| `CreateCampaign` | `IMPLEMENTATION_PARTIAL` | payload tipado integral, error codes, resultado idempotente serializado |
| `MarkCampaignReady` | `IMPLEMENTATION_PARTIAL` | error codes e lista normativa de validações retornadas |
| `PublishCampaign` | `IMPLEMENTATION_PARTIAL` | error codes e contrato de policy/configuration failure |
| `ActivateCampaign` | `IMPLEMENTATION_PARTIAL` | error codes e resultado de conflito temporal |
| `PauseCampaign` | `IMPLEMENTATION_PARTIAL` | catálogo tipado de causas e errors |
| `AddCampaignPauseCause` | `IMPLEMENTATION_PARTIAL` | identidade/ordenação da causa e errors |
| `RemoveCampaignPauseCause` | `IMPLEMENTATION_PARTIAL` | erro normativo para causa inexistente/stale |
| `ResumeCampaign` | `IMPLEMENTATION_PARTIAL` | error codes para causas remanescentes |
| `CancelCampaign` | `IMPLEMENTATION_PARTIAL` | contrato de resultado imediato versus coordenação |
| `FinalizeCampaignCancellation` | `IMPLEMENTATION_PARTIAL` | precondições serializadas e errors |
| `ExpireCampaign` | `IMPLEMENTATION_PARTIAL` | autoridade temporal e error codes |
| `CompleteCampaign` | `IMPLEMENTATION_PARTIAL` | critérios retornáveis e errors |
| `UploadCreativeAsset` | `IMPLEMENTATION_PARTIAL` | tipos de asset/integridade e errors |
| `RecordCreativeAssetVerdict` | `IMPLEMENTATION_PARTIAL` | contrato do verdict e error codes |
| `ReviseCampaignStrategy` | `IMPLEMENTATION_PARTIAL` | diff/version contract e errors |

### 5.3 TV Commands

Todos estão `IMPLEMENTATION_PARTIAL`:

`RegisterTV`, `RegisterDevice`, `BindDeviceToTV`, `UnbindDeviceFromTV`, `ReplaceDevice`, `DecommissionDevice`, `PlanInstallation`, `StartInstallation`, `RecordInstallationCheck`, `VerifyInstallation`, `AcceptInstallation`, `CancelInstallation`, `CreateEdgeInstallation`, `StartEdgeProvisioning`, `RegisterEdgeIdentity`, `CompleteEdgeProvisioning`, `FailEdgeProvisioning`, `DeclareCapability`, `ValidateCapability`, `ActivateCapability`, `SuspendCapability`, `DegradeCapability`, `RecoverCapability`, `RetireCapability`.

Lacunas comuns:

- error codes normativos;
- contrato serializado de `ACCEPTED/REJECTED/DUPLICATE/CONFLICT/EXPIRED`;
- tipos normativos de identidade, manifesto, checklist e credential reference;
- evolução de payload;
- testes mínimos por transição.

### 5.4 Financial Commands autorizados

| Command | Status | Informação faltante |
| --- | --- | --- |
| `OpenWithdrawalBatch` | `IMPLEMENTATION_PARTIAL` | error codes; payload tipado e schema evolution |
| `SealWithdrawalBatch` | `IMPLEMENTATION_PARTIAL` | error codes; representação de totals/membership digest |
| `SubmitWithdrawalBatch` | `IMPLEMENTATION_PARTIAL` | error codes; contrato de identidade externa |
| `ReconcileWithdrawalBatch` | `IMPLEMENTATION_PARTIAL` | error codes; tipos de resultado/pending/divergence |
| `CloseWithdrawalBatch` | `IMPLEMENTATION_PARTIAL` | error codes; contrato de item destacado |
| `ChangeFinancialPolicy` | `IMPLEMENTATION_PARTIAL` | state model do Aggregate, error codes e compatibility contract |

## 6. Checklist por Event

Nenhum Event autorizado está `IMPLEMENTATION_READY` como contrato serializado. Os Events possuem significado e, em muitos casos, payload conceitual, mas não política completa de compatibilidade/upcast.

### 6.1 Governance Events

| Event | Status | Informação faltante |
| --- | --- | --- |
| `GovernanceCaseOpened` | `IMPLEMENTATION_PARTIAL` | tipos serializados e evolução de schema |
| `EvidenceReferenceAttached` | `IMPLEMENTATION_PARTIAL` | tipos de digest/URI/schema e compatibilidade |
| `InvestigationStarted` | `IMPLEMENTATION_PARTIAL` | schema completo e upcast |
| `HumanReviewRequested` | `IMPLEMENTATION_PARTIAL` | schema completo e upcast |
| `ResponsibilityDecisionPublished` | `IMPLEMENTATION_PARTIAL` | tipos físicos, backward/forward compatibility e upcast |
| `ResponsibilityDecisionAppealed` | `IMPLEMENTATION_PARTIAL` | tipos físicos e compatibilidade |
| `GovernanceCaseReevaluationStarted` | `IMPLEMENTATION_PARTIAL` | tipos físicos e compatibilidade |
| `GovernanceCaseReevaluated` | `IMPLEMENTATION_PARTIAL` | tipos físicos e compatibilidade |
| `GovernanceCaseClosed` | `IMPLEMENTATION_PARTIAL` | payload completo e compatibilidade |

### 6.2 Campaign Events

Todos estão `IMPLEMENTATION_PARTIAL`:

`CampaignCreated`, `CampaignReady`, `CampaignPublished`, `CampaignActivated`, `CampaignPaused`, `CampaignPauseCauseRemoved`, `CampaignResumed`, `CampaignCancellationRequested`, `CampaignCancelled`, `CampaignExpired`, `CampaignCompleted`, `CampaignStrategyRevised`, `CreativeAssetUploaded`, `CreativeAssetApproved`, `CreativeAssetRejected`.

Lacunas comuns: payload físico completo, schema version por Event, regras de upcast, compatibilidade e error handling do consumidor.

### 6.3 TV Events

Todos estão `IMPLEMENTATION_PARTIAL`:

`TvRegistered`, `DeviceRegistered`, `DeviceBoundToTV`, `DeviceReplaced`, `DeviceDecommissioned`, `InstallationCheckRecorded`, `InstallationVerified`, `InstallationAccepted`, `InstallationFailed`, `EdgeProvisioningStarted`, `EdgeIdentityRegistered`, `CapabilityDeclared`, `CapabilityActivated`, `CapabilityRetired`.

Lacunas comuns: payload físico, tipos de identidade/manifesto, compatibilidade e upcast.

### 6.4 Financial Events autorizados

Todos estão `IMPLEMENTATION_PARTIAL`:

`WithdrawalBatchOpened`, `WithdrawalBatchSealed`, `WithdrawalBatchSubmitted`, `WithdrawalBatchReconciliationUpdated`, `WithdrawalBatchClosed`, `FinancialPolicyChanged`.

Lacunas comuns: tipos físicos, error handling do consumidor, compatibilidade e upcast.

## 7. Checklist por State Machine

| State Machine | Status | Determinismo |
| --- | --- | --- |
| GovernanceCase | `IMPLEMENTATION_READY` | estados, transições, eventos, concorrência, retries, finais e transições proibidas completos |
| Campaign | `IMPLEMENTATION_PARTIAL` | lifecycle fechado; faltam resultados normativos de erro por transição |
| CreativeAsset moderation | `IMPLEMENTATION_PARTIAL` | outcomes definidos; state representation e errors incompletos |
| WithdrawalBatch | `IMPLEMENTATION_PARTIAL` | estados/finais definidos; errors e eventos sob gap/schema incompatível incompletos |
| Installation | `IMPLEMENTATION_PARTIAL` | estados definidos; errors, expected revision e timeout result incompletos |
| EdgeInstallation | `IMPLEMENTATION_PARTIAL` | lifecycle definido; errors e state payload incompletos |
| TVCapability | `IMPLEMENTATION_PARTIAL` | lifecycle definido; fallback de policy incompatível e errors ausentes |

## 8. Checklist por Saga autorizada

| Saga | Status | Lacunas |
| --- | --- | --- |
| Governance investigation/review | `IMPLEMENTATION_PARTIAL` | estado persistido da Saga, error codes, timeout policy, dedupe store e recovery checkpoint não definidos |
| Governance appeal/reevaluation | `IMPLEMENTATION_PARTIAL` | estado persistido, retry envelope, checkpoint e error codes não definidos |

O lifecycle do Aggregate é suficiente. A implementação do coordenador de Saga não é determinística sem seu próprio estado e contratos de recuperação.

## 9. Lista mínima de ajustes para PARTIAL → READY

### 9.1 Ajustes transversais

1. catálogo normativo de erros por artefato:
   - código estável;
   - significado;
   - condição;
   - retryability;
   - consumidor;
   - relação com HTTP/mensagem apenas em etapa técnica posterior;
2. política de snapshot por Aggregate:
   - permitido/proibido;
   - conteúdo conceitual;
   - versão;
   - validação;
   - descarte;
   - fallback para replay integral;
3. política de evolução de Event:
   - compatibility;
   - upcast;
   - Event desconhecido;
   - schema inválido;
   - preservação do Event original;
4. contrato normativo de resultado de Command:
   - accepted;
   - rejected;
   - duplicate;
   - conflict;
   - expired, quando aplicável;
5. testes normativos mínimos por Aggregate:
   - happy path;
   - cada invariante;
   - cada transição proibida;
   - optimistic concurrency;
   - idempotência;
   - replay;
   - snapshot + replay;
   - schema antigo;
   - Event desconhecido.

### 9.2 Ajustes específicos

| Artefato | Ajuste mínimo adicional |
| --- | --- |
| GovernanceCase | snapshot policy + error catalog + schema evolution |
| Campaign | payloads completos + error catalog + snapshot/schema policy |
| CreativeAsset | especificação autônoma do root ou declaração normativa de que não é root |
| DeviceRegistry | reidratação/snapshot + schemas e erros |
| Installation | concurrency por transição + errors + snapshot |
| EdgeInstallation | estado persistido completo + errors + snapshot |
| TVCapability | fallback de policy incompatível + errors + snapshot |
| WithdrawalBatch | gap/schema handling + snapshot + errors |
| FinancialPolicy | Aggregate/state machine completos |
| NetworkInventory | checkpoint, invalidation, migration e atomic rebuild |
| Governance Sagas | estado persistido, checkpoint, timeout/retry e errors |

Esses ajustes descrevem informação faltante. Não determinam seu conteúdo.

## 10. Lista definitiva de IMPLEMENTATION_READY

### Value Objects

- `ResponsibleParty`;
- `ResponsibilityCategory`;
- `Severity`;
- `Confidence`.

### Entity

- `ResponsibilityDecision`.

### State Machine

- GovernanceCase State Machine.

Nenhum Aggregate root, Command, Event, Saga, Projection, Read Model, Policy ou Integration Contract atingiu readiness integral.

## 11. Vertical Slice

### Candidato preferencial: GovernanceCase

`GovernanceCase` continua sendo o melhor candidato por possuir:

- boundary inequívoco;
- invariantes extensas;
- lifecycle completo;
- optimistic concurrency;
- idempotência;
- ordering;
- replay e rebuild;
- eventos proibidos;
- semântica de reavaliação fechada.

**Status atual:** `IMPLEMENTATION_PARTIAL`.

Ele não deve iniciar como referência definitiva antes de receber:

1. catálogo de erros;
2. snapshot policy;
3. schema evolution/upcasting;
4. testes normativos mínimos;
5. contratos internos dos Value Objects ainda parciais.

### Alternativas

Nenhum outro Aggregate autorizado possui readiness superior. `Campaign`, `WithdrawalBatch`, `Installation` e `TVCapability` possuem mais lacunas ou dependências internas.

## 12. Parecer

**Implementation Readiness global:** `NOT READY`.

**Artefatos prontos:** cinco artefatos de modelo e uma State Machine.  
**Aggregate roots prontos:** zero.  
**Commands prontos:** zero.  
**Events prontos como contratos serializados:** zero.  
**Sagas prontas:** zero.

O próximo trabalho permitido não é gerar o domínio. É preencher, por aprovação explícita, os contratos técnicos/normativos mínimos listados na seção 9, começando por GovernanceCase. A CGS Parte A pode ser preparada em paralelo desde que não escolha o conteúdo dessas lacunas.

