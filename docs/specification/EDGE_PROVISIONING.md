# Mostarda Edge — Provisioning Specification

**Status:** DRAFT  
**Version:** 1.0.0  
**Owner:** Mostarda Architecture  
**Prerequisites:** `EDGE_HARDWARE_COMPATIBILITY.md`, `EDGE_HARDWARE_DISCOVERY.md`, `EDGE_HARDWARE_PROFILES.md`, `EDGE_INSTALLER_SPECIFICATION.md`  
**Related ADR:** ADR-010 — Edge Hardware and Provisioning  
**Scope:** controlled transition of a validated device into a known and reproducible Edge state

---

## 1. Purpose

This document defines the normative contract for Provisioning.

Provisioning executes and controls the technical transition of a device from its current state to a known, reproducible and verifiable Mostarda Edge state.

It defines:

- provisioning inputs and outputs;
- provisioning states and state machine;
- mandatory Installation Profile usage;
- preparation, artifact acquisition and verification;
- partitioning, system writing and boot configuration;
- Edge Runtime installation;
- identity, network and configuration persistence;
- transactional journal and checkpoints;
- retry, resume, rollback and recovery;
- offline execution;
- safety during power loss and interruption;
- security, signatures and integrity;
- logs, evidence and telemetry;
- compatibility with Full, Assisted and External Bootstrap methods;
- post-provisioning validation and idempotency.

Provisioning does not choose a Hardware Profile, evaluate compatibility or select an Installation Profile. Those decisions are completed before Provisioning begins.

---

## 2. Architectural Separation

The normative relationship is:

```text
HardwareProfile
      ↓
InstallationProfile
      ↓
Installer
      ↓
Provisioning
      ↓
Edge OS
```

### 2.1 Installer

The Installer orchestrates an installation initiated by the user or an authorized maintenance operation.

It performs or requests:

- Hardware Discovery;
- Hardware Profile matching;
- Compatibility Evaluation;
- Installation Profile resolution;
- authorization and data-disposition confirmation;
- selection of the provisioning operation.

### 2.2 Provisioning

Provisioning executes the already resolved plan.

It is responsible for:

- preparing the target;
- acquiring or receiving authorized artifacts;
- applying the declared partition and write plan;
- configuring boot;
- installing Edge OS and Edge Runtime;
- configuring identity, network and persistent state;
- maintaining checkpoints and journal;
- resuming or rolling back safely;
- validating the resulting Edge state.

### 2.3 Explicit non-responsibilities

Provisioning shall not:

- select the nearest or most similar Hardware Profile;
- decide whether hardware is compatible;
- accept an unsigned or arbitrary artifact;
- infer an Installation Profile;
- replace a missing partition plan with a generic one;
- change Campaign, Pricing, Financial, Evidence or Settlement behavior;
- publish a Hardware Profile;
- make a commercial or business decision.

If an input is missing or ambiguous, Provisioning stops and reports the reason to the Installer.

---

## 3. Provisioning Inputs

Provisioning shall receive a complete, immutable plan for the operation.

```text
ProvisioningRequest
├── provisioning_id
├── parent_installation_operation_id
├── target_identity
├── sealed_discovery_reference
├── hardware_profile_reference
├── compatibility_result_reference
├── installation_profile_reference
├── artifact_manifest_reference
├── data_disposition_plan
├── identity_plan
├── network_plan
├── requested_state
├── authorization_reference
├── recovery_plan_reference
├── provisioning_contract_version
└── installer_version
```

### 3.1 Required references

The following are mandatory:

- sealed `HardwareDiscoveryRecord`;
- signed and effective `HardwareProfile`;
- explicit Compatibility Evaluation Result;
- exactly one effective `InstallationProfile`;
- signed artifact manifest;
- explicit data-disposition plan;
- identity plan;
- recovery or rollback reference;
- authorization reference.

Provisioning shall reject a request that lacks any mandatory reference. It shall not fill the gap by inference.

