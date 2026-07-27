# Architecture Lock Review V1

**Data:** 2026-07-27  
**Commit-base:** `1fa965e`  
**Autoridade:** ADRs aceitas → Platform Specification → specifications especializadas → Decision Registry → Domain Freeze Review V3  
**Escopo:** implementabilidade por artefato; o Domain Freeze não é reavaliado.

## 1. Critério de autorização

Cada artefato recebe exatamente um status:

- `IMPLEMENTATION_AUTHORIZED`;
- `IMPLEMENTATION_BLOCKED_DOMAIN`;
- `IMPLEMENTATION_BLOCKED_ARCHITECTURE`;
- `IMPLEMENTATION_BLOCKED_PRODUCTION`;
- `IMPLEMENTATION_BLOCKED_MULTIPLE`.

`IMPLEMENTATION_AUTHORIZED` exige simultaneamente:

1. ausência de Domain e Architecture Blocker;
2. owner, root, producer e contrato únicos quando aplicáveis;
3. lifecycle, terminalidade e invariantes completos quando aplicáveis;
4. boundary e fonte normativa inequívocos;
5. nenhuma dependência transitiva de artefato bloqueado.

Documentation Debt não bloqueia quando a fonte superior resolve a implementação. Production Blocker permite escrever código isolado, mas o status permanece `IMPLEMENTATION_BLOCKED_PRODUCTION` porque o artefato não está autorizado para operação real.

## 2. Resultado executivo

O Architecture Lock não está limpo.

Foram encontradas dependências que não estavam visíveis apenas pela lista de `OPEN-*`:

- `RefundAdvertiserByResponsibility` mistura dois Aggregate owners;
- `AdvertiserRefundRecorded` mistura dois produtores;
- `ReconcileFinancialOperation`, `RecordPlatformLoss`, `RecoverFromResponsibleParty` e seus Events usam owners genéricos;
- o catálogo global trata aliases e nomes especializados como se fossem um contrato único;
- `PlaybackAttempt` e `PlayerSession` contaminam Commands, Events, State Machines e Sagas de recovery;
- a reversão tardia de Evidence contamina Settlement e consequências financeiras;
- Public API, AsyncAPI, Protobuf, Topics, Streams e Repositories ainda não possuem catálogos normativos próprios;
- vários Bounded Contexts existem estrategicamente, mas não possuem especificação de artefatos suficiente para geração de código.

Autorização é concedida somente aos artefatos explicitamente listados como autorizados. Ausência na lista não significa autorização.

**Regra de fechamento da matriz:** todo artefato declarado no repositório que não apareça individualmente ou dentro de uma família nominal exaustiva desta revisão recebe `IMPLEMENTATION_BLOCKED_ARCHITECTURE`. A causa é ausência de um registro de lock que demonstre owner, contrato e dependências; não se presume autorização pelo nome.

## 3. Matriz de Bounded Contexts

| Bounded Context | Status | Bloqueio determinante |
| --- | --- | --- |
| Campaign Management | `IMPLEMENTATION_BLOCKED_MULTIPLE` | integrações Slot/Budget/Pricing/Playback e catálogo público |
| TV Network | `IMPLEMENTATION_BLOCKED_PRODUCTION` | thresholds/SLOs; divergências editoriais de ownership possuem precedência |
| Edge Runtime | `IMPLEMENTATION_BLOCKED_MULTIPLE` | PlaybackAttempt↔PlayerSession, ordering/gaps, tolerância |
| Evidence Ledger | `IMPLEMENTATION_BLOCKED_DOMAIN` | tolerância, gaps e reversão tardia |
| Telemetry | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | contrato próprio de ingestão/custódia/projeção não está consolidado |
| Pricing Engine | `IMPLEMENTATION_BLOCKED_DOMAIN` | precisão, moeda, arredondamento e residual |
| Settlement | `IMPLEMENTATION_BLOCKED_DOMAIN` | fiscalidade, conservação e reversão tardia |
| Quantum Integration | `IMPLEMENTATION_BLOCKED_DOMAIN` | efeito de reversão/anchor tardio no fluxo integral |
| Influencer Network | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | catálogo completo de Aggregates/Commands/Events ausente |
| CRM | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | contratos e lifecycle não certificados |
| AI Orchestration | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | contratos públicos ainda usam recomendações não consolidadas/wildcard |
| User Identity | `IMPLEMENTATION_BLOCKED_PRODUCTION` | matriz completa de autorização, LGPD e segurança |
| Marketplace | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | Aggregates e lifecycle transacional não certificados |
| Notifications | `IMPLEMENTATION_BLOCKED_PRODUCTION` | preferências/entrega dependem de privacidade e políticas operacionais |
| Analytics | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | read models, freshness e contratos de rebuild não catalogados |
| Insurance | `IMPLEMENTATION_BLOCKED_MULTIPLE` | capitalização do fundo, fiscalidade, Commands/Events incompletos |
| Financial Platform | `IMPLEMENTATION_BLOCKED_MULTIPLE` | conservação, fiscalidade, chargeback, owners/producers ambíguos |
| Configuration Service | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | Aggregate/stream/API de publicação de policy não certificados |
| Governance & Dispute Management | `IMPLEMENTATION_AUTHORIZED` | Aggregate, Commands, Events e lifecycle possuem specs únicas; efeitos downstream não pertencem ao owner |

