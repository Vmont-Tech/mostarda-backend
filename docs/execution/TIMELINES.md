# Timelines — Execution Model

Estas timelines são vistas cronológicas normativas dos workflows definidos em [`SAGAS.md`](./SAGAS.md). Elas não representam transporte, API ou framework.

Legenda:

- `C:` Command aceito pelo owner.
- `E:` Event publicado pelo owner.
- `[state]`: pós-estado autoritativo.
- `?`: resultado ainda desconhecido; exige reconciliação.
- `X`: rejeição/falha conhecida; nenhum sucesso é inferido.

Eventos de streams diferentes podem chegar fora de ordem. As setas representam causação lógica, não ordering global.

## 1. Funding e ativação de Campaign

```text
Advertiser
  │ C:CreateCampaign
  ▼
Campaign [DRAFT] ──E:CampaignCreated
  │ Creative approved + C:MarkCampaignReady
  ▼
Campaign [READY] ──E:CampaignReady
  │ C:PublishCampaign
  ▼
Campaign [PUBLISHED] ──E:CampaignPublished

Advertiser ──funds──> Asaas
Asaas ──confirmed result──> Financial Platform
  │ C:RecordCompensatedPayment
  ▼
PaymentLedger ──E:PaymentCompensated
  │ C:IncreaseCampaignBudget
  ▼
CampaignBudget [AvailableBudget increased] ──E:CampaignBudgetIncreased
  │ causation + window ready
  ▼
Campaign owner ──C:ActivateCampaign──> Campaign [ACTIVE]
                                     └─E:CampaignActivated
```

Se o resultado do provider for desconhecido:

```text
Payment attempt ──timeout──> [? PENDING_RECONCILIATION]
       │
       ├─ consulta confirma compensação ──> PaymentCompensated
       └─ consulta confirma falha ─────────> falha financeira explícita

PROIBIDO: timeout ──> PaymentCompensated por suposição
```

## 2. Cotação, reserva de budget e Slot

```text
Campaign [ACTIVE]
  │ C:QuotePrice
  ▼
PricingPolicy ──E:PriceQuoted
  │ C:ApplyPriceQuote
  ▼
PricingQuote [APPLIED/immutable] ──E:PriceApplied
  │
  ├─ C:ReserveCampaignBudget ──> CampaignBudget ──E:CampaignBudgetReserved
  │      (momento exato permanece OPEN-013)
  │
  └─ C:ReserveSlot ──> Slot [ALLOCATED] ──E:SlotAllocated
                                           │
                                           ▼
                                    Edge local queue
```

Corrida pelo mesmo inventário:

```text
Intent A ──C:ReserveSlot(expected revision N)──┐
                                               ├─> Slot owner
Intent B ──C:ReserveSlot(expected revision N)──┘
                  │
                  ├─ A aceito ──> SlotAllocated [revision N+1]
                  └─ B CONFLICT ──> reavaliar; nunca criar sobreposição
```

Falha antes da exibição:

```text
Slot [ALLOCATED] ──C:RevokeSlot/ExpireSlot──> [REVOKED/EXPIRED]
       └─E:SlotRevoked/SlotExpired
              └─ C:ReleaseCampaignBudget ──> E:CampaignBudgetReleased
```

## 3. Provisionamento de TV

```text
Operator ──C:RegisterTV──> TV [REGISTERED] ──E:TvRegistered
Operator ──C:RegisterDevice──> DeviceRegistry ──E:DeviceRegistered
Operator ──C:BindDeviceToTV──> DeviceRegistry ──E:DeviceBoundToTV

                 ┌─ Physical track ───────────────────────────────┐
Technician ──C:VerifyInstallation──> Installation [VERIFIED]     │
Operator   ──C:AcceptInstallation──> Installation [ACCEPTED]     │
                 └────────────────────────────────────────────────┘

                 ┌─ Edge track ───────────────────────────────────┐
Provisioning ──C:ProvisionEdge──> EdgeInstallation [INSTALLING]  │
Edge/Security ──C:RegisterEdgeIdentity──> E:EdgeIdentityRegistered│
                 └────────────────────────────────────────────────┘

Edge ──C:DeclareCapability──> TVCapability [DECLARED]
TV Network ──C:ActivateCapability──> TVCapability [ACTIVE]
Edge ──C:RecordHeartbeat──> HealthRecord ──E:HeartbeatReceived
Health ──C:RecordHealthObservation──> E:HealthObserved

all gates confirmed
  └─ TV Network ──C:ActivateTV──> TV [ACTIVE] ──E:TvActivated
```

Installation e Provisioning não recebem ordem inventada enquanto `OPEN-011` estiver aberto. Se qualquer gate falhar, a TV permanece não ativa; os Aggregates já criados não são apagados.

