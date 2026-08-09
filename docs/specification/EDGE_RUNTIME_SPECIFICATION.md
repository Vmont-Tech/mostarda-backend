# Mostarda Edge — Edge Runtime Specification

**Status:** DRAFT
**Version:** 1.0.0
**Owner:** Edge Runtime
**Prerequisites:** `EDGE_HARDWARE_COMPATIBILITY.md`, `EDGE_HARDWARE_DISCOVERY.md`, `EDGE_HARDWARE_PROFILES.md`, `EDGE_INSTALLATION_PROFILES.md`, `EDGE_INSTALLER_SPECIFICATION.md`, `EDGE_PROVISIONING.md`, `EDGE_RECOVERY.md`, `EDGE_OS_SPECIFICATION.md`, `EDGE_OTA.md`, `EDGE_SECURITY.md`, `EDGE_PLAYER_SPECIFICATION.md`, `EDGE_OFFLINE_STORAGE.md`, `EDGE_TELEMETRY.md`
**Related Domains:** Configuration Service, Playback, Evidence Ledger, Pricing, Operations, TV Network
**Authority Dependencies:** `ADR-008-TV-Network.md`, `DEC-009`, `DEC-063`, `TV_NETWORK_EVENTS.md`
**Scope:** local coordination, module supervision, desired/observed state, low-resource operation and Edge control-plane contracts

---

## 1. Purpose

This document defines the normative contract for the Mostarda Edge Runtime.

The Runtime is the small local control plane that starts on top of Edge OS, coordinates authorized modules and exposes a deterministic operational state. It is designed for heterogeneous Edge hardware, including low-resource devices, and must remain useful when Cloud connectivity is unavailable.

The Runtime defines:

- the boundary between Edge OS, Runtime and specialized modules;
- lifecycle, startup, shutdown, restart and safe-mode behavior;
- Desired State consumption, Current State declaration and internal RuntimeObservation;
- the module dependency graph and startup order;
- internal command, result, health and IPC contracts;
- supervision, watchdogs, retry and idempotency;
- identity, authentication, authorization and secret boundaries;
- Cloud synchronization and remote-command handling;
- offline-first behavior;
- orchestration of Player, Local Content Store, OTA, Recovery, Security and Telemetry;
- resource management for a one-gigabyte RAM class profile;
- degraded operation and unavailable-module behavior;
- `RuntimeHealth`, `RuntimeCommand`, `RuntimeResult` and the `RT-*` catalog.

The Runtime coordinates. It does not become a second owner for the domain decisions of another module.

---

## 2. Architectural Boundary

The central Edge relationship is:

```text
Hardware Discovery
        |
        v
Compatibility
        |
        v
Hardware Profile
        |
        v
Installation Profile
        |
        v
Edge OS
        |
        v
Edge Runtime
   +----+----+----+----+----+----+
   |    |    |    |    |    |    |
 Player Store OTA Recovery Security Telemetry Network
```

The Runtime may coordinate the modules above, but the authority remains with each contract owner:

```text
Runtime -> requests Recovery
Recovery -> decides and executes Recovery Plan

Runtime -> requests OTA
OTA -> resolves and executes the authorized update

Runtime -> provides authorized content to Player
Player -> decides audiovisual execution

Runtime -> forwards telemetry
Telemetry -> persists, synchronizes and projects telemetry

Runtime -> requests compatibility evaluation
Compatibility -> decides compatibility
```

### 2.1 Runtime owns

The Runtime owns:

- local lifecycle and operational coordination;
- module registration and supervision;
- Desired State consumption, Current State declaration and internal RuntimeObservation for the Edge installation;
- internal routing of authorized commands;
- dependency readiness and degraded-mode calculation;
- restart, retry and idempotency of Runtime operations;
- local configuration activation and rollback orchestration;
- Runtime health and Runtime results;
- the control-plane journal required to resume operations after interruption.

### 2.2 Runtime does not own

The Runtime shall not:

- choose or certify a Hardware Profile;
- decide compatibility or invent a fallback compatibility path;
- choose an arbitrary OS, Player, Web Engine, codec or update artifact;
- decide Campaign, Pricing, Financial, Settlement, Governance or Evidence outcomes;
- materialize `EvidenceRecord`;
- decide whether Playback is legally or financially valid;
- replace the Player's audiovisual state machine;
- replace the Local Content Store's content integrity or atomic-commit rules;
- replace OTA's manifest, signature, anti-downgrade or activation decision;
- replace Recovery's Recovery Plan or state machine;
- replace Telemetry's ledger, bucket or synchronization semantics;
- expose private keys or secrets through a Runtime command;
- make Cloud availability a prerequisite for already-authorized local playback.

### 2.3 Authority rule

An operation is valid only when the Runtime and the target module each have authority for their respective parts. Runtime authorization can route a request; it cannot turn an unauthorized module operation into an authorized one.

---

## 3. Runtime Layers and Modules

### 3.1 Control plane

The control plane contains the Runtime supervisor, lifecycle state, configuration activation, command router, dependency evaluator, health aggregator and operational journal.

### 3.2 Data plane

The data plane is executed by the specialized modules. The Runtime must not copy large media assets, telemetry payloads or update artifacts into its own memory merely to coordinate them. References, manifests and bounded results are preferred.

### 3.3 Required module roles

| Module | Runtime relationship | Module authority retained |
| --- | --- | --- |
| Edge OS | substrate and process boundary | boot, devices, resources and OS security |
| Security | identity and trust provider | keys, trust, authorization and compromise response |
| Local Content Store | local content provider | manifests, assets, integrity, quotas and snapshots |
| Player | audiovisual executor | playlist, timing, playback and playback facts |
| OTA | update coordinator | manifest, compatibility, activation, health and rollback |
| Recovery | restoration coordinator | Recovery Plan and recovery state machine |
| Telemetry | observation and synchronization | queue, ledger, buckets and projections |
| Network | connectivity capability | link, route and network health |