## 4. Matriz de Aggregates

| Aggregate | Contexto | Status | Dependência |
| --- | --- | --- | --- |
| `GovernanceCase` | Governance | `IMPLEMENTATION_AUTHORIZED` | `DEC-041/042`, spec e máquina completas |
| `Campaign` | Campaign | `IMPLEMENTATION_AUTHORIZED` | lifecycle interno `OPEN-036..048` fechado |
| `CreativeAsset` | Campaign | `IMPLEMENTATION_AUTHORIZED` | moderação e autoria fechadas; SLA é externo/produtivo |
| `Slot` | Campaign | `IMPLEMENTATION_BLOCKED_MULTIPLE` | budget, pricing, playback e catálogo público |
| `CampaignBudget` | Financial | `IMPLEMENTATION_BLOCKED_DOMAIN` | conservação/precisão e consequências financeiras |
| `PricingPolicy` | Pricing | `IMPLEMENTATION_BLOCKED_DOMAIN` | precisão/residual afetam cálculo |
| `PricingQuote` | Pricing | `IMPLEMENTATION_BLOCKED_DOMAIN` | Money normativo ainda aberto |
| `Payment` | Financial | `IMPLEMENTATION_BLOCKED_DOMAIN` | parcial/excedente/chargeback/fiscal |
| `PaymentLedger` | Financial | `IMPLEMENTATION_BLOCKED_DOMAIN` | modelo contábil e conservação |
| `AdvertiserAccount` | Financial | `IMPLEMENTATION_BLOCKED_MULTIPLE` | refund owner/producer e ledger |
| `PartnerLedger` | Financial | `IMPLEMENTATION_BLOCKED_DOMAIN` | conservação, chargeback e saldo negativo |
| `Withdrawal` | Financial | `IMPLEMENTATION_BLOCKED_MULTIPLE` | limites produtivos, compensação e contratos globais |
| `WithdrawalBatch` | Financial | `IMPLEMENTATION_AUTHORIZED` | lifecycle `OPEN→SEALED→SUBMITTED→RECONCILING→CLOSED` fechado |
| `FinancialPolicy` | Financial | `IMPLEMENTATION_AUTHORIZED` | versionamento prospectivo e imutabilidade definidos |
| `Settlement` | Settlement | `IMPLEMENTATION_BLOCKED_DOMAIN` | fiscalidade/conservação/reversão tardia |
| `SplitShare` | Settlement | `IMPLEMENTATION_BLOCKED_DOMAIN` | precisão, residual e compensação |
| `EvidenceRecord` | Evidence | `IMPLEMENTATION_BLOCKED_DOMAIN` | tolerância, gap e reversão tardia |
| `QuantumAnchor` | Quantum | `IMPLEMENTATION_BLOCKED_DOMAIN` | parte comportamental de `OPEN-028` |
| `PlaybackAttempt` | Edge/Player | `IMPLEMENTATION_BLOCKED_MULTIPLE` | cardinalidade, recovery e tolerância |
| `PlayerSession` | Edge/Player | `IMPLEMENTATION_BLOCKED_MULTIPLE` | owner/recovery/terminalidade |
| `TV` | TV Network | `IMPLEMENTATION_BLOCKED_PRODUCTION` | thresholds e SLOs para ativação real |
| `DeviceRegistry` | TV Network | `IMPLEMENTATION_AUTHORIZED` | identidade, binding e replacement definidos por ADR-008/DEC-017 |
| `Installation` | TV Network | `IMPLEMENTATION_AUTHORIZED` | ordem com Provisioning fechada por `DEC-016` |
| `EdgeInstallation` | TV Network | `IMPLEMENTATION_AUTHORIZED` | identidade/credencial e owner definidos |
| `TVCapability` | TV Network | `IMPLEMENTATION_AUTHORIZED` | lifecycle declarativo e independência de Facets definidos |
| `Fleet` | TV Network | `IMPLEMENTATION_BLOCKED_PRODUCTION` | score/thresholds operacionais |
| `UpdateRollout` | TV Network | `IMPLEMENTATION_BLOCKED_PRODUCTION` | wave gates/thresholds quantitativos |
| `MaintenanceWindow` | TV Network | `IMPLEMENTATION_BLOCKED_PRODUCTION` | autorização/expiração produtivas |
| `EmergencyBroadcast` | TV/Execution | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | Command de emergência sem owner único |
| `InsurancePolicy` | Insurance | `IMPLEMENTATION_BLOCKED_DOMAIN` | funding/fiscal |
| `InsuranceClaim` | Insurance | `IMPLEMENTATION_BLOCKED_MULTIPLE` | lifecycle incompleto e funding |
| `InsuranceReserve` | Insurance | `IMPLEMENTATION_BLOCKED_DOMAIN` | capitalização do fundo |
| `User` | Identity | `IMPLEMENTATION_BLOCKED_PRODUCTION` | LGPD/autorização |
| `PricingPolicy` read-side aliases | catálogos globais | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | alias não substitui root especializado |

