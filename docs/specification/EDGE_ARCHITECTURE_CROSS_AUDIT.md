# Mostarda Edge — Cross-Architecture Audit

- **Status:** `AUDIT ARTIFACT — NON-NORMATIVE`
- **Version:** `2.0.0`
- **Repository cut:** `reconciliation cycle; final commit recorded in §12.7`
- **Audit date:** `2026-08-09`
- **Scope:** cross-audit of the Edge chain; no source contract is changed by this report
- **Decision:** `CROSS-AUDIT CLEAR — IMPLEMENTATION AUTHORIZED`

## 1. Purpose and limits

This report audits the relationships between the Edge contracts already present in the repository. It does not re-open the Domain Freeze, approve ADR-010, change an owner, create a Bounded Context, or resolve an OPEN decision.

The audit asks whether an engineer can implement the complete Edge chain without choosing an owner, boundary, state mapping, public event mapping, identity name or technical behavior that is not determined by an authoritative source.

Only the following outcomes are recorded:

- an objective architecture blocker;
- a production/configuration limitation that does not block code generation;
- documentation debt where a superior accepted source already determines the behavior;
- a verified absence of conflict.

## 2. Sources and authority used

The review used the repository at `main @ 9eeba14` and applied this precedence:

1. accepted ADRs and accepted Decision Registry entries;
2. `PLATFORM_SPECIFICATION.md` when accepted (it is still Draft at this cut);
3. specialized specifications;
4. TV Network catalogues and legacy derived documents;
5. audit and roadmap documents as descriptive evidence only.

Relevant accepted sources include:

- [`ADR-002-Edge-Architecture.md`](../adr/ADR-002-Edge-Architecture.md): current accepted Mini PC direction;
- [`ADR-008-TV-Network.md`](../adr/ADR-008-TV-Network.md): TV Network ownership of the physical fleet and operational state;
- [`DECISION_REGISTRY.md`](DECISION_REGISTRY.md), especially `DEC-009` and `DEC-063`;
- [`PLATFORM_SPECIFICATION.md`](PLATFORM_SPECIFICATION.md): still `0.2.0-draft`, therefore not an implementation-authorizing accepted specification.

The Edge module specifications audited here remain Draft. They are compared for consistency, not promoted by this report.

## 3. Audited chain and inventory

The dependency direction observed in the contracts is:

```text
Hardware Discovery
        ↓
Hardware Compatibility
        ↓
Hardware Profile
        ↓
Installation Profile
        ↓
Installer
        ↓
Provisioning
        ↓
Edge OS
        ↓
Edge Runtime
   ┌────┼──────┬────────┬──────────┬──────────┐
   ↓    ↓      ↓        ↓          ↓
Player Store  OTA   Recovery   Security   Telemetry
```

The audited contracts are:

| Layer | Contract | Local result |
| --- | --- | --- |
| Discovery | [`EDGE_HARDWARE_DISCOVERY.md`](EDGE_HARDWARE_DISCOVERY.md) | Boundary and provenance are explicit; no conflict found. |
| Compatibility | [`EDGE_HARDWARE_COMPATIBILITY.md`](EDGE_HARDWARE_COMPATIBILITY.md) | Discovery-driven eligibility is explicit; no conflict found. |
| Profile | [`EDGE_HARDWARE_PROFILES.md`](EDGE_HARDWARE_PROFILES.md) | Versioned/homologated profile boundary is explicit; no conflict found. |
| Installation Profile | [`EDGE_INSTALLATION_PROFILES.md`](EDGE_INSTALLATION_PROFILES.md) | Profile-to-installation-plan boundary is explicit; no conflict found. |
| Installer | [`EDGE_INSTALLER_SPECIFICATION.md`](EDGE_INSTALLER_SPECIFICATION.md) | Owns installation operation, but its handoff to Provisioning is underspecified. |
| Provisioning | [`EDGE_PROVISIONING.md`](EDGE_PROVISIONING.md) | Owns device transition, but its handoff from Installer is underspecified. |
| OS | [`EDGE_OS_SPECIFICATION.md`](EDGE_OS_SPECIFICATION.md) | OS contract is explicit; supervision boundary with Runtime needs a unique mapping. |
| Runtime | [`EDGE_RUNTIME_SPECIFICATION.md`](EDGE_RUNTIME_SPECIFICATION.md) | Central coordination contract exists; state and public-event mappings conflict with accepted TV Network contracts. |
| Player | [`EDGE_PLAYER_SPECIFICATION.md`](EDGE_PLAYER_SPECIFICATION.md) | Offline playback and Playback-fact boundary are coherent. |
| Store | [`EDGE_OFFLINE_STORAGE.md`](EDGE_OFFLINE_STORAGE.md) | Store owns content integrity and atomic snapshots; no conflict found. |
| OTA | [`EDGE_OTA.md`](EDGE_OTA.md) | Update lifecycle is explicit; health-gate vocabulary needs cross-contract mapping. |
| Recovery | [`EDGE_RECOVERY.md`](EDGE_RECOVERY.md) | Single Recovery Plan machine is internally coherent. |
| Security | [`EDGE_SECURITY.md`](EDGE_SECURITY.md) | Trust boundary and identity preservation are coherent. |
| Telemetry | [`EDGE_TELEMETRY.md`](EDGE_TELEMETRY.md) | Telemetry/Evidence separation and offline queue are coherent. |