### 3.2 Installation Profile as authority

The Installation Profile is the authoritative input for:

```text
installation method
target partitions
artifact placement
boot configuration
runtime placement
identity bootstrap
network bootstrap
checkpoints
rollback path
recovery path
```

Provisioning may validate that the plan is internally consistent, but it shall not replace a declared value with a locally preferred value.

---

## 4. Provisioning Output

Every provisioning operation shall produce an immutable `ProvisioningResult`.

```text
ProvisioningResult
├── provisioning_id
├── parent_installation_operation_id
├── terminal_state
├── target_identity
├── hardware_profile_reference
├── installation_profile_reference
├── artifact_manifest_reference
├── completed_checkpoints[]
├── state_history_reference
├── identity_result
├── network_result
├── persistence_result
├── boot_result
├── runtime_result
├── validation_result
├── rollback_or_recovery_result
├── diagnostics_reference
├── telemetry_reference
└── result_hash
```

The result shall distinguish `COMPLETED`, `ROLLED_BACK`, `RECOVERY_REQUIRED`, `FAILED`, `PAUSED` and `CANCELLED`. A partial write shall never be represented as completed provisioning.

---

## 5. Provisioning State Machine

Provisioning shall use the following state machine:

```text
NOT_STARTED
      ↓
ACCEPTED
      ↓
PREPARING
      ↓
ARTIFACTS_STAGED
      ↓
PARTITIONING
      ↓
SYSTEM_WRITTEN
      ↓
BOOT_CONFIGURED
      ↓
RUNTIME_INSTALLED
      ↓
IDENTITY_CONFIGURED
      ↓
NETWORK_CONFIGURED
      ↓
CONFIGURATION_PERSISTED
      ↓
CHECKPOINT_VALIDATED
      ↓
ACTIVATING
      ↓
POST_PROVISIONING_VALIDATION
      ├── COMPLETED
      ├── ROLLBACK_PENDING
      ├── RECOVERY_REQUIRED
      └── FAILED
```

At any safe checkpoint before irreversible work, the operation may enter `PAUSED` or `CANCELLED`.

### 5.1 NOT_STARTED

No provisioning step has been accepted for the provisioning identity.

### 5.2 ACCEPTED

The complete request, references and authorization were accepted for processing. No target write has occurred.

### 5.3 PREPARING

The target environment, power condition, identity state, storage and required prerequisites are being validated.

### 5.4 ARTIFACTS_STAGED

All required artifacts are available locally, signed, digest-verified and bound to the selected profile and installation plan.

### 5.5 PARTITIONING

The Installation Profile's partition plan is being applied or verified. No undeclared partition may be created, modified or erased.

### 5.6 SYSTEM_WRITTEN

The declared Edge OS and supporting artifacts were written to their target locations and passed write verification.

### 5.7 BOOT_CONFIGURED

The declared boot configuration was applied and verified without activating an unverified system.

### 5.8 RUNTIME_INSTALLED

Edge Runtime and its required local dependencies were installed and verified.

### 5.9 IDENTITY_CONFIGURED

The target identity was created, preserved or migrated according to the identity plan.

### 5.10 NETWORK_CONFIGURED

The declared network configuration was persisted and tested to the extent required by the Installation Profile.

### 5.11 CONFIGURATION_PERSISTED

The configuration, journal metadata, profile references and recovery markers were persisted according to the plan.

### 5.12 CHECKPOINT_VALIDATED

All mandatory checkpoints completed successfully and the operation may proceed to activation.

### 5.13 ACTIVATING

The target selects the newly provisioned system or slot according to the profile-specific activation mechanism.

### 5.14 POST_PROVISIONING_VALIDATION

The system boots and demonstrates the required Edge OS, Runtime, identity, configuration, Player and telemetry behavior.

### 5.15 COMPLETED

All mandatory post-provisioning checks passed and the result was sealed.