## 5. Entities, Value Objects e Domain Services

### 5.1 Implementation Authorized

| Tipo | Artefato |
| --- | --- |
| Entity | `ResponsibilityDecision`, `EvidenceReference`, `Investigation`, `Appeal` dentro de GovernanceCase |
| Value Object | `ResponsibleParty`, `ResponsibilityCategory`, `Severity`, `Confidence`, `GovernancePolicyVersion`, `DecisionRevision` |
| Value Object | `CampaignIdentifier`, `TVIdentifier`, `PlaybackWindow`, `AssetReference` |
| Value Object | `DeviceIdentity`, `EdgeInstallationIdentity`, `CapabilityManifestVersion` |
| Domain Service | cálculo determinístico de equivalência de realocação, apenas como avaliação sem criar Slot |
| Domain Service | reconciler declarativo de Desired/Current/Observed State, apenas para emitir Commands ao owner |

### 5.2 Blocked

| Tipo | Artefato | Status | Motivo |
| --- | --- | --- | --- |
| Value Object | `Money` | `IMPLEMENTATION_BLOCKED_DOMAIN` | precisão, moeda, arredondamento e residual |
| Value Object | `PricingQuote` quando usado como VO legado | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | conflita com Aggregate normativo `PricingQuote` |
| Entity | `SplitShare` | `IMPLEMENTATION_BLOCKED_DOMAIN` | valor/residual e compensação |
| Entity | `PlaybackAttempt` dentro de PlayerSession | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | cardinalidade e boundary não fechados |
| Domain Service | Settlement Calculator | `IMPLEMENTATION_BLOCKED_DOMAIN` | fiscalidade, precisão e conservação |
| Domain Service | Financial Reconciliation | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | owner genérico e Events genéricos |
| Domain Service | HealthScore Calculator | `IMPLEMENTATION_BLOCKED_PRODUCTION` | thresholds versionados não aprovados |
| Domain Service | Evidence Validator | `IMPLEMENTATION_BLOCKED_DOMAIN` | tolerância e gaps |
| Domain Service | Refund/Chargeback Allocator | `IMPLEMENTATION_BLOCKED_DOMAIN` | perda e alocação não decididas |

## 6. Commands

### 6.1 Implementation Authorized

Cada Command abaixo possui owner único, pré/pós-condição e Event especializado:

| Contexto | Commands |
| --- | --- |
| Governance | `OpenGovernanceCase`, `AttachEvidenceReference`, `StartInvestigation`, `RequestHumanReview`, `ClassifyResponsibility`, `PublishDecision`, `AppealDecision`, `ReevaluateGovernanceCase`, `CloseGovernanceCase` |
| Campaign core | `CreateCampaign`, `MarkCampaignReady`, `PublishCampaign`, `ActivateCampaign`, `PauseCampaign`, `AddCampaignPauseCause`, `RemoveCampaignPauseCause`, `ResumeCampaign`, `CancelCampaign`, `FinalizeCampaignCancellation`, `ExpireCampaign`, `CompleteCampaign`, `UploadCreativeAsset`, `RecordCreativeAssetVerdict`, `ReviseCampaignStrategy` |
| TV identity/install | `RegisterTV`, `RegisterDevice`, `BindDeviceToTV`, `UnbindDeviceFromTV`, `ReplaceDevice`, `DecommissionDevice`, `PlanInstallation`, `StartInstallation`, `RecordInstallationCheck`, `VerifyInstallation`, `AcceptInstallation`, `CancelInstallation`, `CreateEdgeInstallation`, `StartEdgeProvisioning`, `RegisterEdgeIdentity`, `CompleteEdgeProvisioning`, `FailEdgeProvisioning` |
| TV capability | `DeclareCapability`, `ValidateCapability`, `ActivateCapability`, `SuspendCapability`, `DegradeCapability`, `RecoverCapability`, `RetireCapability` |
| WithdrawalBatch | `OpenWithdrawalBatch`, `SealWithdrawalBatch`, `SubmitWithdrawalBatch`, `ReconcileWithdrawalBatch`, `CloseWithdrawalBatch` |
| FinancialPolicy | `ChangeFinancialPolicy` |

### 6.2 Implementation Blocked Domain

| Commands | Dependência |
| --- | --- |
| `CalculatePrice`, `OverridePrice`, `ApplyPricingQuote` | `OPEN-019` |
| `ReserveCampaignBudget`, `ConsumeCampaignBudget`, `ReleaseCampaignBudget`, `CloseCampaignBudget` | conservação/precisão/consequências |
| `RegisterPayment`, `RecordPaymentReceived`, `StartPaymentCompensation`, `ConfirmPaymentCompensation`, `CancelPayment`, `DisputePayment`, `FailPayment` | `OPEN-016..020/025` |
| `PostPaymentLedgerEntry`, `PostPaymentCompensatingEntry`, `CreateCompensatingLedgerEntry` | `OPEN-019/020` |
| `BuildEvidence`, `ValidateEvidence`, `ReverseEvidence`, `ResolveEvidenceDispute` | `OPEN-004/028/029` |
| `CalculateSettlement`, `AuthorizeSettlement`, `PublishSettlementRights` | `OPEN-006/019/020/028` |
| `CreateInsuranceReserve`, `ReleaseInsuranceReserve`, `SettleInsuranceObligation` | `OPEN-006/009` |

### 6.3 Implementation Blocked Architecture

| Commands | Dependência |
| --- | --- |
| `RefundAdvertiserByResponsibility` | owner `AdvertiserAccount/Payment` |
| `RecordPlatformLoss` | “ledger financeiro aplicável” |
| `RecoverFromResponsibleParty` | “ledger da obrigação” |
| `ReconcileFinancialOperation` | owner definido dinamicamente |
| `DeclareEmergencyBroadcast` e coordenação associada | `SYNC-014/OPEN-027` |
| recommendation Commands representados por aliases/wildcards | `OPEN-033` |

### 6.4 Implementation Blocked Multiple

| Commands | Dependência |
| --- | --- |
| `PreparePlayback`, `StartPlayback`, `FinishPlayback`, `InterruptPlayback`, `ResumePlaybackAttempt`, `PreemptPlayerSession`, `RestorePlayerSession` | `OPEN-004/029/034` |
| `RequestWithdrawal`, `ApproveWithdrawal`, `ExecuteWithdrawal`, `RecordWithdrawalResult`, `RetryWithdrawal` | limites, ledger, compensação e contratos |
| `ReserveSlot`, `RevokeSlot`, `ExpireSlot`, `RequestSlotReallocation` | Budget/Pricing/Execution/Saga |