## 4. Original baseline verdict (V1)

The module contracts were mostly coherent in isolation. The baseline audit did **not** find:

- broken relative Markdown references in the Edge specifications;
- a second Audience or Evidence authority;
- a conflicting RAM/storage threshold for the documented 1 GB class;
- a circular ownership dependency among Discovery, Compatibility, Profiles, Installer and Provisioning;
- a requirement that forces a TV Box without an optional camera, Wi-Fi collector or other capability to stop authorized playback;
- a rule that makes Telemetry materialize Evidence;
- a rule that makes OTA or Recovery silently change `EdgeInstallationId`.

The baseline audit **did** find integration ambiguities that prevented deterministic end-to-end implementation. They remain recorded below for traceability; §12 records the reconciliation decisions and final result.

## 5. Findings matrix

| ID | Classification | Finding | Implementation impact |
| --- | --- | --- | --- |
| `ECA-001` | `ARCHITECTURE_BLOCKER` | Desired/Current/Observed State has conflicting owner and schema definitions. | An implementation cannot determine where `CurrentState` and `ObservedState` are produced or which state is reconciled. |
| `ECA-002` | `ARCHITECTURE_BLOCKER` | EdgeInstallation, Edge OS, Runtime, OTA and Recovery lifecycles have no canonical cross-machine mapping. | The same labels can lead to different gates, terminal results and health decisions. |
| `ECA-003` | `DOCUMENTATION_DEBT` | Legacy Edge Runtime text assigns minute-bucket closure to Edge, while accepted `DEC-063` assigns buckets to Telemetry Context. | Correct behavior is already determined by the accepted decision; legacy text must be synchronized, not re-decided. |
| `ECA-004` | `ARCHITECTURE_BLOCKER` | OS-level supervision/watchdog and Runtime module supervision/watchdog are not separated by a unique normative boundary. | Different implementations can restart different processes, emit different results and report different health. |
| `ECA-005` | `ARCHITECTURE_BLOCKER` | Installer-to-Provisioning handoff has no canonical request/result mapping. | Idempotency identity, parent/child operation ownership and state transition points are undefined. |
| `ECA-006` | `ARCHITECTURE_BLOCKER` | OTA health gates do not bind uniquely to Runtime, OS and Player health contracts. | Implementations may activate or reject the same update under different health observations. |
| `ECA-007` | `ARCHITECTURE_BLOCKER` | `EdgeInstallationIdentifier` and `EdgeInstallationId` are both used without an explicit canonical alias rule. | Public payloads and generated contracts require an arbitrary field/identity choice. |
| `ECA-008` | `ARCHITECTURE_BLOCKER` | Runtime-local commands/results are not mapped to the accepted TV Network Commands/Events contract. | `CurrentStateReported`, restart, watchdog and remote-operation facts cannot be produced deterministically from Runtime outcomes. |
| `ECA-009` | `PRODUCTION_BLOCKER` (profile/configuration-specific) | Concrete production profiles still need quantitative quotas, intervals, retry budgets, retention and health thresholds. | Code can be developed against profile/configuration interfaces; production deployment cannot be certified without selected values. |
| `ECA-010` | `DOCUMENTATION_DEBT` | `CURRENT_ARCHITECTURE.md` and `EDGE_TECHNICAL_ROADMAP.md` reference the older repository cut and older TV Network Runtime document. | Traceability is stale, but the stale metadata does not itself change behavior. |
| `ECA-011` | `DOCUMENTATION_DEBT` | Most earlier Edge specifications do not list `EDGE_RUNTIME_SPECIFICATION.md` in their prerequisite/dependency declarations. | Navigation and dependency traceability are incomplete; the Runtime contract exists and is discoverable. |