Hardware-specific collectors and optional capabilities are registered through the active Hardware Profile and Installation Profile. Their absence must not stop required local playback unless the corresponding profile explicitly makes them mandatory.

---

## 4. Runtime Identity and Trust Inputs

Runtime operations use the identities defined by the upstream contracts:

```text
EdgeInstallationId
DeviceKey reference
HardwareProfile id/version
InstallationProfile id/version
Edge OS version
Runtime version
boot_session_reference
```

The Runtime shall obtain identity and trust state from Security. It shall not create a second identity, derive identity from MAC/IP/Android ID, or silently replace identity after reboot, OTA or Recovery.

Every Runtime command and result shall be bound to the active `EdgeInstallationId`, current boot session and applicable profile versions. Identity migration or reset is an explicit Security/Provisioning operation and cannot be inferred from a missing key.

---

## 5. Runtime Lifecycle

The Runtime process state machine is:

```text
STOPPED
   |
   v
STARTING
   |
   v
RESOLVING_DEPENDENCIES
   |\
   | \ unresolved required dependency
   |  v
   | WAITING_FOR_DEPENDENCY
   |
   +--------------------+
   | all required dependencies ready
   v
ACTIVE <---------> DEGRADED
  |                   |
  | unsafe condition  | required capability lost
  v                   v
SAFE_MODE <------ RECOVERING
  |                   |
  +---------> STOPPING
                    |
                    v
                  STOPPED
```

`FAILED` is an operation result, not a lifecycle state. A process failure is recorded and may lead to restart, `DEGRADED`, `RECOVERING` or `SAFE_MODE` according to the module policy.

### 5.1 State meanings

#### STOPPED

The Runtime is not providing active coordination. Persisted journal and identity remain untouched.

#### STARTING

The process has started and is validating its own configuration, identity and runtime contract.

#### RESOLVING_DEPENDENCIES

The Runtime is checking profile, OS, Security, storage, module contracts and required capabilities. It must not declare `ACTIVE` before all required gates pass.

#### WAITING_FOR_DEPENDENCY

A required dependency is not yet available, but retry or local recovery is permitted. The Runtime exposes the missing dependency and does not fabricate readiness.

#### ACTIVE

All mandatory Runtime gates are satisfied and the Edge is operating under the active profile. Optional capability absence may still be reported separately.

#### DEGRADED

The Runtime remains operational with one or more unavailable or unhealthy non-terminal capabilities. Each affected module and the permitted behavior are explicit in `RuntimeHealth`.

#### RECOVERING

The Runtime is applying a restart, configuration rollback, local recovery handoff or other authorized restoration procedure. Recovery itself remains owned by Recovery.

#### SAFE_MODE

Only the minimum trusted control-plane and recovery functions are active. New business or remote operations are denied unless explicitly allowed by Security and Recovery. Safe Mode must not present itself as normal production health.

#### STOPPING

The Runtime is draining or checkpointing operations before stopping. It shall preserve accepted command identities and module journal state.

### 5.2 Terminal and restart behavior

`STOPPED` is the only terminal process state. `ACTIVE`, `DEGRADED`, `WAITING_FOR_DEPENDENCY`, `RECOVERING` and `SAFE_MODE` may return to a prior operational state only after their gates are reevaluated. An invalid transition produces `RT_INVALID_STATE_TRANSITION` and does not mutate state.

### 5.3 Startup

Startup is idempotent. Repeating startup with the same boot session and configuration returns the original result or a deterministic duplicate result. Startup shall not duplicate module registration, content activation, OTA activation or telemetry events.

---

## 6. Desired, Current and Observed State

TV Network owns the public `DesiredState`, `CurrentState` and `ObservedState` model under `ADR-008` and `DEC-009`. The Runtime consumes Desired State and supplies authenticated local facts from which the EdgeInstallation adapter produces Current State. The Runtime does not own or publish the TV Network `ObservedState` projection.

```text
DesiredState   -> authorized intention published for EdgeInstallation
CurrentState   -> authenticated declaration of what the Edge applied and runs
ObservedState   -> TV Network projection derived from accepted signals
RuntimeObservation -> internal local observation used by Runtime coordination
```

`RuntimeObservation` is intentionally not an alias for public `ObservedState`. This prevents a local process observation from being mistaken for the fleet projection.

### 6.1 DesiredState

`DesiredState` is a versioned, signed or authenticated declaration containing references to:

```text
desired_state_id
revision
EdgeInstallationId
HardwareProfile reference
InstallationProfile reference
Edge OS / Runtime target references
Player and Content Store target references
OTA / Recovery policy references
configuration revision
security policy reference
effective_at
source and authorization
```

The Runtime stores only an authorized desired state. An unavailable Cloud command remains pending or rejected; it is not treated as locally effective merely because it was received.

### 6.2 RuntimeObservation

`RuntimeObservation` is a local, signed or integrity-protected observation containing:

```text
runtime_observation_id
revision
EdgeInstallationId
boot_session_reference
Runtime lifecycle state
module states and health
active profile references
active configuration revision
active content snapshot reference
OTA / Recovery state references
network state
resource state
last transition reason
observed_at
```

RuntimeObservation never claims that Desired State was achieved. The authenticated declaration of applied state is `CurrentState`, and only the TV Network projection may produce `ObservedState`.

### 6.3 Reconciliation