### 6.5 Implementation Blocked Production

`RecordHeartbeat`, `RecordHealthObservation`, `AssessOperationalHealth`, `StartUpdateWave`, `ApplyUpdate`, `RollbackUpdate`, `RequestRemoteDiagnosis`, `RestartProcess`, `ScheduleMaintenanceWindow` e Commands de papel/autorização real possuem estrutura implementável, mas não estão autorizados para operação real antes de `OPEN-002/005/007/031/032`.

## 7. Events

### 7.1 Implementation Authorized

| Família | Events |
| --- | --- |
| Governance | `GovernanceCaseOpened`, `EvidenceReferenceAttached`, `InvestigationStarted`, `HumanReviewRequested`, `ResponsibilityDecisionPublished`, `ResponsibilityDecisionAppealed`, `GovernanceCaseReevaluationStarted`, `GovernanceCaseReevaluated`, `GovernanceCaseClosed` |
| Campaign core | `CampaignCreated`, `CampaignReady`, `CampaignPublished`, `CampaignActivated`, `CampaignPaused`, `CampaignPauseCauseRemoved`, `CampaignResumed`, `CampaignCancellationRequested`, `CampaignCancelled`, `CampaignExpired`, `CampaignCompleted`, `CampaignStrategyRevised`, `CreativeAssetUploaded`, `CreativeAssetApproved`, `CreativeAssetRejected` |
| TV identity/install | `TvRegistered`, `DeviceRegistered`, `DeviceBoundToTV`, `DeviceReplaced`, `DeviceDecommissioned`, `InstallationCheckRecorded`, `InstallationVerified`, `InstallationAccepted`, `InstallationFailed`, `EdgeProvisioningStarted`, `EdgeIdentityRegistered` |
| TV capability | `CapabilityDeclared`, `CapabilityActivated`, `CapabilityRetired` |
| WithdrawalBatch | `WithdrawalBatchOpened`, `WithdrawalBatchSealed`, `WithdrawalBatchSubmitted`, `WithdrawalBatchReconciliationUpdated`, `WithdrawalBatchClosed` |
| FinancialPolicy | `FinancialPolicyChanged` |

### 7.2 Implementation Blocked Domain

| Events | Dependência |
| --- | --- |
| `PriceQuoted`, `PriceApplied`, `PriceOverridden` | Money/precision |
| `CampaignBudgetIncreased`, `CampaignBudgetReserved`, `CampaignBudgetConsumed`, `CampaignBudgetReleased` | conservação/precisão |
| `PaymentRegistered`, `PaymentReceived`, `PaymentCompensated`, `PaymentDisputed`, `PaymentFailed` | parcial/chargeback/fiscal |
| `EvidenceValidated`, `EvidenceRejected`, `EvidenceReversed`, `EvidenceDisputeResolved` | tolerância/gaps/reversão |
| `SplitCalculated`, `SettlementAuthorized`, `SplitShareReady`, `SplitShareCredited` | fiscal/precision/conservation |

### 7.3 Implementation Blocked Architecture

| Events | Dependência |
| --- | --- |
| `AdvertiserRefundRecorded` | producer `AdvertiserAccount/Payment` |
| `PlatformLossRecorded`, `ResponsiblePartyRecoveryRecorded` | producer genérico |
| `FinancialReconciliationRequired`, `FinancialReconciliationCompleted` | producer genérico |
| `*Recommended` e equivalentes não especializados | wildcard/`OPEN-033` |
| evento de retirada de Insurance Claim ainda “a sincronizar” | contrato ausente |

### 7.4 Implementation Blocked Multiple

`PlaybackPrepared`, `PlaybackStarted`, `PlaybackFinished`, `PlaybackInterrupted`, `PlaybackRecovered`, `PlaybackFailed`, `PlaybackEventSigned`, `PlaybackEventSubmitted`, `SlotEvidenced`, `WithdrawalApproved`, `WithdrawalExecuted`, `WithdrawalFailed` e `WithdrawalRetryScheduled` atravessam blockers de domínio e arquitetura.

### 7.5 Implementation Blocked Production