## 6. Findings in detail

### ECA-001 — State ownership and schema

**Evidence:**

- Accepted [`ADR-008-TV-Network.md`](../adr/ADR-008-TV-Network.md) assigns Desired/Current/Observed State to TV Network.
- Accepted `DEC-009` distinguishes Desired, Current and Observed State and assigns reconciliation to the Reconciler.
- [`docs/tv-network/EDGE_RUNTIME.md`](../tv-network/EDGE_RUNTIME.md) defines `DesiredState` as Cloud intention, `CurrentState` as the authenticated Edge declaration and `ObservedState` as an independent TV Network projection.
- [`EDGE_RUNTIME_SPECIFICATION.md`](EDGE_RUNTIME_SPECIFICATION.md) §6 instead defines Desired State and a locally verified `ObservedState`, and omits `CurrentState`.

The conflict is architectural, not editorial: the same names refer to different producers and different facts. A code generator cannot choose the owner or payload shape without inventing behavior.

### ECA-002 — Lifecycle mapping

The contracts define valid local machines, but do not define the mapping between them:

- TV Network `EdgeInstallation`: `UNINSTALLED`, `INSTALLING`, `HEALTHY`, `DEGRADED`, `UPDATING`, `ROLLING_BACK`, `QUARANTINED`, `DECOMMISSIONED` in [`docs/tv-network/EDGE_RUNTIME.md`](../tv-network/EDGE_RUNTIME.md);
- Edge OS: `FACTORY`, `PROVISIONING`, `ACTIVE`, `DEGRADED`, `UPDATING`, `ROLLING_BACK`, `RECOVERY`, `QUARANTINED`, `SHUTDOWN` in [`EDGE_OS_SPECIFICATION.md`](EDGE_OS_SPECIFICATION.md);
- Runtime: `STOPPED`, `STARTING`, `RESOLVING_DEPENDENCIES`, `WAITING_FOR_DEPENDENCY`, `ACTIVE`, `DEGRADED`, `RECOVERING`, `SAFE_MODE`, `STOPPING` in [`EDGE_RUNTIME_SPECIFICATION.md`](EDGE_RUNTIME_SPECIFICATION.md);
- OTA: `STAGED`, `VERIFIED`, `BOOTED`, `RUNTIME_HEALTHY`, `PLAYER_HEALTHY`, `CONFIRMED`, `MARKED_GOOD` and failure/wait states in [`EDGE_OTA.md`](EDGE_OTA.md);
- Recovery: `RECOVERY_REQUIRED`, `WAITING_FOR_DEPENDENCY`, `PAUSED`, `BLOCKED`, `ROLLED_BACK` and other process states in [`EDGE_RECOVERY.md`](EDGE_RECOVERY.md).

The machines are individually reasonable. The missing contract is which state is authoritative for each cross-module gate and which transition emits the public EdgeInstallation event.

### ECA-003 — Telemetry bucket ownership

`DEC-063` and [`EDGE_TELEMETRY.md`](EDGE_TELEMETRY.md) make Telemetry Context the owner of accepted observations, the Telemetry Ledger and immutable minute buckets. The legacy [`docs/tv-network/EDGE_RUNTIME.md`](../tv-network/EDGE_RUNTIME.md) still says Edge closes one-minute buckets.

Because the accepted decision is superior and explicit, this is a synchronization task, not a new architecture decision. The report intentionally does not edit the legacy document.

### ECA-004 — Supervision and watchdog boundary