## 4. Exibição bem-sucedida

```text
SlotAllocated
  ▼
Edge queue [Slot revision accepted]
  │ dispatch receipt
  ├─ C:RecordSlotDispatchedToEdge
  ▼
Slot [DISPATCHED] ──E:SlotDispatchedToEdge
  │ C:PreparePlayback
  ▼
PlayerSession [PREPARING] ──E:PlaybackPrepared
  │ C:StartPlayback
  ▼
PlayerSession [PLAYING] ──E:PlaybackStarted
  │ observed completion
  │ C:FinishPlayback
  ▼
PlayerSession [COMPLETED] ──E:PlaybackFinished
  │ C:SignPlaybackEvent
  ▼
PlaybackAttempt ──E:PlaybackEventSigned
  │ C:SubmitPlaybackEvent
  ▼
Cloud ingest ──E:PlaybackEventSubmitted

Campaign Management consumes PlaybackFinished
  └─ C:RecordSlotDelivered ──> Slot [DELIVERED] ──E:SlotDelivered
```

`PlaybackFinished` é fato físico; não significa Evidence `VALID`, anchor ou direito financeiro.

## 5. Exibição interrompida ou falha

```text
PlayerSession [PLAYING]
  │ interruption/failure
  ├─ C:InterruptPlayback ──> [INTERRUPTED/PREEMPTED]
  │                           └─E:PlaybackInterrupted
  └─ C:InterruptPlayback ──> [FAILED]
                              └─E:PlaybackFailed

policy permits another attempt?
  ├─ yes ──> new identified PlaybackAttempt
  └─ no  ──> Slot eventually REVOKED/EXPIRED
```

Contraexemplo proibido:

```text
attempt A: 8s + attempt B: 7s ─X─> "PlaybackFinished 15s"
```

## 6. Evidence e ancoragem

```text
PlaybackEventSubmitted
  │ C:BuildEvidence
  ▼
EvidenceRecord [PENDING_VALIDATION] ──E:EvidenceGenerated
  │ C:ValidateEvidence
  ├─ valid ─────> [VALID] ────────────E:EvidenceValidated
  ├─ invalid ───> [INVALID] ──────────E:EvidenceRejected
  └─ disputed ──> [DISPUTED] ─────────E:EvidenceDisputed

EvidenceRecord [VALID]
  │ C:PrepareCanonicalEvidencePackage
  ▼
Cloud package/hash ──E:EvidenceHashed
  │ C:AnchorEvidence
  ▼
QuantumAnchor [REQUESTED] ──E:AnchoringRequested
  ├─ confirmed ──> [CONFIRMED] ──E:AnchoringConfirmed
  ├─ known fail ──> [FAILED] ─────E:AnchoringFailed
  └─ timeout ─────> [? UNKNOWN] ───reconcile before retry
```

Owners permanecem distintos:

```text
Edge owns PlaybackEvent/Signature
Cloud Evidence Ledger owns EvidenceRecord/package
Quantum owns QuantumAnchor/receipt
```

Proibido: Quantum receber PlaybackEvent; Edge declarar `VALID`; falha de anchor tornar Evidence `INVALID`.

## 7. Disputa e reversão tardia

```text
Evidence [VALID]
  │ C:OpenEvidenceDispute
  ▼
[DISPUTED] ──E:EvidenceDisputed
  │ C:ResolveEvidenceDispute
  ├─ dispute rejected ──> [VALID] ──E:EvidenceDisputeResolved
  └─ evidence defect ───> [REVERSED]
                         └─E:EvidenceReversed

if Settlement still open:
  Settlement owner blocks/removes eligibility through valid Commands

if Settlement already CLOSED:
  Financial Platform creates compensating ledger entries
  Settlement remains CLOSED
```

## 8. Settlement e crédito no Partner Ledger

```text
eligible projection:
EvidenceRecord [VALID, not REVERSED] + QuantumAnchor [CONFIRMED]
  │
  ▼
Settlement ──C:OpenSettlementCycle──> [OPEN]
  └─E:SettlementCycleOpened
  │ C:CalculateSettlement
  ▼
[CALCULATING] ──E:SplitCalculated
  │              ├─ 30% Mostarda
  │              ├─ 20% TV owner
  │              ├─ 20% Venue owner
  │              ├─ 20% seller
  │              └─ 10% influencer
  │ C:AuthorizeSettlement
  ▼
[AUTHORIZED] ──E:SettlementAuthorized
  │ C:PublishSettlementRights
  ▼
[CLOSED] ──E:SettlementExecuted
            └─E:PartnerCreditRequested (one per eligible share)
                  │ C:CreditPartner
                  ▼
            PartnerLedger ──E:PartnerCredited
                  │
                  ▼
            PartnerWallet projection
```