The TV Network Reconciler compares Desired State and the accepted Current/Observed State pair by stable identity and version. Runtime-local coordination may compare Desired State with RuntimeObservation, but it shall not emit `ObservedStateDerived`, invent a missing target, downgrade an active state or bypass Compatibility, Security, OTA or Recovery.

---

## 7. Dependency Graph and Startup Order

The normative logical dependency graph is:

```text
Edge OS
  |
  +--> Security / identity
  |
  +--> persistent Runtime journal
  |
  +--> Local Content Store integrity and active snapshot
  |
  +--> Network capability (optional for local-first operation)
           |
           +--> Telemetry queue and local persistence
           |
           +--> Player
           |
           +--> OTA
           |
           +--> Recovery handoff
```

The startup order is:

1. validate Runtime artifact and configuration;
2. load Edge OS and active profile references;
3. obtain Security identity and trust status;
4. open and validate the Runtime journal;
5. register modules and validate their contract versions;
6. validate Local Content Store state and active snapshot;
7. initialize Telemetry queue and local persistence;
8. initialize Network if available, without blocking local-first startup;
9. initialize Player only after content and capability gates are known;
10. initialize OTA and Recovery orchestration hooks;
11. publish `RuntimeObservation` and `RuntimeHealth` to the authorized EdgeInstallation adapter;
12. enter `ACTIVE`, `DEGRADED`, `WAITING_FOR_DEPENDENCY` or `SAFE_MODE` according to explicit results.

This order is logical, not a requirement for a particular init system or process supervisor. Implementations may optimize it only when the observable dependency guarantees remain identical.

### 7.1 Required versus optional dependencies

Each module registration declares:

```text
required_for_runtime
required_for_playback
required_for_offline
required_for_production
optional_capability
```

If an optional module is unavailable, the Runtime enters `DEGRADED` only when the capability affects an advertised operation; it does not stop unrelated playback. If a required gate is unavailable, the Runtime waits, recovers or enters `SAFE_MODE` and reports the exact reason.

### 7.2 No dependency cycles

The Runtime dependency graph must be acyclic for startup readiness. A module may request the Runtime, but it may not require a downstream module to prove its own identity or authority in a cycle.

---

## 8. Module Registration and Lifecycle

Every module exposes a registration record:

```text
RuntimeModule
|- module_id
|- module_contract_version
|- implementation_version
|- owner_context
|- required_for_runtime
|- required_for_playback
|- supported_states
|- declared_dependencies[]
|- capability_references[]
|- health_contract_reference
|- command_contract_reference
|- resource_profile_reference
|- integrity_reference
```

The Runtime validates registration before accepting commands for the module. Registration is not compatibility evaluation; the module must already be selected by the applicable profile and compatibility contract.

Module lifecycle states are:

```text
UNREGISTERED
REGISTERED
STARTING
READY
DEGRADED
STOPPING
STOPPED
FAILED
QUARANTINED
```

`FAILED` and `QUARANTINED` are reported states, not permission to silently substitute another implementation. A module may be restarted only through an idempotent Runtime operation and only while Security permits it.

---

## 9. Internal Command and IPC Contract

The Runtime exposes a local, authenticated control-plane contract. The transport mechanism is implementation-specific; the observable fields and outcomes are not.

### 9.1 RuntimeCommand

```text
RuntimeCommand
|- command_id
|- command_type
|- command_schema_version
|- EdgeInstallationId
|- boot_session_reference
|- target_module
|- operation_id
|- idempotency_key
|- correlation_reference
|- causation_reference
|- expected_runtime_revision, when applicable
|- desired_module_revision, when applicable
|- payload
|- authorization_reference
|- issued_at
|- expires_at, when declared by the source contract
|- signature_reference or authenticated transport context
```

The command identity and payload are immutable. A retry uses the same `command_id`, `operation_id` and `idempotency_key`.

### 9.2 Command routing

The Runtime validates envelope, identity, authorization, target registration, state preconditions and idempotency before forwarding a command. It does not validate or reinterpret the target module's domain rules.

### 9.3 Internal interfaces

The minimum internal interface set is:

```text
registerModule
getRuntimeHealth
getRuntimeObservation
applyDesiredState
startModule
stopModule
restartModule
forwardModuleCommand
requestReconciliation
requestTelemetryFlush
requestRecoveryHandoff
acknowledgeResult
```

These are control-plane operations. Media payloads, Content Store assets, OTA artifacts and Telemetry batches remain owned by their respective stores and contracts.

### 9.4 Local authentication

Only authenticated local modules with valid registration and Security authorization may invoke privileged Runtime operations. Player-facing interfaces are narrower than control-plane interfaces and cannot access OS, Security, OTA or Recovery privileges.

---

## 10. RuntimeResult

Every Runtime command, lifecycle transition, reconciliation attempt and module orchestration operation returns an immutable `RuntimeResult` or an idempotent reference to the original result.

```text
RuntimeResult
|- result_id
|- command_id
|- operation_id
|- idempotency_key
|- EdgeInstallationId
|- boot_session_reference
|- target_module
|- result_kind
|- runtime_state
|- module_state, when applicable
|- accepted_at
|- completed_at, when applicable
|- observed_revision
|- desired_revision, when applicable
|- error_code, when applicable
|- retryable
|- retry_after_policy_reference, when applicable
|- child_result_references[]
|- evidence_reference, when applicable
|- result_hash
```

### 10.1 Result kinds

```text
ACCEPTED
COMPLETED
DUPLICATE
REJECTED
CONFLICT
DEFERRED
WAITING_FOR_DEPENDENCY
UNAVAILABLE
DEGRADED
FAILED
NOT_EVALUATED
QUARANTINED
```