### 5.16 PAUSED

The operation stopped at a safe checkpoint without reporting success or failure. Resume requires the same operation identity and an unchanged plan.

### 5.17 ROLLBACK_PENDING

The newly written state cannot be safely activated or validated and a declared rollback path is available.

### 5.18 ROLLED_BACK

The last known-good state was restored and verified. This is not a successful provisioning result.

### 5.19 RECOVERY_REQUIRED

Normal rollback did not complete or the Installation Profile requires a recovery mechanism. Provisioning stops normal execution and hands off to the Recovery contract.

### 5.20 FAILED

The operation ended without a completed provisioning or verified rollback result.

### 5.21 CANCELLED

The operation was cancelled at an allowed safe point. No success is implied.

---

## 6. State Transition Rules

Every transition shall record:

```text
provisioning_id
previous_state
next_state
transition_reason
checkpoint_reference
actor
observed_at
evidence_reference
state_revision
```

### 6.1 Forward transitions

Forward transitions shall occur only in the order defined by the selected Installation Profile. A skipped mandatory state is invalid.

### 6.2 Backward transitions

Provisioning shall not move a state backward by simply changing the current value. Rollback and recovery are explicit transitions with their own evidence and result.

### 6.3 Terminal states

`COMPLETED`, `ROLLED_BACK`, `RECOVERY_REQUIRED`, `FAILED` and `CANCELLED` are terminal for the current provisioning attempt. A resume creates a new attempt revision under the same provisioning identity; it does not rewrite the terminal history.

### 6.4 Invalid transition

An invalid transition shall stop the operation and emit `PROVISIONING_INVALID_STATE_TRANSITION`. The target shall remain at the last safe checkpoint whenever possible.

---

## 7. Preparation Phase

Before staging or writing, Provisioning shall verify:

- request and authorization integrity;
- target identity binding;
- discovery record seal and freshness;
- Hardware Profile signature and effective lifecycle;
- compatibility result and requested state;
- Installation Profile signature and applicability;
- artifact manifest availability;
- data-disposition plan;
- identity plan;
- power stability signal, when observable;
- available staging storage;
- declared target partition visibility;
- recovery or rollback availability;
- required installation method prerequisites.

Preparation shall not modify target partitions.

If the device is not in the expected starting state, Provisioning shall stop or execute an explicitly declared preparation action. It shall not normalize the device by deleting unknown data.

---

## 8. Artifact Acquisition and Verification

### 8.1 Acquisition sources

Artifacts may be supplied through:

```text
network
local content store
signed external media
authorized bootstrap channel
```

The source does not change the validation requirements.

### 8.2 Manifest

The manifest shall declare:

```text
hardware_profile_id
hardware_profile_version
installation_profile_id
installation_profile_version
provisioning_contract_version
edge_os_artifact
runtime_artifact
boot_artifacts
recovery_artifacts
rollback_artifacts
partition_plan_reference
```

### 8.3 Verification sequence

Provisioning shall:

```text
resolve manifest
    ↓
verify manifest signature
    ↓
verify target profile and scope
    ↓
acquire artifacts
    ↓
verify artifact signatures
    ↓
verify artifact digests
    ↓
verify storage and staging
    ↓
seal staged set
```

An artifact that fails any step shall not enter `ARTIFACTS_STAGED`.

### 8.4 No arbitrary image

Provisioning shall never:

- infer a filename from a commercial model;
- select a generic image;
- use an artifact from a similar board;
- accept a file merely because it boots;
- bypass a manifest mismatch;
- substitute an unsigned recovery image.

---

## 9. Partitioning

The Installation Profile shall declare the partition plan.

The plan shall identify, where applicable:

```text
partition name
role
target device
start
size
filesystem
writable state
preservation policy
rollback relation
recovery relation
```

### 9.1 Pre-write partition checks

Provisioning shall verify:

- the target device identity;
- partition topology;
- write permissions;
- declared sizes;
- reserved capacity;
- preservation requirements;
- absence of an undeclared destructive operation.

### 9.2 Unknown topology

If the target partition topology does not match the Installation Profile, Provisioning shall stop. It shall not guess a partition or rewrite the table generically.

### 9.3 Preservation

Partitions marked `PRESERVE` or `MIGRATE` shall not be erased before the corresponding policy checkpoint is complete.

### 9.4 Verification

After partitioning, Provisioning shall re-read and verify the declared topology before writing the system.

---

## 10. System Writing

System writing shall be limited to the declared artifacts and partitions.

The write process shall:

1. record the target and artifact in the journal;
2. establish the safe write boundary;
3. write the artifact;
4. flush or commit according to the Installation Profile;
5. verify the target digest or equivalent integrity evidence;
6. record the completed write;
7. continue only after the checkpoint succeeds.

The exact low-level mechanism is Installation Profile-specific. The observable safety contract is not.

Provisioning shall not report `SYSTEM_WRITTEN` until every required target write has been verified.

---

## 11. Boot Configuration

Boot configuration shall use only the boot contract referenced by the Installation Profile.

It may include:

```text
boot entry
boot partition
kernel reference
device-tree reference
root filesystem reference
recovery entry
rollback entry
secure boot metadata
```

Provisioning shall verify that the boot configuration points to the verified artifacts and the intended profile.

It shall not claim a successful boot configuration from a file write alone. A boot confirmation is required during post-provisioning validation.

---

## 12. Edge Runtime Installation

The Edge Runtime installation shall be bound to:

```text
HardwareProfile
InstallationProfile
Edge OS contract
Runtime contract
Player contract
```

The Runtime installation shall establish:

- process supervision;
- persisted configuration path;
- local content path;
- identity access;
- telemetry queue path;
- update and recovery hooks;
- startup and health checks.

Provisioning shall not add Campaign, Pricing, Financial, Evidence or Settlement logic to the Runtime.

---

## 13. Identity Configuration

The identity plan shall specify whether the operation:

```text
CREATE
PRESERVE
MIGRATE
REVOKE_AND_REPLACE
```

### 13.1 Create

Create a new `EdgeInstallationId` and `DeviceKey` through the authorized identity contract.

### 13.2 Preserve

Retain an existing identity only after proving that it belongs to the target installation and remains valid for the selected profile.

### 13.3 Migrate

Move identity through an explicit migration contract. Private key material shall not be copied into logs or untrusted storage.

### 13.4 Revoke and replace

Revoked identity material shall not be reused. The operation shall preserve the audit link between the old and new identity.

### 13.5 Identity checkpoint

Provisioning shall not proceed to `NETWORK_CONFIGURED` until identity state and persistence behavior pass the required checkpoint.

---

## 14. Network Configuration

Network configuration shall follow the `NetworkPlan` referenced by the Installation Profile.

It may include:

```text
Ethernet
Wi-Fi
DHCP
static address
DNS
proxy
time synchronization
certificate trust
```

### 14.1 Local-first operation

Network availability is not universally required for the Edge to operate after provisioning. The Installation Profile shall state whether online confirmation is required before completion.

### 14.2 Secret handling

Network credentials shall be stored only through the authorized secure configuration mechanism. They shall not appear in logs or evidence payloads.

### 14.3 Network failure

If network configuration fails but the profile permits offline completion, Provisioning may continue after persisting the failure and the offline state. If online validation is mandatory, it shall pause safely rather than report completion.

---

## 15. Configuration Persistence

Provisioning shall persist the configuration required to reproduce the Edge state.

The persisted configuration shall reference:

```text
HardwareProfile
InstallationProfile
Edge OS
Edge Runtime
Player
identity
network plan
storage layout
recovery plan
OTA contract
provisioning contract
```

Configuration shall be versioned and integrity-protected. Unknown configuration fields shall not be silently deleted during resume or upgrade.