Uma share `BLOCKED/UNCLAIMED` segue isolada; as demais avançam. `PartnerCredited` não é pagamento e não instrui Asaas.

## 9. Saque e pagamento ao parceiro

```text
Partner
  │ C:RequestWithdrawal
  ▼
Withdrawal [REQUESTED] ──E:WithdrawalRequested
  │ C:ApproveWithdrawal
  ├─ rejected ──> [REJECTED] ──E:WithdrawalRejected
  └─ approved ──> [APPROVED] ──E:WithdrawalApproved
                         │ C:AddWithdrawalToBatch
                         ▼
                    [BATCHED] ──E:WithdrawalBatched
                         │ C:ExecuteWithdrawal
                         ▼
                    [EXECUTING] ──E:WithdrawalExecutionRequested
                         │
                         ▼
                    Asaas adapter
                         ├─ confirmed ──> C:RecordWithdrawalResult
                         │                 └─[EXECUTED]
                         │                   E:WithdrawalExecuted
                         ├─ known fail ──> C:RecordWithdrawalResult
                         │                 └─[FAILED]
                         │                   E:WithdrawalFailed
                         └─ timeout ─────> [?] reconcile; do not resend
```

Fluxo canônico completo:

```text
Playback → Evidence VALID → QuantumAnchor CONFIRMED
→ Settlement right → PartnerLedger → PartnerWallet
→ Withdrawal → Asaas → Financial Platform reconciliation
```

Settlement termina no direito; nunca termina em pagamento.

## 10. Seguro

```text
Claimant ──C:FileInsuranceClaim──> InsuranceClaim [FILED]
                                     └─E:InsuranceClaimFiled
Insurance ──C:StartClaimAssessment──> [UNDER_REVIEW]
                                      └─E:InsuranceClaimAssessmentStarted
             ├─ C:RequestClaimInformation ──> remains UNDER_REVIEW
             └─ C:DecideInsuranceClaim
                    ├─ [DENIED] ──E:InsuranceClaimDenied
                    └─ [APPROVED] ──E:InsuranceClaimApproved
                           │ C:CreateInsuranceReserve
                           ▼
                     InsuranceReserve [COMMITTED]
                           ├─ C:AuthorizeRepair ─────> InsuranceRepair
                           └─ C:AuthorizeReplacement > InsuranceReplacement
                                      │
                                      ▼
                           C:SettleInsuranceObligation
                                      │
                                      ▼
                           E:InsuranceSettlementExecuted
                                      │
                                      ▼
                           InsuranceClaim [SETTLED]
```

Fonte de capitalização permanece `OPEN-009`. Insurance Settlement nunca é Settlement de mídia.

## 11. Atualização remota e rollback

```text
Operator ──C:ScheduleUpdate──> UpdateRollout [SCHEDULED]
                                └─E:UpdateScheduled
Policy/window/health gate
  └─ C:StartUpdateWave ──> [WAVE_RUNNING] ──E:UpdateWaveStarted
          │ per TV C:ApplyUpdate
          ▼
     EdgeInstallation [UPDATING]
          ├─ success observed ──> [HEALTHY/DEGRADED]
          │                       E:UpdateApplied + CurrentStateReported
          ├─ health failure ─────> E:UpdateFailed
          │       ├─ C:PauseUpdateWave ──> E:UpdateWavePaused
          │       └─ C:RollbackUpdate
          │              ▼
          │         [ROLLING_BACK]
          │              ├─ E:UpdateRolledBack ──> HEALTHY/DEGRADED
          │              └─ E:RollbackFailed ────> FAILED
          └─ timeout ────────────> [?] derive Current/Observed before retry
```

Rollback preserva a versão tentada, pacote, motivo e resultado. Update não é forçado fora de policy/MaintenanceWindow.

## 12. Reconciliação Desired/Current/Observed

```text
Cloud/TV owner ──E:DesiredStatePublished [revision D]
Edge ────────────E:CurrentStateReported [revision C]
Cloud observer ──E:ObservedStateDerived [revision O]
                         │
                         ▼
Reconciler compares D/C/O
  ├─ converged ──> E:StateReconciliationCompleted
  └─ divergent ──> E:StateDivergenceDetected
                    └─ C:RequestStateReconciliation
                         └─E:ReconciliationPlanned
                              └─ Commands to each real owner
```

```text
PROIBIDO:
Reconciler ─X─> direct write to TV/Edge/Health
```

Plano baseado em D7/O10 torna-se obsoleto se D8 chegar antes do Command; o owner rejeita revisão antiga.