`NOT_EVALUATED` means the Runtime could not produce the requested decision because a prerequisite was unavailable. It is not a negative domain decision and must not be converted into `REJECTED` without an explicit contract reason.

### 10.2 Child results

When the Runtime coordinates several modules, the parent result references each child result and preserves each module's authority. A parent `COMPLETED` result is valid only when the required child results completed; optional child failures remain visible and produce `DEGRADED` when applicable.

---

## 11. RuntimeHealth

`RuntimeHealth` is a structured operational observation, not a legal or commercial conclusion.

```text
RuntimeHealth
|- health_id
|- EdgeInstallationId
|- boot_session_reference
|- runtime_version
|- lifecycle_state
|- readiness_state
|- liveness_state
|- security_state
|- identity_state
|- dependency_state
|- module_health[]
|- resource_health
|- network_health
|- content_readiness
|- player_readiness
|- ota_state
|- recovery_state
|- telemetry_queue_state
|- last_successful_checkpoint
|- failure_references[]
|- observed_at
|- health_schema_version
|- integrity_reference
```

Readiness and liveness are separate:

```text
ALIVE      -> the Runtime process responds to its local watchdog
READY      -> required local gates for the declared operation are satisfied
DEGRADED   -> operation continues with declared limitations
NOT_READY  -> required gates are not satisfied
UNKNOWN    -> the Runtime could not evaluate the gate
```

The Runtime shall not report `READY` when the active profile, identity, required content snapshot or required security gate is unknown.

### 11.1 Canonical OTA health predicates

The health contracts remain owned by their modules, but OTA uses the following deterministic predicates:

| OTA gate | Required contract result |
| --- | --- |
| `RUNTIME_HEALTHY` | `RuntimeHealth.lifecycle_state = ACTIVE`, `readiness_state = READY`, `liveness_state = ALIVE`, `identity_state = VERIFIED`, `security_state = TRUSTED`, and every dependency marked `required_for_runtime` is satisfied. |
| `PLAYER_HEALTHY` | `PlayerHealth.state = HEALTHY`, Player state is `READY` or `PLAYING`, the active Local Content Store snapshot is integrity-verified, and mandatory display/Web Engine/codec checks pass. |
| OS prerequisite | `Edge OS` is `ACTIVE`, boot trust is verified, identity is stable and no mandatory OS health dimension is `UNHEALTHY` or `UNKNOWN`. |

`DEGRADED`, `NOT_READY`, `UNKNOWN`, `UNHEALTHY`, `SAFE_MODE`, `RECOVERING` or a failed mandatory capability never satisfy an OTA health gate. Optional collector absence may coexist with `HEALTHY` only when the active Hardware Profile declares that collector optional.

---

## 12. Supervision, Watchdog and Restart

### 12.1 Supervision

Supervision is layered and non-overlapping:

| Layer | Sole supervision responsibility | It must not supervise |
| --- | --- | --- |
| Edge OS | the Edge Runtime process, OS resources and OS watchdog | individual Player/Store/OTA/Recovery module operations |
| Edge Runtime | registered module processes/service boundaries and Runtime watchdog | the OS, bootloader, public EdgeInstallation Aggregate or Playback facts |
| Player | audiovisual progress and PlayerHealth | Runtime process, OS state or Evidence validity |
| Recovery | execution of the authorized Recovery Plan after handoff | choosing compatibility, changing identity implicitly or replacing another module's owner |

The OS may restart or isolate the Runtime process. Runtime may request restart of a registered module. The same process shall not be restarted concurrently by both layers. A restart fact is translated to the public TV Network events only by the EdgeInstallation adapter described in [`TV_NETWORK_EVENTS.md`](../tv-network/TV_NETWORK_EVENTS.md).

The Runtime supervises registered module processes or service boundaries through:

- liveness heartbeats;
- readiness checks;
- command completion and checkpoint monitoring;
- resource pressure observations;
- crash and exit reason capture;
- integrity and authorization checks;
- bounded restart policy.

The exact heartbeat period, restart count and grace interval are profile/configuration parameters. Their absence must not change the semantic result: a module is either observed healthy, degraded, unavailable or failed.

### 12.2 Watchdog behavior

The watchdog shall:

1. detect a missed or invalid health signal;
2. record the module, operation, boot session and failure reason;
3. attempt only an authorized, idempotent restart or recovery action;
4. preserve accepted command and telemetry identities;
5. revalidate dependencies after restart;
6. transition to `DEGRADED`, `RECOVERING` or `SAFE_MODE` when recovery is not safe.

The watchdog shall not kill a healthy Player merely because an optional telemetry collector is unavailable.

### 12.3 Restart policy

Restart is allowed only for a registered module whose contract declares restart safety. A restart must not duplicate a committed content activation, OTA activation, Recovery transition, Playback fact or Telemetry event. If the previous operation is ambiguous, the Runtime resumes from its journal rather than issuing a new identity.

### 12.4 Starvation prevention

The Runtime shall reserve bounded CPU, memory, storage I/O and IPC capacity for:

```text
control plane
Security / identity
Player supervision
Local Content Store access
Telemetry persistence
Recovery handoff
```

Large content transfers, OTA staging and diagnostic output shall be throttled or deferred when they threaten those reserves. Resource policy is selected by the Hardware Profile and Installation Profile; an implementation may not claim a profile while violating its mandatory reserves.

---

## 13. Low-Resource Operation

### 13.1 One-gigabyte RAM class

For a Hardware Profile with approximately one gigabyte of RAM, the Runtime shall:

- run as a minimal control plane;
- avoid loading media assets into Runtime memory;
- keep IPC payloads bounded and stream large data through owned stores;
- keep only the active state and bounded recent results in memory;
- prevent unbounded logs, queues, child-result arrays or configuration history;
- give Player and OS reservations precedence over optional collectors;
- schedule OTA, garbage collection, projection work and diagnostics away from active playback when resource pressure requires it;
- expose memory pressure before forced termination;
- degrade optional capabilities before interrupting already-authorized local playback.

The exact memory ceiling and reservation values come from the Hardware Profile. A Runtime must reject activation when the profile's mandatory resource contract cannot be proven.

### 13.2 Resource pressure states

```text
NORMAL
PRESSURED
CRITICAL
EXHAUSTED
UNKNOWN
```

At `PRESSURED`, optional work is deferred. At `CRITICAL`, the Runtime protects control-plane, Player, Content Store and Telemetry persistence paths. At `EXHAUSTED`, it enters the profile-authorized safe or recovery path and reports the loss without fabricating health.

### 13.3 Process isolation

The Runtime shall use the isolation primitives available to the active Edge OS. It shall not assume a container, cgroup, namespace or specific init system unless the Hardware Profile/Edge OS contract declares it. Lack of an optional isolation primitive must be reported and may block the affected profile, but must not silently broaden module privileges.

---

## 14. Configuration and Secrets

### 14.1 Configuration contract

Runtime configuration is versioned and scoped:

```text
runtime_configuration_id
configuration_revision
EdgeInstallationId
HardwareProfile reference
InstallationProfile reference
module configuration references
resource policy reference
network policy reference
security policy reference
effective_at
source
integrity reference
```

Configuration activation is atomic from the Runtime's point of view. A candidate must be validated against active profiles and module contracts before becoming effective. Invalid or incompatible configuration remains inactive and produces an explicit result.

### 14.2 Configuration update

The Runtime stages, validates, checkpoints and activates a new configuration without losing the last known-good configuration. If activation or health confirmation fails, it restores the previous configuration and reports the failed revision.

Configuration does not change domain semantics. It may tune operational parameters only where the owning specification permits configuration.

### 14.3 Secrets

Security owns secret generation, storage, rotation, revocation and access authorization. Runtime may request a short-lived capability or secret operation, but it shall not:

- persist raw private keys;
- include tokens or credentials in RuntimeResult, Telemetry, logs or crash dumps;
- expose one module's secret to another module;
- fall back to a hard-coded secret;
- treat an unavailable secret as an empty or anonymous credential.

---

## 15. Network, Cloud and Remote Commands

### 15.1 Network boundary

Network is a capability, not a universal Runtime dependency. The Runtime observes link and authentication state through the Network/Security contracts and reports it to Telemetry.

### 15.2 Cloud synchronization

When connected, the Runtime may synchronize:

- authenticated Desired State;
- module status and RuntimeHealth;
- Telemetry queue flush requests;
- OTA and Recovery coordination requests;
- configuration revisions;
- operational acknowledgements.

Cloud synchronization must use the Security contract, preserve operation identities and remain idempotent. A Cloud timeout is not evidence that a local operation failed; the journal and module result determine whether it is pending, completed, duplicated or ambiguous.

### 15.3 Remote command pipeline

```text
Cloud command
      |
      v
Security authentication and authorization
      |
      v
Runtime envelope and idempotency validation
      |
      v
Compatibility/profile precondition already resolved by its owner
      |
      v
Target module command
      |
      v
Module result
      |
      v
RuntimeResult + Telemetry
```

The Runtime shall reject a remote command when authentication, authorization, identity, profile, target registration, expiry or idempotency cannot be evaluated. It shall not use a global fallback command path.

### 15.4 Offline behavior

When Cloud is unavailable:

- active local playback continues from the validated Local Content Store;
- Runtime state and module results remain journaled locally;
- Telemetry remains queued according to `EDGE_TELEMETRY.md`;
- local Recovery and health supervision continue;
- locally staged and authorized OTA may continue only under the OTA contract;
- remote commands remain pending, expire or are rejected according to their source contract;
- no Cloud absence is converted into successful acknowledgement.

On reconnection, the Runtime resumes by operation identity and checkpoint, not by replaying arbitrary commands.

---

## 16. Module Orchestration

### 16.1 Player orchestration

The Runtime provides Player with:

- active profile and capability references;
- authorized manifest and Local Content Store references;
- time and schedule context;
- start/stop/reload/recover requests;
- resource and network status.

The Player owns the playback state machine, duration, transition, fallback content, `PlayerHealth` and `PlaybackResult`. Runtime health does not replace PlayerHealth, and Runtime must not claim a Playback fact on Player's behalf.

### 16.2 Local Content Store orchestration

The Runtime requests content readiness, active snapshot, integrity status, staging or rollback through the Content Store contract. The Store owns asset hashes, atomic activation, quotas, expiry, garbage collection and offline persistence. Runtime does not write campaign assets directly into arbitrary filesystem paths.

### 16.3 OTA orchestration

The Runtime starts or monitors OTA only after an authorized request. OTA owns target resolution, manifest, artifact verification, activation, health confirmation, anti-downgrade, rollback and `UpdateResult`. Runtime cannot select an artifact by version or product name.

### 16.4 Recovery handoff

When the Runtime cannot restore a required state safely, it creates an authenticated Recovery handoff containing:

```text
recovery_request_id
EdgeInstallationId
boot_session_reference
current Runtime state
failed module and operation
checkpoint/journal reference
active profile references
integrity and security findings
requested Recovery Plan reference, when known
```

Recovery owns the plan and state machine. Runtime waits for, observes and reports the handoff result.