Events de Heartbeat, Health, Update, Maintenance, diagnóstico remoto e telemetria podem possuir schema interno de desenvolvimento, mas não contrato operacional certificado enquanto thresholds, SLAs, retenção e autorização permanecerem abertos.

## 8. State Machines

| State Machine | Status | Motivo |
| --- | --- | --- |
| GovernanceCase | `IMPLEMENTATION_AUTHORIZED` | completa, incluindo reavaliação |
| Campaign | `IMPLEMENTATION_AUTHORIZED` | lifecycle fechado |
| CreativeAsset moderation | `IMPLEMENTATION_AUTHORIZED` | decisões finais e human review definidos |
| WithdrawalBatch | `IMPLEMENTATION_AUTHORIZED` | terminalidade fechada |
| Installation | `IMPLEMENTATION_AUTHORIZED` | gates e finais definidos |
| EdgeInstallation | `IMPLEMENTATION_AUTHORIZED` | lifecycle especializado definido |
| TVCapability | `IMPLEMENTATION_AUTHORIZED` | lifecycle especializado definido |
| Payment | `IMPLEMENTATION_BLOCKED_DOMAIN` | chargeback/parcial/fiscal |
| CampaignBudget | `IMPLEMENTATION_BLOCKED_DOMAIN` | conservação e consequências |
| Withdrawal | `IMPLEMENTATION_BLOCKED_MULTIPLE` | ledger/compensação/parâmetros |
| Settlement/SplitShare | `IMPLEMENTATION_BLOCKED_DOMAIN` | fiscal/precision/reversal |
| EvidenceRecord/QuantumAnchor | `IMPLEMENTATION_BLOCKED_DOMAIN` | reversão tardia |
| PlaybackAttempt/PlayerSession | `IMPLEMENTATION_BLOCKED_MULTIPLE` | boundary, cardinalidade, recovery, tolerância |
| InsuranceClaim | `IMPLEMENTATION_BLOCKED_MULTIPLE` | evento ausente e funding |
| TV/Fleet/UpdateRollout | `IMPLEMENTATION_BLOCKED_PRODUCTION` | thresholds/SLOs |

## 9. Projections e Read Models

| Artefato | Status | Motivo |
| --- | --- | --- |
| Governance case timeline | `IMPLEMENTATION_AUTHORIZED` | rebuild append-only definido |
| Responsibility decision current view | `IMPLEMENTATION_AUTHORIZED` | revisão máxima sem alterar histórico |
| NetworkInventory | `IMPLEMENTATION_AUTHORIZED` | projeção explicitamente derivada |
| PartnerWallet | `IMPLEMENTATION_BLOCKED_DOMAIN` | depende de PartnerLedger não certificado |
| Campaign delivery projection | `IMPLEMENTATION_BLOCKED_MULTIPLE` | Slot/Playback/Evidence |
| Health/OperationalHealth/FleetHealth | `IMPLEMENTATION_BLOCKED_PRODUCTION` | thresholds e staleness produtivos |
| Analytics projections | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | catálogo/freshness/rebuild por projeção ausente |
| Settlement eligibility view | `IMPLEMENTATION_BLOCKED_DOMAIN` | Evidence reversal/anchor |
| Financial reconciliation view | `IMPLEMENTATION_BLOCKED_MULTIPLE` | producers e ledger |

## 10. Policies

| Policy | Status |
| --- | --- |
| GovernancePolicyVersion | `IMPLEMENTATION_AUTHORIZED` |
| Campaign pause/reallocation policies já versionadas | `IMPLEMENTATION_AUTHORIZED` |
| FinancialPolicy envelope/versioning | `IMPLEMENTATION_AUTHORIZED` |
| Pricing monetary policy | `IMPLEMENTATION_BLOCKED_DOMAIN` |
| Ledger accounting policy | `IMPLEMENTATION_BLOCKED_DOMAIN` |
| Chargeback/refund policy | `IMPLEMENTATION_BLOCKED_DOMAIN` |
| Evidence tolerance/gap policy | `IMPLEMENTATION_BLOCKED_DOMAIN` |
| Health/rollout/timeout operational policies | `IMPLEMENTATION_BLOCKED_PRODUCTION` |
| Authorization/segregation policy | `IMPLEMENTATION_BLOCKED_PRODUCTION` |
| Retention/privacy policy | `IMPLEMENTATION_BLOCKED_PRODUCTION` |