## 13. Emergência

```text
Authorized operator
  │ C:DeclareEmergencyBroadcast
  ▼
EmergencyBroadcast [DECLARED] ──E:EmergencyBroadcastDeclared
  │ C:ActivateEmergencyBroadcast
  ▼
[ACTIVE] ──E:EmergencyBroadcastActivated
  │ per TV
  ├─ C:ApplyEmergencyComposition ──> Canvas ──E:EmergencyLayerActivated
  └─ C:PreemptPlayerSession ───────> Player [PREEMPTED]
                                     └─E:EmergencyBroadcastStarted

clear or expiry:
EmergencyBroadcast ──C:ClearEmergencyBroadcast──> [CLEARED]
                     └─E:EmergencyBroadcastCleared
  │ per TV/session C:RestorePlayerSession
  ├─ E:EmergencyBroadcastEnded + PlaybackRecovered
  └─ E:EmergencyBroadcastEnded + PlaybackFailed
```

Se 99 TVs confirmarem e uma ficar offline, o resultado é parcial: 99 confirmadas + 1 `UNKNOWN`. Não se declara sucesso global.

## 14. Recuperação offline e gaps

```text
Edge loses transport
  │
  ├─ PlaybackEvent E10 ──> local queue sequence 10
  ├─ PlaybackEvent E11 ──> local queue sequence 11
  └─ CurrentState C7 ────> local queue/state

transport restored
  │
  ├─ submit E10 (same eventId/signature/occurredAt)
  ├─ submit E11 (same eventId/signature/occurredAt)
  └─ report C7

Cloud receives E11 before E10
  │
  ├─ records gap 10
  ├─ keeps E11 pending for ordering-dependent decisions
  └─ processes after E10 or explicit unrecoverable-gap decision
```

Duplicidade:

```text
E10 attempt A ─┐
E10 attempt B ─┼─> Cloud dedupe by eventId ─> one logical processing result
E10 replay ────┘
```

Proibido alterar `occurredAt` para o instante da reconexão ou criar Evidence para preencher gap.

## 15. Replay, rebuild e reidratação

```text
Authoritative Event streams
  │ replay from verified checkpoint
  ▼
Projection builder
  │
  ├─ applies each eventId once
  ├─ detects revision gaps/schema incompatibility
  ├─ marks projection REBUILDING/STALE
  └─ publishes projection ready only after convergence
```

Efeitos externos durante replay:

```text
WithdrawalExecutionRequested (historical)
  ├─ projection update: allowed
  └─ resend to Asaas: PROHIBITED

UpdateScheduled (historical)
  ├─ rollout projection: allowed
  └─ reapply package: PROHIBITED

Notification-triggering event (historical)
  ├─ delivery history rebuild: allowed
  └─ resend notification: PROHIBITED
```

Aggregate rehydration usa somente seu stream/snapshot verificável. Read model não preenche Event ausente.

## 16. Resultado desconhecido e indisponibilidade de transporte

```text
Owner accepts Command
  ├─ state changed
  ├─ Event stored
  └─ transport unavailable
         │
         └─ later publish SAME eventId ──> consumer dedupe/process
```

```text
Emitter sends Command; response times out
  │
  ├─ query by idempotency key returns ACCEPTED ─> continue
  ├─ query returns REJECTED ────────────────────> stop/compensate
  └─ still UNKNOWN ─────────────────────────────> wait/reconcile

PROIBIDO: timeout ─> new idempotency key ─> second effect
```

## 17. Matriz de resultados finais

| Fluxo | Sucesso comprovado por | Falha/pendência que não pode ser ocultada |
| --- | --- | --- |
| Campaign funding | `CampaignBudgetIncreased` | payment pending/unknown |
| Slot | `SlotAllocated` | quote/budget/inventory conflict |
| Playback | `PlaybackFinished` + signed event | interrupted/failed/gap |
| Evidence | `EvidenceValidated` | invalid/disputed/dependency gap |
| Anchor | `AnchoringConfirmed` | failed/unknown |
| Settlement | `SettlementExecuted`/CLOSED | blocked share/cycle |
| Partner credit | `PartnerCredited` | blocked/unclaimed/duplicate right |
| Withdrawal | `WithdrawalExecuted` | rejected/failed/unknown provider result |
| TV activation | `TvActivated` | missing installation/provision/capability/health gate |
| Update | target `UpdateApplied` + acceptable health | failed/rolled back/unknown target |
| Emergency | confirmation per TV and clear/restore | partial/unknown TV |
| Insurance | `InsuranceSettlementExecuted` + Claim settled | under review/reserve/financial unknown |