### 16.5 Security integration

Security authorizes module registration, privileged commands, identity use, certificate/key operations, quarantine and compromise response. Runtime must enter `SAFE_MODE` or `RECOVERING` when Security reports a condition that makes normal orchestration unsafe.

### 16.6 Telemetry integration

Runtime emits operational observations through Telemetry and requests queue flush or synchronization when appropriate. Telemetry owns event persistence, deduplication, retention, Ledger and projections. Runtime never manufactures Evidence, audience measurements or financial outcomes.

---

## 16.7 Public event bridge

Runtime-local results never become public TV Network events by name substitution. The authorized EdgeInstallation adapter maps them as follows:

| Runtime observation/result | Public event | Authority and ordering |
| --- | --- | --- |
| desired revision applied and local Current State sealed | `CurrentStateReported` | EdgeInstallation; ordered by boot session and sequence |
| restart operation accepted | `ProcessRestartRequested` | EdgeInstallation; causal link to Runtime command |
| restart operation completed/failed | `ProcessRestarted` / `ProcessRestartFailed` | EdgeInstallation; same operation identity |
| watchdog stall detected | `WatchdogStallDetected` | EdgeInstallation; no Playback conclusion |
| remote operation terminal result | matching `RemoteOperation*` event | target owner/coordinator; original operation identity |
| local observation used for fleet projection | consumed as signal for `ObservedStateDerived` | TV Network projection only; never Runtime producer |

The Runtime preserves event identity, correlation, causation, boot session and digest in the handoff. `RuntimeResult` remains the authoritative local result; the public event is a separate fact produced by its accepted TV Network owner.

## 17. Desired-State Reconciliation and Checkpoints

The Runtime journal is append-only for accepted control-plane facts and contains:

```text
operation_id
command_id
idempotency_key
desired revision
observed revision before/after
target module
checkpoint
child result references
state transition
timestamp quality
integrity reference
```

Checkpoints are written before an operation crosses an irreversible boundary defined by the target module. After power loss or process restart, the Runtime reads the journal and asks the target module for its authoritative state. It must not infer completion from a missing acknowledgement.

Reconciliation is deterministic:

```text
same operation identity + same payload -> original result or resume
same identity + divergent payload    -> CONFLICT
missing target state                 -> NOT_EVALUATED / RECOVERY_REQUIRED
stale desired revision               -> REJECTED / CONFLICT
```

---

## 18. Shutdown and Power Interruption

### 18.1 Graceful shutdown

On authorized shutdown the Runtime shall:

1. stop accepting new non-critical commands;
2. notify modules through their lifecycle contracts;
3. checkpoint in-flight control-plane operations;
4. preserve Player/Content Store atomicity;
5. flush or persist Telemetry according to its queue contract;
6. record the shutdown result;
7. stop child modules in dependency order;
8. enter `STOPPED`.

### 18.2 Unexpected interruption

After power loss, the Runtime starts with a new boot session, validates the journal and asks each module to recover its authoritative state. It must preserve identity, active content snapshot, OTA/Recovery checkpoint and Telemetry event identities.

An incomplete operation is resumed, marked duplicate, rejected or handed to Recovery according to the owning module's contract. It is never silently treated as completed.

---

## 19. Degraded Mode and Safe Mode

### 19.1 Degraded mode

`DEGRADED` is allowed when:

- local playback remains authorized and safe;
- required identity and integrity gates remain valid;
- the unavailable capability is explicitly identified;
- the fallback behavior is defined by the owning module;
- Telemetry records the limitation.

Examples include unavailable optional camera/Wi-Fi collectors, Cloud disconnection or deferred OTA. Degraded mode must not invent missing measurements or silently change commercial commitments.

### 19.2 Safe mode

`SAFE_MODE` is required when normal orchestration cannot be trusted, for example:

- identity or trust cannot be verified;
- active profile/configuration is invalid;
- Runtime integrity is compromised;
- required storage is corrupted;
- repeated restarts exhaust the declared safety policy;
- Recovery or Security requires isolation.

Safe Mode permits only explicitly authorized diagnostics, local integrity checks, Security actions and Recovery handoff. It shall not execute arbitrary content, remote commands or unverified updates.

### 19.3 Module unavailable

The Runtime classifies an unavailable module as:

```text
OPTIONAL_UNAVAILABLE
REQUIRED_WAITING
REQUIRED_FAILED
SECURITY_BLOCKED
PROFILE_UNSUPPORTED
```

The classification comes from the module/profile contract. Runtime cannot downgrade a required dependency to optional to obtain `ACTIVE`.

---

## 20. Configuration, Versioning and Compatibility

Runtime, module and command versions are opaque identities. The Runtime compares them only through the applicable producer/consumer compatibility contract and never orders or normalizes version text.

The Runtime accepts only explicitly supported module contracts. An absent compatibility entry is not support. `DEPRECATED` does not change behavior; `EXPERIMENTAL` does not produce official effects unless the consumer contract explicitly authorizes it; `UNSUPPORTED` rejects the operation without invalidating the published artifact.

A Runtime update, module update or configuration update must preserve:

- EdgeInstallationId;
- active Hardware Profile and Installation Profile references;
- local content and Telemetry stores;
- journal and idempotency identities;
- last-known-good state;
- Security trust and anti-downgrade rules.

---

## 21. Runtime Error Catalog

The Runtime reports stable `RT-*` codes. Codes describe the failed control-plane operation, not a new domain rule.

### 21.1 Envelope and identity