[`EDGE_OS_SPECIFICATION.md`](EDGE_OS_SPECIFICATION.md) requires OS process supervision, watchdog primitives and resource limits. [`EDGE_RUNTIME_SPECIFICATION.md`](EDGE_RUNTIME_SPECIFICATION.md) requires Runtime supervision and watchdog behavior for registered module processes, and the legacy Runtime contract also lists Supervisor and Watchdog as Runtime components.

The documents do not state, in one authoritative mapping, whether:

- OS supervises only the Runtime process while Runtime supervises modules;
- both layers may restart the same process;
- a watchdog stall is an OS fact, a Runtime result, or both with an explicit causal relation.

The absence of this mapping permits observably different restart and health behavior.

### ECA-005 — Installer and Provisioning handoff

[`EDGE_INSTALLER_SPECIFICATION.md`](EDGE_INSTALLER_SPECIFICATION.md) owns an installation operation with `operation_id` and states such as `PREPARED`, `WRITING`, `VERIFYING` and `CONFIRMING`.

[`EDGE_PROVISIONING.md`](EDGE_PROVISIONING.md) owns a separate `ProvisioningRequest` with `provisioning_id` and `parent_installation_operation_id`, and states such as `ACCEPTED`, `PARTITIONING`, `SYSTEM_WRITTEN`, `BOOT_CONFIGURED` and `POST_PROVISIONING_VALIDATION`.

The Installer contract does not define the handoff message, the exact transition at which the child operation is created, the authoritative result relation, or the mapping between the two state machines. This is a direct implementation choice, not a harmless naming difference.

### ECA-006 — OTA health gates

[`EDGE_OTA.md`](EDGE_OTA.md) requires `RUNTIME_HEALTHY` and `PLAYER_HEALTHY` before confirmation. [`EDGE_RUNTIME_SPECIFICATION.md`](EDGE_RUNTIME_SPECIFICATION.md) exposes `RuntimeHealth` with readiness and operational states; [`EDGE_PLAYER_SPECIFICATION.md`](EDGE_PLAYER_SPECIFICATION.md) exposes `PlayerHealth` with `HEALTHY`, `DEGRADED`, `UNHEALTHY` and `UNKNOWN`; [`EDGE_OS_SPECIFICATION.md`](EDGE_OS_SPECIFICATION.md) exposes its own health states.

No authoritative mapping states exactly which RuntimeHealth, PlayerHealth and OS health values satisfy the OTA gates, nor how a degraded-but-allowed profile is treated. Two implementations could therefore produce different `CONFIRMED` or `MARKED_GOOD` outcomes for the same device.

### ECA-007 — Installation identity name

The primary specification and older TV Network documents use `EdgeInstallationIdentifier`, while the newer Edge specifications, Security, Telemetry and accepted `DEC-063` use `EdgeInstallationId`. No explicit canonical alias rule was found.

This affects event envelopes, command payloads, Protobuf/OpenAPI generation and idempotency keys. It must be resolved before public contract generation; this report does not choose a spelling.

### ECA-008 — Runtime and TV Network public events

[`docs/tv-network/TV_NETWORK_EVENTS.md`](../tv-network/TV_NETWORK_EVENTS.md) already defines public facts including `DesiredStatePublished`, `CurrentStateReported`, `ObservedStateDerived`, `ProcessRestartRequested`, `ProcessRestarted`, `ProcessRestartFailed`, `WatchdogStallDetected` and remote-operation outcomes. [`EDGE_RUNTIME_SPECIFICATION.md`](EDGE_RUNTIME_SPECIFICATION.md) defines local `RuntimeCommand`, `RuntimeResult` and `RuntimeHealth`, but does not map those results to the accepted public Commands/Events.

Without that mapping, a Runtime can be locally conformant while producing no deterministic `CurrentStateReported`, restart or watchdog event, or while translating `COMPLETED`, `DEFERRED`, `DEGRADED` and `FAILED` differently across implementations.

### ECA-009 — Production parameters

The contracts intentionally leave some deployment parameters to profile/configuration. Examples include heartbeat period, restart budgets, grace intervals, retention/capacity/priority and concrete storage quotas. This is not a domain ambiguity and does not prohibit implementation against parameterized interfaces. It does prevent production certification for a concrete hardware profile until those values and operational SLOs are selected and tested.

### ECA-010 and ECA-011 — Traceability debt