## 11. Sagas

| Saga | Status | Bloqueio |
| --- | --- | --- |
| Governance investigation/review | `IMPLEMENTATION_AUTHORIZED` | lifecycle interno fechado |
| Governance appeal/reevaluation | `IMPLEMENTATION_AUTHORIZED` | `DEC-042` |
| Campaign activation | `IMPLEMENTATION_BLOCKED_MULTIPLE` | Pricing/Budget/Slot |
| Payment→Ledger→CampaignBudget | `IMPLEMENTATION_BLOCKED_DOMAIN` | parcial, conservação, fiscal |
| Slot allocation/reallocation | `IMPLEMENTATION_BLOCKED_MULTIPLE` | contratos e comportamento |
| Playback | `IMPLEMENTATION_BLOCKED_MULTIPLE` | tolerance/gaps/Attempt↔Session |
| Evidence→Anchor | `IMPLEMENTATION_BLOCKED_DOMAIN` | reversão tardia |
| Evidence→Settlement | `IMPLEMENTATION_BLOCKED_DOMAIN` | elegibilidade/reversão |
| Withdrawal | `IMPLEMENTATION_BLOCKED_MULTIPLE` | ledger, retry, compensação |
| Insurance claim/payout | `IMPLEMENTATION_BLOCKED_MULTIPLE` | funding, fiscal, evento ausente |
| Update rollout | `IMPLEMENTATION_BLOCKED_PRODUCTION` | thresholds |
| Emergency broadcast | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | owner de Commands |
| Edge offline replay | `IMPLEMENTATION_BLOCKED_DOMAIN` | ordering/gaps/TTL semântico |
| Responsibility consequence execution | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | Commands/Events financeiros com owner/produtor genérico |

## 12. Integration Contracts, APIs e persistência

| Tipo | Artefato | Status | Motivo |
| --- | --- | --- | --- |
| Integration Contract | Governance `ResponsibilityDecisionPublished` | `IMPLEMENTATION_AUTHORIZED` | produtor/payload/revision únicos |
| Integration Contract | Campaign lifecycle Events | `IMPLEMENTATION_AUTHORIZED` | produtor único |
| Integration Contract | Financial consequences of Governance | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | owner/produtor ambíguo |
| Integration Contract | Playback/Evidence | `IMPLEMENTATION_BLOCKED_MULTIPLE` | Attempt/Session, tolerance, gaps |
| Integration Contract | Evidence/Settlement | `IMPLEMENTATION_BLOCKED_DOMAIN` | reversal/eligibility |
| Public API | todas | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | nenhum catálogo OpenAPI normativo certificado |
| AsyncAPI | todos | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | nenhum documento AsyncAPI foi certificado; Events autorizados são insumo, não o artefato técnico |
| Protobuf | todos | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | schemas/versionamento não certificados individualmente |
| Topic | todos | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | nomes, partition key, retention e ACL não normativos |
| Stream | todos os streams físicos | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | catálogo de nomes, metadata, snapshots e retenção não existe |
| Repository | todos | `IMPLEMENTATION_BLOCKED_ARCHITECTURE` | Aggregate autorizado não define por si só interface, consistência e persistência do Repository |

## 13. Mapa de dependências

```text
Campaign
  ├─ PricingQuote ──[DOMAIN: OPEN-019]
  ├─ CampaignBudget ──[DOMAIN: OPEN-019/020]
  └─ Slot
      └─ PlaybackAttempt/PlayerSession ──[MULTIPLE: OPEN-004/029/034]
          └─ EvidenceRecord ──[DOMAIN: OPEN-004/028/029]
              ├─ QuantumAnchor ──[DOMAIN: OPEN-028]
              └─ Settlement ──[DOMAIN: OPEN-006/019/020/028]
                  └─ PartnerLedger ──[DOMAIN: OPEN-016..020]
                      └─ Withdrawal ──[MULTIPLE]

Payment ──[DOMAIN: OPEN-016..020/025]
  └─ PaymentLedger ──[DOMAIN: OPEN-019/020]
      └─ CampaignBudget

TV Network
  ├─ DeviceRegistry/Installation/EdgeInstallation/TVCapability ──[AUTHORIZED]
  ├─ Health/Fleet/Update ──[PRODUCTION]
  └─ Emergency ──[ARCHITECTURE: OPEN-027]

GovernanceCase ──[AUTHORIZED]
  └─ ResponsibilityDecisionPublished ──[AUTHORIZED]
      ├─ Campaign consequence ──[dependent artifact]
      ├─ Settlement consequence ──[DOMAIN blockers]
      └─ Financial consequence ──[ARCHITECTURE + DOMAIN blockers]
```