| Code | Meaning | Retry |
| --- | --- | --- |
| `RT_COMMAND_INVALID` | command envelope is malformed | No |
| `RT_COMMAND_SCHEMA_UNSUPPORTED` | command schema is not supported | No |
| `RT_COMMAND_DUPLICATE_CONFLICT` | identity reused with divergent payload | No |
| `RT_IDENTITY_MISSING` | EdgeInstallationId or required identity unavailable | After Security/Recovery |
| `RT_IDENTITY_CONFLICT` | active identity conflicts with trusted state | No; Recovery/Security |
| `RT_BOOT_SESSION_INVALID` | boot session is missing or inconsistent | After restart/recovery |
| `RT_AUTHENTICATION_FAILED` | caller authentication failed | No |
| `RT_AUTHORIZATION_DENIED` | caller is not authorized for the operation | No |
| `RT_COMMAND_EXPIRED` | command is outside its effective period | No |

### 21.2 Lifecycle and dependencies

| Code | Meaning | Retry |
| --- | --- | --- |
| `RT_INVALID_STATE_TRANSITION` | lifecycle transition is not allowed | No |
| `RT_DEPENDENCY_MISSING` | required dependency is not registered | After registration |
| `RT_DEPENDENCY_UNAVAILABLE` | required dependency cannot be reached | Yes, bounded |
| `RT_DEPENDENCY_UNSUPPORTED` | dependency contract is incompatible | No |
| `RT_DEPENDENCY_CYCLE` | dependency graph contains a cycle | No |
| `RT_WAITING_FOR_DEPENDENCY` | operation is deferred while a required gate is unavailable | Yes |
| `RT_MODULE_NOT_REGISTERED` | target module has no valid registration | No |
| `RT_MODULE_QUARANTINED` | Security or Recovery blocks target module | After explicit release |
| `RT_SAFE_MODE_REQUIRED` | normal orchestration is unsafe | Recovery/Security |
| `RT_RUNTIME_NOT_READY` | Runtime has not completed readiness gates | Yes, bounded |

### 21.3 Journal, resources and execution

| Code | Meaning | Retry |
| --- | --- | --- |
| `RT_JOURNAL_UNAVAILABLE` | control-plane journal cannot be opened | Recovery |
| `RT_JOURNAL_CORRUPTED` | journal integrity or continuity failed | Recovery |
| `RT_CHECKPOINT_CONFLICT` | checkpoint diverges from module state | No; reconcile |
| `RT_OPERATION_IN_PROGRESS` | same operation is already executing | Reuse identity |
| `RT_RESOURCE_PRESSURE` | resource policy deferred the operation | Yes, bounded |
| `RT_RESOURCE_EXHAUSTED` | resource safety reserve cannot be preserved | Recovery/Safe Mode |
| `RT_RESTART_NOT_SAFE` | target module does not declare safe restart | No |
| `RT_RESTART_LIMIT_REACHED` | bounded restart policy was exhausted | Recovery |
| `RT_WATCHDOG_TIMEOUT` | health/liveness deadline was missed | Bounded restart |
| `RT_OPERATION_AMBIGUOUS` | completion cannot be determined safely | Reconcile |

### 21.4 Module-specific handoff

| Code | Meaning | Retry |
| --- | --- | --- |
| `RT_PLAYER_HANDOFF_REJECTED` | Player rejected the Runtime request | According to Player |
| `RT_CONTENT_STORE_NOT_READY` | active content snapshot is unavailable | After Store recovery |
| `RT_OTA_HANDOFF_REJECTED` | OTA rejected the request | According to OTA |
| `RT_RECOVERY_HANDOFF_REJECTED` | Recovery rejected the handoff | Security/Recovery |
| `RT_TELEMETRY_HANDOFF_REJECTED` | Telemetry rejected the observation/flush request | According to Telemetry |
| `RT_SECURITY_HANDOFF_REJECTED` | Security rejected the privileged operation | No |
| `RT_NETWORK_UNAVAILABLE` | network capability is unavailable | Yes, bounded |
| `RT_REMOTE_COMMAND_NOT_EVALUATED` | remote command prerequisites could not be evaluated | Retry same identity |
| `RT_RESULT_SEAL_FAILED` | RuntimeResult integrity could not be sealed | No |

No Runtime error code authorizes a module to fabricate a result, bypass a contract or mutate another bounded context.

---

## 22. Normative Requirements

### RT-001

The Runtime shall coordinate Edge modules without taking ownership of their domain decisions.

### RT-002

The Runtime shall not choose Hardware Profiles, Installation Profiles, OS images, Player artifacts, codecs or OTA artifacts by inference.

### RT-003

Every Runtime command shall have immutable identity, target, authorization context, idempotency identity and applicable boot session.

### RT-004

Retries shall reuse the original command and operation identities.

### RT-005

The Runtime shall preserve the distinction between Desired State, Current State and the TV Network Observed State projection. Its local record shall be named `RuntimeObservation` and shall never be published as `ObservedStateDerived`.

### RT-006

The Runtime shall not report `ACTIVE` until mandatory identity, security, profile, journal and module readiness gates pass.

### RT-007

The Runtime shall expose explicit `WAITING_FOR_DEPENDENCY`, `DEGRADED`, `RECOVERING` and `SAFE_MODE` behavior.

### RT-008

The dependency graph used for startup readiness shall be acyclic and version-validated.

### RT-009

Module registration shall identify owner, contract version, dependencies, capabilities and resource policy.

### RT-010

An absent compatibility entry shall not be inferred as supported.

### RT-011

The Runtime shall authenticate and authorize local privileged modules and remote commands through Security.

### RT-012

The Runtime shall never expose DeviceKey private material, credentials or secrets in commands, results, logs or telemetry.

### RT-013

The Runtime shall journal accepted operations and checkpoints before irreversible module boundaries.