The audit baseline and roadmap still identify `main @ ddad9bf`, while the repository cut is `9eeba14`; the roadmap still names the older TV Network Runtime document and does not list the new Runtime specification in the derived sequence. Earlier Edge documents also omit the new Runtime specification from their prerequisite lists.

These findings do not change the ownership or behavior already described by the source contracts. They are documentation synchronization items and should not be used to invent a replacement Runtime contract.

## 7. Cross-checks with no finding

### 7.1 Discovery, Compatibility and Profiles

The sequence `HardwareDiscoveryRecord → Compatibility Evaluation → HardwareProfile → InstallationProfile` is explicit. Neither Compatibility nor Installation Profile is allowed to infer compatibility from a commercial device name. No duplicate owner was found in this part of the chain.

### 7.2 Player, Store and offline operation

Player consumes committed Local Content Store snapshots through Runtime interfaces. The Store owns hashes, staging, atomic activation, quotas, expiry and garbage collection. Player does not download campaign content directly from Cloud during playback. This boundary is consistent with the offline-first requirement and with the 1 GB class constraint.

### 7.3 Telemetry, Playback and Evidence

`DEC-063`, [`EDGE_TELEMETRY.md`](EDGE_TELEMETRY.md) and [`EDGE_PLAYER_SPECIFICATION.md`](EDGE_PLAYER_SPECIFICATION.md) consistently keep Playback as the producer of playback facts, Telemetry as the ledger/projection owner and Evidence Ledger as the only materializer of Evidence. No second Evidence authority was found.

### 7.4 OTA, Recovery and Security

The module boundaries are consistent: Runtime requests or hands off; OTA and Recovery execute their own plans; Security owns trust, key and quarantine decisions. OTA/Recovery preserve identity unless an explicit identity operation is authorized. No silent identity migration was found.

### 7.5 Numeric feasibility for low-resource hardware

The documented thresholds are internally aligned: Experimental class is at least 1 GB RAM and 8 GB usable storage; Production class is at least 2 GB RAM and 16 GB usable storage; Preferred class is at least 4 GB RAM and 32 GB usable storage. Player and Runtime treat the 1 GB class as constrained and conditional on a validated Hardware Profile/Web Engine; they do not present it as an unrestricted production baseline.

### 7.6 Circular dependencies

The Runtime coordinates Player, Store, OTA, Recovery, Security and Telemetry, while each module retains its own authority. This is an orchestration graph, not a circular ownership graph. No circular dependency requiring a new Bounded Context was identified.

## 8. Gaps that require a new document

No new peripheral/module specification is justified by this audit.

The blockers are integration and authority reconciliations among contracts that already exist:

- state ownership and state projection mapping;
- lifecycle mapping;
- supervision boundary;
- Installer/Provisioning handoff;
- OTA health-gate mapping;
- identity alias/canonical field;
- Runtime-to-TV-Network public event mapping.

Creating another module document before resolving these points would duplicate authority and increase drift. Any future correction should update the existing authoritative contracts or an explicitly authorized integration artifact; this report does not choose which source must win.

## 9. Items sufficiently defined and not requiring more documentation now

The following should not trigger new documents merely because the audit is being performed:

- Hardware Discovery provenance and confidence model;
- Hardware Profile lifecycle and homologation evidence;
- Installation Profile as the immutable input to Installer and Provisioning;
- Player offline playback and Local Content Store atomic snapshots;
- Telemetry offline persistence, deduplication and Evidence boundary;
- Security trust boundaries, identity preservation and revocation states;
- OTA manifest verification, anti-downgrade and Recovery handoff;
- Recovery Plan machine and its distinction between process states and operational results;
- 1 GB resource guardrails already stated in Compatibility, OS, Runtime, Player and Storage.

## 10. Required decision set before implementation authorization

The following are the minimum unresolved integration decisions evidenced by this audit. They are listed for governance and traceability only; this report does not resolve them:

1. canonical ownership and schema for Desired, Current and Observed State;
2. mapping between EdgeInstallation, Edge OS, Runtime, OTA and Recovery states;
3. exclusive supervision/watchdog boundary and causal event model;
4. Installer ↔ Provisioning request, result and state mapping;
5. exact health predicates accepted by OTA confirmation;
6. canonical identity field/name and alias policy;
7. Runtime result to TV Network Command/Event mapping;
8. production values for profile/configuration parameters before production certification.