The configuration store shall distinguish:

```text
desired provisioning state
observed provisioning state
last known good state
```

These states shall not be collapsed into a single mutable status.

---

## 16. Transactional Journal

Provisioning shall maintain an append-only journal for every operation.

### 16.1 Journal entry

Each entry shall include:

```text
provisioning_id
entry_id
operation_id
state
step
target
artifact_reference
precondition_result
postcondition_result
checkpoint_reference
attempt_number
observed_at
evidence_reference
entry_hash
```

### 16.2 Journal properties

The journal shall be:

- durable before acknowledging a step;
- append-only;
- correlated to the operation identity;
- protected against unauthorized modification;
- replayable after process or power failure;
- sufficient to determine the last safe checkpoint.

### 16.3 Journal and secrets

The journal shall never contain private keys, network passwords or raw secret material. It may contain opaque references and digests.

### 16.4 Journal corruption

If the journal integrity cannot be verified, Provisioning shall not continue destructively. It shall enter `RECOVERY_REQUIRED` or a safe failure state according to the recovery contract.

---

## 17. Checkpoints

Each irreversible phase shall have an explicit checkpoint.

Minimum checkpoints are:

```text
CP-001 request accepted
CP-002 discovery and profile validated
CP-003 installation profile resolved
CP-004 artifacts staged and verified
CP-005 data policy prepared
CP-006 partition plan verified
CP-007 system writes verified
CP-008 boot configuration verified
CP-009 runtime installed
CP-010 identity configured
CP-011 network/configuration persisted
CP-012 pre-activation validation passed
CP-013 activation started
CP-014 post-provisioning validation passed
```

A checkpoint shall contain preconditions, postconditions and evidence. A later step cannot claim a prior checkpoint by copying its label.

---

## 18. Retry and Resume

### 18.1 Retryable failure

A transient failure may be retried when the journal marks the current step retryable and the target remains at a safe condition.

### 18.2 Same identity

Retry uses the same `provisioning_id` and `parent_installation_operation_id`. A retry cannot select a different profile, plan or artifact set without a new authorization and explicit plan revision.

### 18.3 Resume

Resume starts from the last verified checkpoint. It shall revalidate:

- target identity;
- discovery freshness;
- profile signature and effectiveness;
- installation profile;
- artifact manifest;
- journal integrity;
- target partition state.

### 18.4 Non-idempotent step

If a step cannot prove whether it completed, Provisioning shall not repeat it blindly. It shall verify the target state or enter recovery.

### 18.5 Duplicate request

A duplicate request for the same provisioning identity shall return the current operation state and shall not start an independent write.

---

## 19. Rollback

Rollback is a declared transition, not a destructive improvisation.

Rollback shall use the artifact and mechanism referenced by the Installation Profile and Hardware Profile.

Rollback triggers include:

- artifact verification failure;
- partition verification failure;
- boot configuration failure;
- activation failure;
- post-provisioning validation failure;
- integrity or identity failure;
- explicit safety policy.

Rollback shall:

1. stop forward writes;
2. record the trigger;
3. select the declared last-known-good target;
4. verify rollback artifact and target;
5. execute the rollback mechanism;
6. verify boot and identity;
7. persist the rollback result;
8. enter `ROLLED_BACK` or `RECOVERY_REQUIRED`.

Provisioning shall not mark rollback as completed provisioning.

---

## 20. Recovery

Recovery is invoked when normal provisioning or rollback cannot guarantee a safe operational state.

Recovery shall receive:

```text
provisioning_id
last_safe_checkpoint
target_identity
hardware_profile_reference
installation_profile_reference
journal_reference
recovery_profile_reference
failure_reason
```

The Recovery contract owns the recovery mechanism. Provisioning records the handoff and waits for an explicit recovery result.

A recovery result shall state whether:

```text
LAST_KNOWN_GOOD_RESTORED
RECOVERY_IMAGE_ACTIVATED
MANUAL_INTERVENTION_REQUIRED
RECOVERY_FAILED
```

No recovery result may be inferred from device power-on alone.

---

## 21. Power Loss and Interruption

### 21.1 Before writes

Power instability before writes shall pause or reject the operation without modifying target partitions.

### 21.2 During staging

Power loss during staging shall leave the prior target state intact when possible. Staging artifacts may be discarded after integrity verification.

### 21.3 During partitioning or writing

Power loss during partitioning or writing shall cause the next boot to enter the Installation Profile's recovery or rollback path. Provisioning shall not assume the write completed.

### 21.4 During activation

Power loss during activation shall use the validated boot and recovery mechanism. The system shall not mark activation successful until post-provisioning validation passes.

### 21.5 Recovery after restart

After restart, Provisioning shall read the journal, verify integrity, inspect target state and continue only from an allowed checkpoint. If state is ambiguous, it shall enter `RECOVERY_REQUIRED`.

---

## 22. Installation Methods

### 22.1 Full Provisioning

Full Provisioning uses the current environment to perform the complete plan. It requires no SD/USB media and is available only when the Installation Profile explicitly validates the path.

### 22.2 Assisted Provisioning

Assisted Provisioning prepares the device and requires a controlled user action, such as a reboot or recovery entry. The action, expected state and confirmation are part of the Installation Profile.

### 22.3 External Bootstrap

External Bootstrap uses SD, USB, recovery media or another physical adapter only when the profile requires it.

External media shall carry the signed manifest and artifacts for the exact Hardware Profile. It shall not be a generic universal image.

### 22.4 User experience

The user experience shall remain unified even when the underlying method differs:

```text
User accesses Mostarda
        ↓
Installer starts
        ↓
Discovery
        ↓
Hardware Profile
        ↓
Installation Profile
        ↓
Provisioning
        ↓
Edge operational
```

SD/USB shall not be a universal requirement. A compatible hardware profile may use Full Provisioning when its Installation Profile proves that the path is safe.

---

## 23. Offline Provisioning

Provisioning may execute offline only when the complete authorized plan is locally available.

The local plan shall include:

```text
sealed discovery reference
hardware profile
compatibility result
installation profile
artifact manifest
signed Edge OS artifacts
runtime artifacts
boot/recovery/rollback artifacts
data disposition plan
identity plan
provisioning contract
```

The absence of a network shall not authorize a different plan or an unsigned artifact.

If online authorization is mandatory and unavailable, Provisioning shall stop before irreversible work or pause at the declared checkpoint.

Offline completion shall queue telemetry and evidence locally for later synchronization according to the approved storage contract.

---

## 24. Security and Integrity

Provisioning shall:

- validate signatures for profiles, manifests and artifacts;
- bind all writes to target identity and profile references;
- verify artifact digests before and after writing where possible;
- refuse undeclared partitions and artifacts;
- protect the journal and checkpoint records;
- prevent unauthorized downgrade;
- protect identity keys and network secrets;
- preserve evidence for destructive actions;
- stop on trust-chain, identity or integrity failure.

The existence of a valid signature does not override a profile mismatch or an invalid target partition.

---

## 25. Logs, Evidence and Telemetry

### 25.1 Required dimensions

Every provisioning event shall include:

```text
provisioning_id
parent_installation_operation_id
target_identity
hardware_profile_id
installation_profile_id
state
step
attempt_number
artifact_reference
result
error_code
observed_at
```

### 25.2 Evidence

Evidence shall cover:

- input references;
- profile and artifact validation;
- prechecks;
- data disposition;
- partition observations;
- writes and digests;
- boot configuration;
- identity operation;
- network/configuration persistence;
- checkpoints;
- activation;
- rollback or recovery;
- post-provisioning validation.

### 25.3 No secret leakage