### RT-014

Power loss and restart shall resume or reconcile by the original operation identity and authoritative module state.

### RT-015

The Runtime shall distinguish liveness, readiness, degradation, unavailable dependencies and safe mode.

### RT-016

The watchdog shall preserve control-plane, Player, Content Store, Telemetry and Recovery safety reserves.

### RT-017

Optional collector failure shall not stop authorized local playback when the active profile does not require that collector.

### RT-018

The Runtime shall not make Cloud connectivity a prerequisite for playback of validated local content.

### RT-019

Remote commands received offline shall remain pending, expire or be rejected according to their source contract and shall not be acknowledged as completed.

### RT-020

The Runtime shall route Player requests without creating Playback facts or Evidence on behalf of Player or Evidence Ledger.

### RT-021

The Runtime shall route Local Content Store operations without directly mutating authoritative content assets.

### RT-022

The Runtime shall route OTA operations without selecting artifacts or bypassing manifest, signature, anti-downgrade or rollback rules.

### RT-023

The Runtime shall hand off Recovery without replacing the Recovery Plan or Recovery state machine.

### RT-024

The Runtime shall forward operational observations to Telemetry without creating Evidence, Audience authority or financial outcomes.

### RT-025

Runtime configuration activation shall be versioned, validated, atomic and reversible to a last-known-good revision.

### RT-026

Invalid or unavailable configuration shall produce an explicit result and shall not be interpreted as an empty configuration.

### RT-027

Runtime and module artifacts shall preserve EdgeInstallationId, profile references, content, telemetry, journal and security trust across authorized updates.

### RT-028

The Runtime shall enforce bounded resource use and protect control-plane and playback reserves on one-gigabyte RAM class hardware.

### RT-029

The Runtime shall defer or reject optional work before allowing starvation of required local operation.

### RT-030

The Runtime shall report the exact module, dependency, resource or security reason for degraded and safe operation.

### RT-031

The Runtime shall not silently downgrade required dependencies to optional in order to enter `ACTIVE`.

### RT-032

Every Runtime operation shall produce an immutable `RuntimeResult` or an idempotent reference to the original result.

### RT-033

Parent orchestration results shall preserve child module results and shall not hide optional failures.

### RT-034

The Runtime shall reject invalid lifecycle transitions and shall not mutate state after a rejected transition.

### RT-035

The Runtime shall preserve source timestamps, sequence, correlation and integrity metadata when forwarding Telemetry.

### RT-036

The Runtime shall treat identity, authorization, compatibility and integrity evaluation failures as explicit failures or non-evaluated results, never as success.

### RT-037

The Runtime shall not claim Cloud acceptance, module completion or production health solely because a command was locally queued.

### RT-038

The Runtime shall keep large content, telemetry and OTA payloads in their owning stores rather than loading them unboundedly into Runtime memory.

### RT-039

Safe Mode shall deny arbitrary content, unverified updates and unauthorized remote commands.

### RT-040

The Runtime shall emit sufficient health, transition, resource and failure observations for Telemetry without emitting secrets.

---

## 23. Completion Criteria

An Edge Runtime implementation is conformant only when the active Hardware Profile and Installation Profile prove:

```text
runtime artifact and contract identity
EdgeInstallationId and Security integration
acyclic dependency graph
module registration and compatibility
Desired State consumption, Current State declaration and RuntimeObservation persistence
startup, shutdown and power-loss recovery
RuntimeCommand and RuntimeResult behavior
RuntimeHealth and watchdog behavior
bounded restart and retry policy
offline local-first operation
Player, Content Store, OTA, Recovery, Security and Telemetry boundaries
configuration validation and rollback
resource reserves for the target hardware
degraded and safe-mode behavior
RT-* error implementation
```

A missing technical parameter remains a profile/configuration gap; it does not authorize an implementation to invent a different observable behavior. A module-specific contract remains the authority for its own result.

---

## 24. Relationship to Other Specifications

```text
EDGE_HARDWARE_COMPATIBILITY.md
        |
        v
EDGE_HARDWARE_DISCOVERY.md
        |
        v
EDGE_HARDWARE_PROFILES.md
        |
        v
EDGE_INSTALLATION_PROFILES.md
        |
        +--> EDGE_INSTALLER_SPECIFICATION.md
        +--> EDGE_PROVISIONING.md
        +--> EDGE_RECOVERY.md
        +--> EDGE_OS_SPECIFICATION.md
                    |
                    v
          EDGE_RUNTIME_SPECIFICATION.md
             +------+------+------+------+------+
             |      |      |      |      |      |
          Player Store   OTA Recovery Security Telemetry
```

The Runtime consumes the contracts above and coordinates their lifecycle. It does not introduce a new Bounded Context, alter the accepted domain model or create a second authority for any module.

---

## 25. Next Review

Before implementation, the Architecture Review Gate shall verify:

```text
Runtime remains a coordinator and not a supermodule
all module owners and boundaries are unique
startup dependencies are acyclic
Desired State, Current State, RuntimeObservation and TV Network Observed State cannot be confused
RuntimeCommand and RuntimeResult are idempotent and authenticated
Player keeps playback authority
Content Store keeps asset authority
OTA keeps update authority
Recovery keeps recovery authority
Security keeps trust and secret authority
Telemetry keeps queue, ledger and projection authority
offline playback does not depend on Cloud
one-gigabyte resource reserves are feasible per Hardware Profile
degraded and safe-mode transitions are reachable and testable
no RT-* code creates a domain decision
```

The next technical specifications may refine profile-specific parameters, but they must not transfer module authority to Runtime or change the observable behavior established here without a new architectural decision.