## 11. Baseline certification verdict (V1)

**`CROSS-AUDIT NOT CLEAR — IMPLEMENTATION AUTHORIZATION BLOCKED`**

The Edge chain is not ready for end-to-end implementation authorization because `ECA-001`, `ECA-002`, `ECA-004`, `ECA-005`, `ECA-006`, `ECA-007` and `ECA-008` are objective architecture blockers. `ECA-003`, `ECA-010` and `ECA-011` are documentation debt, and `ECA-009` is a production/configuration gate rather than a domain blocker.

No existing specification was edited and no decision was silently resolved by the V1 audit.

## 12. Reconciliation V2

This section records the single reconciliation cycle executed from the V1 backlog. It is an audit trail, not a new domain authority.

### 12.1 Decisions and authority

| Original finding | Reconciliation decision | Sole authority used |
| --- | --- | --- |
| `ECA-001` | TV Network remains owner of public Desired/Current/Observed State. Runtime uses internal `RuntimeObservation`, supplies Current State facts through the EdgeInstallation adapter and never produces `ObservedStateDerived`. | `ADR-008-TV-Network.md`, `DEC-009`, `TV_NETWORK_EVENTS.md` |
| `ECA-002` | Public `EdgeInstallation` state is mapped by one precedence table; Installer, Provisioning, OS, Runtime, OTA and Recovery retain their own qualified process states. | `ADR-008-TV-Network.md` plus the canonical mapping added to `docs/tv-network/EDGE_RUNTIME.md` |
| `ECA-003` | Telemetry Context alone closes accepted minute buckets. Legacy Edge text now forwards observations instead of claiming bucket ownership. | `DEC-063`, `EDGE_TELEMETRY.md` |
| `ECA-004` | OS supervises the Runtime process and OS resources; Runtime supervises registered modules; Player and Recovery retain their own contracts. Concurrent cross-layer restart is prohibited. | `EDGE_OS_SPECIFICATION.md`, `EDGE_RUNTIME_SPECIFICATION.md`, `ADR-008-TV-Network.md` |
| `ECA-005` | Installer ends its owned lifecycle at `HANDOFF_PENDING`/`PROVISIONING_DELEGATED`; Provisioning begins only with one immutable `ProvisioningRequest` and owns all target writes and checkpoints. | `EDGE_INSTALLER_SPECIFICATION.md`, `EDGE_PROVISIONING.md` |
| `ECA-006` | OTA gates are bound to exact RuntimeHealth, PlayerHealth and OS predicates. Unknown/degraded mandatory health cannot reach `CONFIRMED` or `MARKED_GOOD`; failures use Last Known Good and Recovery. | `EDGE_OTA.md`, `EDGE_RUNTIME_SPECIFICATION.md`, `EDGE_PLAYER_SPECIFICATION.md`, `EDGE_OS_SPECIFICATION.md` |
| `ECA-007` | `EdgeInstallationId` is the canonical field. `EdgeInstallationIdentifier` is historical wording only and is not allowed in new contracts. | `EDGE_SECURITY.md`, `DEC-063`, `PLATFORM_SPECIFICATION.md` and synchronized TV Network documents |
| `ECA-008` | Runtime-local results are bridged by the authenticated EdgeInstallation adapter to the existing TV Network events; Runtime never renames a local result into a public event. | `TV_NETWORK_EVENTS.md`, `EDGE_RUNTIME_SPECIFICATION.md` |
| `ECA-009` | Platform-wide numeric eligibility remains centralized at 1/2/4 GB RAM and 8/16/32 GB usable storage. CPU, thermal, network, Player and Store limits are mandatory profile facts with evidence; no downstream document may invent a second scalar. | `EDGE_HARDWARE_COMPATIBILITY.md`, `EDGE_HARDWARE_PROFILES.md`, `EDGE_INSTALLATION_PROFILES.md` |
| `ECA-010` / `ECA-011` | Stale cuts, Recovery terminology and Runtime dependency references were synchronized in existing audit/roadmap/legacy documents. | `CURRENT_ARCHITECTURE.md`, `EDGE_TECHNICAL_ROADMAP.md`, `EDGE_PLATFORM_GAP_ANALYSIS.md`, existing TV Network documents |