## 14. Árvore de bloqueios

```text
DOMAIN
├─ Money/fiscal/conservation
│  ├─ Pricing
│  ├─ CampaignBudget
│  ├─ Payment/Ledger
│  ├─ Settlement/SplitShare
│  └─ Withdrawal/Insurance
├─ Playback tolerance/order/gaps
│  ├─ PlaybackAttempt
│  ├─ EvidenceRecord
│  └─ Edge offline replay
└─ late reversal/compensation
   ├─ QuantumAnchor
   ├─ Settlement
   └─ Financial consequences

ARCHITECTURE
├─ global Command/Event catalog
├─ PlaybackAttempt↔PlayerSession
├─ emergency owner
├─ financial generic owners/producers
└─ OpenAPI/AsyncAPI/Protobuf/Topic/Stream catalogs

PRODUCTION
├─ authorization/LGPD/security
├─ retention/idempotency retention
├─ Health/rollout thresholds
└─ SLO/TTL/retry numeric policies
```

## 15. Lista mínima de decisões restantes

1. Money: precisão, moeda, arredondamento e residual.
2. Ledger: modelo contábil e equações de conservação.
3. Fiscal: cálculo, retenção, nota e lançamentos.
4. Chargeback/refund: consequência após consumo e alocação da perda.
5. Payment: parcial, excedente, duplicado e alocação.
6. Playback: tolerância de 15 segundos.
7. Offline Evidence: ordering, gaps e atraso.
8. Evidence/Anchor: reversão tardia e efeito financeiro.
9. PlaybackAttempt/PlayerSession: boundary, cardinalidade e recovery.
10. Catálogo público: Command owner, Event producer e contratos ausentes.
11. Financial Governance consequences: owner/produtor específicos.
12. Emergency: owner único.
13. Insurance Fund: capitalização.
14. Production policies: autorização, segurança, retenção, SLOs e thresholds.

## 16. Listas finais

### 16.1 Artefatos 100% implementáveis

- GovernanceCase e seu modelo interno;
- Commands, Events e State Machine de Governance;
- Campaign Aggregate e lifecycle interno;
- CreativeAsset e moderação;
- DeviceRegistry;
- Installation;
- EdgeInstallation;
- TVCapability;
- WithdrawalBatch;
- FinancialPolicy como envelope prospectivo;
- NetworkInventory projection;
- `ResponsibilityDecisionPublished` como contrato público.

### 16.2 Artefatos parcialmente implementáveis

- TV Network operacional sem thresholds produtivos;
- Campaign Management sem Slot/Sagas transversais;
- Pricing sem cálculo monetário definitivo;
- Withdrawal sem ledger/execução real;
- Health, Update e Remote Operations apenas em ambiente não produtivo;
- projeções dependentes de Events autorizados.

“Parcialmente implementável” não é status de autorização. Cada subartefato continua usando um dos cinco status normativos.

### 16.3 Artefatos proibidos

- Ledger ou saldo oficial;
- contratos globais OpenAPI/AsyncAPI/Protobuf;
- Topics e streams físicos globais;
- Payment integral;
- Pricing monetário definitivo;
- Settlement integral;
- Playback recovery;
- Evidence validity integral;
- Withdrawal financeiro integral;
- Insurance payout;
- consequências financeiras de Governance;
- qualquer Command ou Event com owner/produtor genérico ou múltiplo.

## 17. Parecer

**Architecture Lock global:** `REJECTED`.

**Autorização incremental:** concedida somente aos artefatos marcados `IMPLEMENTATION_AUTHORIZED`.

O gerador de código deve rejeitar por padrão todo artefato ausente desta matriz ou marcado com qualquer status bloqueado. Documentation Debt não reduz autorização já comprovada; Production Blocker não pode ser convertido em configuração real por conveniência.