Logs and evidence shall not contain private keys, network passwords or raw secret material. They may contain opaque references, digests and verification outcomes.

### 25.4 Offline telemetry

Telemetry may be persisted locally while offline. A missing network acknowledgement shall not be interpreted as provisioning failure when local completion is authorized and the evidence is durably queued.

---

## 26. Error Catalog

Provisioning errors shall be structured and stable.

```text
PROVISIONING_REQUEST_INCOMPLETE
PROVISIONING_AUTHORIZATION_INVALID
PROVISIONING_STATE_TRANSITION_INVALID
PROVISIONING_DISCOVERY_NOT_SEALED
PROVISIONING_TARGET_IDENTITY_MISMATCH
PROVISIONING_PROFILE_SIGNATURE_INVALID
PROVISIONING_PROFILE_NOT_EFFECTIVE
PROVISIONING_COMPATIBILITY_RESULT_MISSING
PROVISIONING_COMPATIBILITY_REJECTED
PROVISIONING_INSTALLATION_PROFILE_MISSING
PROVISIONING_INSTALLATION_PROFILE_AMBIGUOUS
PROVISIONING_MANIFEST_SIGNATURE_INVALID
PROVISIONING_ARTIFACT_SIGNATURE_INVALID
PROVISIONING_ARTIFACT_DIGEST_MISMATCH
PROVISIONING_ARTIFACT_PROFILE_MISMATCH
PROVISIONING_ARTIFACT_UNAVAILABLE
PROVISIONING_PARTITION_TOPOLOGY_MISMATCH
PROVISIONING_PARTITION_UNDECLARED
PROVISIONING_PARTITION_UNSAFE
PROVISIONING_CAPACITY_INSUFFICIENT
PROVISIONING_DATA_POLICY_MISSING
PROVISIONING_DATA_POLICY_UNSUPPORTED
PROVISIONING_IDENTITY_FAILED
PROVISIONING_NETWORK_REQUIRED
PROVISIONING_WRITE_INTERRUPTED
PROVISIONING_WRITE_VERIFICATION_FAILED
PROVISIONING_BOOT_CONFIGURATION_FAILED
PROVISIONING_RUNTIME_INSTALLATION_FAILED
PROVISIONING_CONFIGURATION_PERSISTENCE_FAILED
PROVISIONING_JOURNAL_INVALID
PROVISIONING_CHECKPOINT_FAILED
PROVISIONING_ACTIVATION_FAILED
PROVISIONING_ROLLBACK_REQUIRED
PROVISIONING_ROLLBACK_FAILED
PROVISIONING_RECOVERY_REQUIRED
PROVISIONING_POST_VALIDATION_FAILED
PROVISIONING_SCHEMA_UNSUPPORTED
PROVISIONING_OPERATION_CONFLICT
```

Each code shall define phase, retryability, recoverability and required operator action in the published error contract.

---

## 27. Versioning and Compatibility

Provisioning shall preserve independent opaque identities for:

```text
provisioning_contract_version
installation_profile_version
hardware_profile_version
artifact_manifest_version
edge_os_version
runtime_version
recovery_contract_version
```

Provisioning shall not order or infer compatibility between versions. The applicable contract or manifest shall declare support.

An unknown provisioning schema, Installation Profile field or journal entry shall cause explicit rejection or safe pause. It shall not be silently ignored.

Updating Provisioning shall not invalidate an existing Edge installation merely because the Provisioning implementation changed. Compatibility with existing journals, profiles and recovery paths shall be declared before the update.

---

## 28. Post-Provisioning Validation

Provisioning may mark `COMPLETED` only when all mandatory checks pass:

```text
Edge OS boots
boot path matches profile
Edge Runtime starts
identity is present and persistent
configuration is readable
network state matches plan or approved offline mode
Local Content Store is available
Player starts in validated environment
required telemetry is emitted or durably queued
recovery marker is consistent
profile and artifact references are persisted
```