### 12.2 Documents changed

Only existing documents were changed:

- `docs/tv-network/EDGE_RUNTIME.md`;
- `docs/tv-network/TV_NETWORK_EVENTS.md`;
- `docs/tv-network/DEVICE_REGISTRY.md`;
- `docs/tv-network/PROVISIONING.md`;
- `docs/tv-network/EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md`;
- `docs/adr/ADR-010-Edge-Hardware-and-Provisioning.md` (terminology only; status remains `Proposed`);
- `docs/specification/EDGE_RUNTIME_SPECIFICATION.md`;
- `docs/specification/EDGE_INSTALLER_SPECIFICATION.md`;
- `docs/specification/EDGE_PROVISIONING.md`;
- `docs/specification/EDGE_OS_SPECIFICATION.md`;
- `docs/specification/EDGE_OTA.md`;
- `docs/specification/EDGE_SECURITY.md`;
- `docs/specification/EDGE_HARDWARE_COMPATIBILITY.md`;
- `docs/specification/EDGE_HARDWARE_PROFILES.md`;
- `docs/specification/EDGE_PLATFORM_GAP_ANALYSIS.md`;
- `docs/specification/CURRENT_ARCHITECTURE.md`;
- `docs/specification/EDGE_TECHNICAL_ROADMAP.md`;
- `tests/documentation/edge-architecture-audit-package.test.mjs` (expectativas do pacote de auditoria sincronizadas com o corte reconciliado);
- this report.

No new Edge specification was created. `ADR-002` was not changed and `ADR-010` was not promoted.

### 12.3 Explicitly preserved constraints

- ADR-002 remains accepted/current while ADR-010 remains Proposed.
- No concrete MXQ Pro profile was created.
- Armbian remains a replaceable candidate, not a permanent dependency.
- Hardware remains heterogeneous and profile-driven.
- Player Web, Local Content Store and offline playback remain mandatory architectural directions.
- Installer, Provisioning, Runtime, Player, OTA, Recovery, Security and Telemetry remain separate authorities.
- Telemetry never materializes Evidence; Evidence Ledger remains the sole Evidence authority.
- Optional sensors may degrade telemetry without stopping authorized playback.

### 12.4 Final cross-audit checks

The V2 audit verified all of the following against the reconciled tree:

- one public state owner and one explicit mapping table;
- no Installer/Provisioning target-write overlap;
- OS/Runtime/Player/Recovery supervision boundaries are non-overlapping;
- OTA health gates are exact and reproducible;
- `EdgeInstallationId` is the only new-contract identity spelling;
- every Runtime-to-public event mapping names producer, consumer, envelope and idempotency;
- RAM/storage thresholds are not redefined downstream;
- profile-specific CPU, thermal, network, Player and Store limits are required and evidenced;
- all relative references resolve;
- ADR-002 remains unchanged and ADR-010 remains Proposed;
- no production code is modified.

**Resultado da auditoria estrutural:** `PASS`.

### 12.5 Final result

`CROSS-AUDIT CLEAR — IMPLEMENTATION AUTHORIZED`. The clear result authorizes implementation of the reconciled contracts; it does not accept ADR-010, homologate a concrete TV Box or certify production deployment.

### 12.6 Real pending items after reconciliation

The following remain profile/deployment work, not unresolved cross-architecture ownership:

- creation and homologation of the first concrete Hardware Profile;
- selection of concrete profile values for CPU, thermal, network, Player and Store quotas;
- production SLOs, rollout waves and operational capacity;
- formal acceptance or rejection of ADR-010 after its stated evidence gates.

These items do not authorize a developer to bypass the profile contract or infer a hardware capability.

### 12.7 Reconciled audit commit

The substantive reconciliation commit is recorded in the final repository metadata. The verification suite is recorded in this section so the result is reproducible:

- `npm run test:all`: 137 tests, 135 passed, 2 PostgreSQL tests skipped because `DATABASE_URL` is not configured; architecture 4/4; documentation 54/54;
- `npm run typecheck`: passed;
- `git diff --check`: passed;
- audited relative-link validation: 147 Markdown files under `docs/`, 172 links, all resolved;
- production code guard: no changes under `apps/` or `packages/`.