The validation result shall include evidence for each check. A device that powers on but cannot present a valid identity, runtime or Player state is not provisioned successfully.

---

## 29. Idempotency Invariants

The following behavior is mandatory:

- the same `provisioning_id` never creates two identities;
- the same checkpoint is not acknowledged twice as two different operations;
- a duplicate write request is detected through the journal and target verification;
- a retry cannot silently change the Hardware Profile, Installation Profile or artifact manifest;
- a new plan requires a new authorization or explicit plan revision;
- rollback is not counted as successful provisioning;
- a completed result is immutable.

---

## 30. Normative Requirements

The following requirements are normative.

### PRV-001

Provisioning shall execute only an explicit, effective Installation Profile.

### PRV-002

Provisioning shall not choose a Hardware Profile or decide compatibility.

### PRV-003

Provisioning shall require a sealed discovery reference, signed Hardware Profile and explicit Compatibility Evaluation Result.

### PRV-004

Provisioning shall require a signed artifact manifest bound to the selected profiles.

### PRV-005

Provisioning shall use an explicit state machine and append-only state history.

### PRV-006

Provisioning shall perform prechecks before destructive operations.

### PRV-007

Provisioning shall write only targets declared by the Installation Profile.

### PRV-008

Unknown partition topology shall block destructive writes.

### PRV-009

Provisioning shall verify artifacts before staging and before activation where supported.

### PRV-010

Provisioning shall preserve, migrate or erase data only according to an explicit policy.

### PRV-011

An absent or ambiguous data policy shall block destructive operations.

### PRV-012

Provisioning shall maintain a durable append-only journal.

### PRV-013

Provisioning shall persist and validate checkpoints for irreversible phases.

### PRV-014

Provisioning shall support idempotent retry and resume with the same operation identity.

### PRV-015

Provisioning shall not repeat an ambiguous non-idempotent step without target verification or recovery.

### PRV-016

Provisioning shall provide a validated rollback or recovery path before irreversible writes.

### PRV-017

Power loss and interruption shall result in resume, rollback or recovery, never an inferred success.

### PRV-018

Provisioning shall create, preserve or migrate identity only through the authorized identity plan.

### PRV-019

MAC address shall not be used as the primary Edge identity.

### PRV-020

Provisioning shall configure Edge Runtime and persist required configuration according to the selected profile.

### PRV-021

Provisioning shall support Full, Assisted and External Bootstrap only when the Installation Profile authorizes the selected method.

### PRV-022

SD/USB shall not be a universal requirement, and external media shall never bypass artifact or profile verification.

### PRV-023

Offline provisioning shall require a complete authorized local plan.

### PRV-024

Provisioning shall emit structured logs, evidence and telemetry correlated by provisioning identity.

### PRV-025

Provisioning shall not expose secret material in logs, evidence or telemetry.

### PRV-026

Provisioning errors shall use stable typed error codes.

### PRV-027

Provisioning shall verify post-provisioning boot, identity, runtime, Player, configuration and telemetry behavior before completion.

### PRV-028

A rollback or recovery result shall not be reported as successful provisioning.

### PRV-029

An unsupported schema, profile, manifest or journal shall cause explicit rejection or safe pause.

### PRV-030

Provisioning shall not introduce Campaign, Pricing, Financial, Evidence or Settlement logic.

---

## 31. Next Specification

The next specification shall define the recovery contract consumed when provisioning or rollback cannot restore a safe state:

`EDGE_RECOVERY.md`

It shall consume:

```text
EDGE_HARDWARE_COMPATIBILITY.md
EDGE_HARDWARE_DISCOVERY.md
EDGE_HARDWARE_PROFILES.md
EDGE_INSTALLER_SPECIFICATION.md
EDGE_PROVISIONING.md
```

It shall define recovery states, recovery triggers, last-known-good restoration, manual intervention boundaries and evidence without moving compatibility or profile ownership into Recovery.
