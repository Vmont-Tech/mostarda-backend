# Mostarda Edge — Installer Specification

**Status:** DRAFT  
**Version:** 1.0.0  
**Owner:** Mostarda Architecture  
**Prerequisites:** `EDGE_HARDWARE_COMPATIBILITY.md`, `EDGE_HARDWARE_DISCOVERY.md`, `EDGE_HARDWARE_PROFILES.md`  
**Related ADR:** ADR-010 — Edge Hardware and Provisioning  
**Scope:** safe installation, profile selection, artifact validation, identity creation and post-installation confirmation

---

## 1. Purpose

This document defines the normative contract for the Mostarda Edge Installer.

The Installer is responsible for executing an already authorized installation path. It shall:

- accept an installation initiated by the user or by an authorized maintenance operation;
- discover the actual hardware before any destructive action;
- match the device to a validated Hardware Profile;
- resolve exactly one authorized Installation Profile;
- validate the selected artifacts, signatures and compatibility;
- preserve or remove data only according to an explicit policy;
- write the Edge installation safely;
- create or preserve Edge identity;
- stop safely when a prerequisite is not satisfied;
- rollback or enter recovery after an interrupted or failed operation;
- confirm the installation after first boot and runtime validation;
- emit process telemetry, logs and diagnostics;
- support idempotent retry and resume without duplicating identity or corrupting state.

The Installer shall never select an image, kernel, DTB, bootloader, recovery artifact or adapter by commercial model name, similarity or guesswork.

---

## 2. Architectural Boundary

The Installer consumes contracts owned by other artifacts and does not replace them.

```text
Hardware Discovery
        ↓
Compatibility Engine
        ↓
Hardware Profile
        ↓
Installation Profile
        ↓
Installer
        ↓
Edge OS / Edge Runtime / Player
```

### 2.1 Installer owns

- installation operation lifecycle;
- safe preflight and target validation;
- deterministic profile and artifact resolution;
- execution of the selected Installation Profile;
- installation journal and idempotency record;
- process telemetry and diagnostic evidence;
- post-installation confirmation;
- safe interruption, rollback request and recovery handoff.

### 2.2 Installer does not own

- hardware fact collection or source provenance;
- compatibility classification;
- Hardware Profile publication;
- Installation Profile definition;
- Edge OS implementation;
- Player behavior;
- OTA lifecycle after installation;
- business rules, Campaign, Pricing, Financial, Evidence or Settlement;
- authorization to reinterpret an unsigned or incompatible artifact.

The Installer executes an Installation Profile. It does not invent one.

---

## 3. Installation Inputs

An installation operation shall declare its inputs before execution.

```text
InstallationRequest
├── operation_id
├── initiation_context
├── target_scope
├── requested_lifecycle_state
├── discovery_scope
├── authorization_reference
├── artifact_manifest_reference
├── data_disposition_policy
├── installation_profile_reference, if preselected
└── installer_version
```

### 3.1 `operation_id`

`operation_id` is an opaque idempotency identity for the installation attempt. Reusing it means retrying or resuming the same logical operation. A different operation identity represents a new request and must pass preflight again.

### 3.2 `initiation_context`

The operation shall identify how it was initiated:

```text
USER_INITIATED
AUTHORIZED_MAINTENANCE
RECOVERY_RETRY
CONTROLLED_LAB
```

Automatic production installation without an explicit authorization reference is prohibited.

### 3.3 `target_scope`

The request shall identify the target installation context and the requested environment. The Installer shall not infer a production target from the presence of a device alone.

### 3.4 `requested_lifecycle_state`

The request shall state whether the requested outcome is:

```text
EXPERIMENTAL
PRODUCTION
MAINTENANCE
RECOVERY
```

The requested state cannot promote a Hardware Profile beyond its published lifecycle state.

### 3.5 `data_disposition_policy`

The request shall carry an explicit policy describing how existing data is handled:

```text
PRESERVE
MIGRATE
ERASE
```

The policy shall identify its authority, version and authorization. An absent or ambiguous policy blocks any operation that could modify existing data.

---

## 4. Installation Outputs

Every terminal installation operation shall produce an immutable `InstallationResult`.

```text
InstallationResult
├── operation_id
├── provisioning_id
├── terminal_state
├── target_identity
├── discovery_reference
├── compatibility_result_reference
├── hardware_profile_reference
├── installation_profile_reference
├── artifact_manifest_reference
├── identity_result
├── data_disposition_result
├── verification_result
├── provisioning_result_reference
├── recovery_result, if applicable
├── diagnostic_references
├── telemetry_summary_reference
└── result_hash
```

The result shall state why the operation succeeded, stopped, was rejected, rolled back or entered recovery.

---

## 5. Installation Lifecycle

An installation operation shall use explicit states:

```text
NOT_STARTED
    ↓
INITIATED
    ↓
DISCOVERING
    ↓
PROFILE_MATCHING
    ↓
INSTALLATION_PROFILE_RESOLVING
    ↓
PRECHECKING
    ├── REJECTED
    └── PREPARED
          ↓
      HANDOFF_PENDING
          ↓
      PROVISIONING_DELEGATED
          ├── COMPLETED
          ├── ROLLBACK_REQUIRED
          ├── RECOVERY_REQUIRED
          └── FAILED
```

An operation may also enter `CANCELLED` before an irreversible write begins.

### 5.1 NOT_STARTED

No installation work has been accepted for the operation identity.

### 5.2 INITIATED

The request identity, initiation context and authorization reference were accepted for processing.

### 5.3 DISCOVERING

The Installer is collecting a sealed `HardwareDiscoveryRecord`. No installation write is permitted.

### 5.4 PROFILE_MATCHING

The sealed discovery record is compared with available Hardware Profiles. The Installer shall require an exact mandatory fingerprint and capability match.

### 5.5 INSTALLATION_PROFILE_RESOLVING

The Installer resolves exactly one Installation Profile explicitly associated with the matched Hardware Profile and requested scope.

### 5.6 PRECHECKING

All safety, authorization, capacity, artifact, identity and data-disposition checks are executed before any destructive operation.

### 5.7 PREPARED

Preflight passed and the operation has a durable journal. The Installer may proceed only with the exact resolved plan.

### 5.8 HANDOFF_PENDING

The Installer has completed preflight and is sealing the immutable `ProvisioningRequest`. No target write is permitted in this state. The request must contain the parent `operation_id`, a new `provisioning_id`, the sealed discovery record, compatibility result, Hardware Profile, Installation Profile, artifact manifest, data disposition, identity/network plans, authorization and recovery references.

### 5.9 PROVISIONING_DELEGATED

Provisioning has accepted the exact request and now owns preservation, staging, partitioning, writing, boot configuration, identity configuration, activation and post-provisioning validation. The Installer only observes the child `ProvisioningResult`, forwards cancellation or recovery requests allowed by that result, and does not execute or reinterpret those steps.

The states `PRESERVING_DATA`, `STAGING_ARTIFACTS`, `WRITING`, `VERIFYING`, `ACTIVATING` and `CONFIRMING` belong exclusively to the Provisioning state machine. They are not Installer states.

### 5.10 COMPLETED

All required post-installation checks passed and the result was sealed.

### 5.11 ROLLBACK_REQUIRED

The current attempt cannot be activated safely and a validated rollback path is available.

### 5.12 RECOVERY_REQUIRED

The normal rollback path did not complete or the Installation Profile requires a recovery path. The Installer shall stop normal activation and hand off to the authorized Recovery contract.

### 5.13 FAILED

The operation ended without a valid installation and without a completed rollback or recovery result. The failure reason and target state shall be explicit.

### 5.14 CANCELLED

The operation was cancelled before an irreversible write or at a cancellation point defined by the Installation Profile. Cancellation shall not be reported as success.

## 5.15 Formal handoff to Provisioning

The handoff is the single boundary between Installer and Provisioning:

```text
Installer PREPARED
        ↓ seal ProvisioningRequest
Installer HANDOFF_PENDING
        ↓ Provisioning accepts the same request
Provisioning ACCEPTED
        ↓
Installer PROVISIONING_DELEGATED
```

The Installer creates exactly one `provisioning_id` for an accepted handoff and records it together with `operation_id`. Provisioning is the only component allowed to mutate the target after `ACCEPTED`. The Installer may retry delivery with the same identities, but it shall not create a second child operation or repeat a target write.

The child result is authoritative for the delegated work:

| Provisioning terminal result | Installer result |
| --- | --- |
| `COMPLETED` | `COMPLETED` after Installer post-confirmation and result sealing |
| `ROLLED_BACK` | `ROLLBACK_REQUIRED` or `FAILED`, never success without explicit post-rollback confirmation |
| `RECOVERY_REQUIRED` | `RECOVERY_REQUIRED` and Recovery handoff |
| `FAILED` | `FAILED` unless an authorized rollback/recovery path is entered |
| `CANCELLED` / `PAUSED` | Installer remains non-terminal or records cancellation according to the child result; no success is implied |

Provisioning shall return the immutable `ProvisioningResult`, including its state history, checkpoint references, identity result, artifact verification and recovery/rollback references. The Installer does not duplicate that state machine.

---

## 6. User-Initiated Installation

The Installer shall support an installation initiated by the user through an authorized interface. The interface may be a bootstrap application, desktop tool, recovery environment or another approved entry point.

The entry point shall:

- identify the target operation;
- display the requested data-disposition policy;
- obtain required authorization;
- present the detected hardware facts and compatibility result;
- show the selected Hardware Profile and Installation Profile;
- require explicit confirmation before irreversible work;
- provide a recoverable diagnostic reference if the operation stops.

The user interface shall not offer an arbitrary image picker as a substitute for profile resolution.

User confirmation cannot override `UNKNOWN`, `UNSUPPORTED`, `BLOCKED`, invalid signatures, identity conflicts or missing mandatory evidence.

---

## 7. Discovery and Profile Selection

The Installer shall execute the following order:

```text
1. accept operation identity
2. perform Hardware Discovery
3. require SEALED discovery record
4. match exact Hardware Profile
5. evaluate current compatibility
6. resolve one Installation Profile
7. validate artifact manifest
8. execute preflight
```

The Installer shall not:

- skip discovery because a device name is known;
- reuse a stale discovery record without the freshness requirements of the consumer contract;
- choose the nearest Hardware Profile;
- choose a profile by SoC family alone;
- choose an Installation Profile by commercial name;
- continue after a mandatory identity conflict;
- treat a high confidence observation as authorization.

### 7.1 Exact profile match

A Hardware Profile matches only when:

- the profile signature is valid;
- the profile is effective for the scope;
- the discovery record is sealed;
- mandatory fingerprint fields match;
- mandatory capability constraints match;
- no blocking incompatibility applies;
- the profile lifecycle permits the requested operation.

### 7.2 Compatibility result

The Installer shall require an explicit Compatibility Evaluation Result. Discovery facts alone do not authorize installation.

### 7.3 Exactly one Installation Profile

For a production operation, exactly one effective Installation Profile shall match the Hardware Profile, requested scope and requested lifecycle state.

If zero or more than one profile matches, the Installer shall reject the operation with an explicit resolution error. It shall not choose one arbitrarily.

---

## 8. Hardware Lifecycle Handling

### 8.1 UNKNOWN

```text
NO INSTALLATION
NO PARTITION WRITE
NO IMAGE SELECTION
```

The Installer shall stop after discovery and emit the diagnostic reason.

### 8.2 UNSUPPORTED

The Installer shall reject the operation without destructive changes.

### 8.3 BLOCKED

The Installer shall reject the operation even if an older profile revision was previously valid.

### 8.4 EXPERIMENTAL

Experimental installation requires an explicit controlled-lab or pilot authorization. It shall not be treated as production installation and shall display its limitations in the result.

### 8.5 PRODUCTION

Production installation may proceed only with a signed, effective Hardware Profile, Compatibility Evaluation Result and Installation Profile.

### 8.6 PREFERRED

Preferred hardware follows the same safety requirements as Production. Preferred status does not bypass any gate.

### 8.7 DEPRECATED

Deprecated profiles shall not be selected for new installations. A maintenance or recovery operation may proceed only when an explicit policy authorizes that scope.

---

## 9. Installation Classes

The Installation Profile declares one supported installation class.

### 9.1 Full Provisioning

Full Provisioning completes the installation using the current environment and the target's validated capabilities, without external physical media.

It is allowed only when the Hardware Profile and Installation Profile explicitly prove that the path is safe and recoverable.

### 9.2 Assisted Provisioning

Assisted Provisioning uses the existing environment to prepare a controlled transition, after which the user performs an explicit reboot or recovery action.

The existing environment is not the final Mostarda Edge OS unless a separate profile explicitly declares it as the validated target.

### 9.3 External Bootstrap

External Bootstrap uses SD, USB, recovery media or another physical mechanism declared by the Installation Profile.

External media is a fallback path, not permission to use a generic image. The media, artifact, target and recovery behavior must still be signed and profile-compatible.

### 9.4 Android bootstrap

Android may host a bootstrap adapter when the Hardware Profile and Installation Profile authorize that path.

Android shall not be treated as the production Edge OS. Android permission to execute an application does not imply permission to rewrite bootloader, kernel, recovery, device-tree, eMMC or system partitions.

---

## 10. Pre-Installation Validation

No destructive write may begin until all mandatory prechecks pass.

### 10.1 Authorization

Validate:

- operation identity;
- initiation context;
- requested lifecycle state;
- authorization reference;
- target scope;
- Installer version compatibility.

### 10.2 Discovery

Validate:

- sealed discovery record;
- target identity binding;
- mandatory fact completeness;
- absence of blocking conflicts;
- freshness;
- record integrity.

### 10.3 Profile

Validate:

- Hardware Profile signature;
- lifecycle state;
- effective period;
- fingerprint match;
- compatibility result;
- known incompatibilities;
- explicit Installation Profile association.

### 10.4 Artifact

Validate:

- artifact manifest signature;
- artifact digest;
- artifact schema and version;
- target Hardware Profile;
- target Installation Profile;
- Edge OS and Runtime contracts;
- rollback or recovery artifacts;
- required boot and partition declarations.

### 10.5 Capacity

Validate:

- usable storage;
- reserved storage;
- target partition capacity;
- temporary staging capacity;
- power and thermal preconditions when observable;
- required network or external media availability.

### 10.6 Data disposition

Validate that the requested `PRESERVE`, `MIGRATE` or `ERASE` policy is explicit, authorized and supported by the Installation Profile. If preservation cannot be proven, the Installer shall stop rather than silently erase.

### 10.7 Identity

Validate whether an existing Edge identity is to be preserved, migrated or created. The policy shall prevent accidental duplication or reuse of a revoked identity.

### 10.8 Recovery

Validate that a recovery or rollback path is available before starting a write that could make the target unbootable.

---

## 11. Artifact Selection and Integrity

### 11.1 Manifest authority

The Installation Profile shall reference an update or installation manifest that declares the exact artifacts for the selected Hardware Profile.

The Installer shall never construct an artifact list from a commercial name, guessed SoC or filename pattern.

### 11.2 Manifest contents

The manifest shall identify, where applicable:

```text
hardware_profile_id
hardware_profile_version
installation_profile_id
installation_profile_version
edge_os_artifact
edge_runtime_artifact
player_artifact
boot_artifact
kernel_artifact
device_tree_artifact
recovery_artifact
rollback_artifact
partition_plan_reference
manifest_version
```

### 11.3 Signature and digest

Every artifact used for installation shall have:

```text
artifact_identity
artifact_version
digest
signature
signing_key_id
compatibility_scope
```

The Installer shall verify the signature and digest before staging and again before activation when the platform permits.

### 11.4 Unknown or incompatible artifact

An unknown, unsigned, expired, revoked or incompatible artifact shall be rejected. It shall not be treated as a warning.

### 11.5 Local and external media

Artifacts may be acquired from the network, local storage or external media only when the source is authorized by the manifest and the same integrity checks pass.

---

## 12. Data Preservation and Removal

The Installer shall execute only the declared data-disposition policy.

### 12.1 PRESERVE

Existing data, identity, configuration and authorized local content remain in place when the Installation Profile declares them compatible with the target installation.

Preservation shall be verified after installation.

### 12.2 MIGRATE

Data is copied or transformed according to a versioned migration contract. The original shall not be deleted until migration verification succeeds and the policy authorizes removal.

### 12.3 ERASE

Data is removed only from the explicit target locations declared by the policy and Installation Profile. The Installer shall record what was selected for removal and what was preserved.

### 12.4 Ambiguous policy

If the policy is absent, contradictory or unsupported, the Installer shall stop before destructive writes.

### 12.5 Secrets and credentials

Private keys and secret material shall never be copied into logs or diagnostic output. Identity migration shall use the authorized key-management contract.

---

## 13. Safe Write Protocol

The Installer shall treat installation as a staged, verifiable operation. The Installer validates and seals the plan; Provisioning executes the target writes and owns the write journal.

```text
PREPARE
   ↓
STAGE
   ↓
VERIFY STAGED ARTIFACTS
   ↓
WRITE DECLARED TARGETS
   ↓
VERIFY WRITTEN CONTENT
   ↓
ACTIVATE
   ↓
CONFIRM
```

The exact partition and boot mechanism belongs to the Installation Profile, but the safety properties are mandatory.

Before handoff, the Installer shall:

- maintain a durable operation journal;
- record each target write before and after execution;
- refuse undeclared targets;
- verify artifacts before write;
- verify writes before activation;
- preserve a validated rollback or recovery path;
- make activation explicit;
- survive process restart without losing the operation identity.

After `Provisioning ACCEPTED`, these write, checkpoint, activation and rollback obligations are executed only by Provisioning under `provisioning_id`. Installer observations reference the child journal and do not create a competing write history.

The Installer shall not write unknown partitions, generic DTB files, guessed kernels or unlisted boot locations.

---

## 14. Interruption and Cancellation

### 14.1 Before irreversible write

The user or authorized controller may cancel before the Installation Profile reaches its irreversible write point. The Installer shall leave the target in its prior operational state where possible.

### 14.2 During staging

Cancellation during staging shall discard only staged artifacts and preserve the target installation.

### 14.3 During write

Cancellation during a non-atomic write is not equivalent to success. The Installer shall complete the declared safe recovery action or enter `RECOVERY_REQUIRED`.

### 14.4 Power loss

After power loss, the Installer shall resume or recover using the operation journal and the Installation Profile's validated mechanism. It shall not start a new operation identity implicitly.

### 14.5 Network loss

Network loss may be tolerated only when all required artifacts and authorization are already available locally and the Installation Profile permits offline continuation. Otherwise, the Installer shall pause at a safe boundary.

---

## 15. Rollback and Recovery

### 15.1 Rollback trigger

Rollback shall be requested when:

- artifact verification fails after staging or write;
- activation fails;
- post-installation confirmation fails;
- the Installation Profile's health gate fails;
- an explicit safety condition is detected.

### 15.2 Rollback boundary

Rollback shall use only the validated rollback artifact or mechanism referenced by the Installation Profile and Hardware Profile.

The Installer shall not invent a rollback by copying arbitrary files or selecting a prior commercial image.

### 15.3 Recovery handoff

If rollback cannot safely restore the last known-good state, the Installer shall enter `RECOVERY_REQUIRED` and invoke the authorized Recovery contract.

### 15.4 Identity preservation

Rollback and recovery shall preserve identity and configuration according to the data-disposition and identity policies. A failed installation shall not silently create a second identity.

### 15.5 Result semantics

An installation that required rollback is not `COMPLETED` unless post-rollback confirmation explicitly succeeds. An installation that only entered recovery is not successful.

---

## 16. Identity Creation and Preservation

The production identity model is:

```text
EdgeInstallationId
DeviceKey
HardwareProfile
InstallationProfile
```

### 16.1 Existing identity

If the target already has a valid identity, the Installer shall preserve or migrate it only according to the declared policy. It shall verify the identity after activation.

### 16.2 New identity

When no valid identity exists, the Installer shall create one using the authorized identity contract and bind it to the matched Hardware Profile and Installation Profile.

### 16.3 Duplicate identity

If the target identity is already bound to another active installation or the key cannot be proven, the Installer shall stop. It shall not clone or guess an identity.

### 16.4 MAC address

MAC address may be recorded as a network fact but shall never be the primary identity or a fallback identity generator.

### 16.5 Key failure

If required key creation, persistence or attestation fails, the Installer shall reject the requested lifecycle state rather than creating an unauditable identity.

---

## 17. Post-Installation Confirmation

The Installer shall not report success at the moment the image is written. It shall complete post-installation confirmation.

Required checks include, where applicable:

- expected boot path;
- EdgeInstallationId presentation;
- DeviceKey availability;
- Hardware Profile match;
- Edge OS integrity;
- Edge Runtime startup;
- Player availability;
- validated display initialization;
- local content access;
- configuration preservation or migration;
- telemetry publication;
- recovery marker cleared;
- artifact and profile references persisted.

The confirmation result shall reference each check and its evidence.

If a check fails, the operation shall enter rollback, recovery or failed according to the authorized profile. It shall not report partial success as completed.

---

## 18. Idempotency and Resume

### 18.1 Same operation identity

Retrying an operation with the same `operation_id` shall resume or replay the same logical operation. It shall not create a second identity, select a different profile or apply a different artifact plan silently.

### 18.2 New operation identity

A new operation identity requires a new authorization and complete preflight unless the policy explicitly permits reuse of an immutable prior plan.

### 18.3 Durable journal

The journal shall record:

```text
operation_id
state
state_revision
profile_references
artifact_manifest_reference
data_disposition_policy
identity_plan
completed_steps
pending_step
failure_reason
last_safe_point
```

### 18.4 Duplicate commands

Duplicate start, stage, write, activate or confirm requests with the same operation identity shall return the existing operation state rather than execute an uncontrolled duplicate action.

### 18.5 Stale plan

If the profile, manifest, authorization or target discovery record is no longer effective, resume shall stop and require explicit re-evaluation. The Installer shall not silently switch to a newer plan.

---

## 19. Telemetry, Logs and Diagnostics

The Installer shall produce technical process telemetry and diagnostic evidence.

### 19.1 Required telemetry dimensions

```text
operation_id
target_identity
discovery_id
hardware_profile_id
installation_profile_id
installer_version
state
step
artifact_reference
duration
result
error_code
recovery_state
```

### 19.2 Logs

Logs shall be structured, timestamped and correlated by `operation_id`. They shall preserve causation between steps without exposing private keys or secrets.

### 19.3 Evidence

The Installer shall preserve evidence for:

- discovery input;
- profile selection;
- manifest validation;
- data-disposition result;
- target writes;
- verification;
- activation;
- identity creation or preservation;
- post-installation confirmation;
- rollback or recovery.

### 19.4 Offline telemetry

When the target is offline, process telemetry shall be queued locally according to the approved local storage policy and transmitted after reconnection. The Installer shall not block a safe local completion solely because reporting is temporarily unavailable, unless the authorization contract explicitly requires online confirmation.

---

## 20. Error Catalog

Errors shall be deterministic, structured and actionable.

The conceptual envelope is:

```text
InstallerError
├── code
├── phase
├── retryable
├── recoverable
├── operation_id
├── cause_reference
├── affected_target
└── diagnostic_reference
```

The minimum catalog is:

```text
INSTALLATION_AUTHORIZATION_MISSING
INSTALLATION_OPERATION_CONFLICT
DISCOVERY_NOT_SEALED
DISCOVERY_IDENTITY_UNBOUND
DISCOVERY_REQUIRED_FACT_MISSING
DISCOVERY_CONFLICTED
HARDWARE_PROFILE_NOT_FOUND
HARDWARE_PROFILE_SIGNATURE_INVALID
HARDWARE_PROFILE_NOT_EFFECTIVE
HARDWARE_PROFILE_LIFECYCLE_REJECTED
COMPATIBILITY_RESULT_MISSING
COMPATIBILITY_REJECTED
INSTALLATION_PROFILE_NOT_FOUND
INSTALLATION_PROFILE_AMBIGUOUS
INSTALLATION_PROFILE_NOT_EFFECTIVE
ARTIFACT_MANIFEST_MISSING
ARTIFACT_SIGNATURE_INVALID
ARTIFACT_DIGEST_MISMATCH
ARTIFACT_PROFILE_MISMATCH
ARTIFACT_VERSION_UNSUPPORTED
DATA_DISPOSITION_MISSING
DATA_DISPOSITION_UNSUPPORTED
CAPACITY_INSUFFICIENT
TARGET_PARTITION_UNDECLARED
TARGET_PARTITION_UNSAFE
WRITE_INTERRUPTED
WRITE_VERIFICATION_FAILED
ACTIVATION_FAILED
IDENTITY_CREATION_FAILED
IDENTITY_CONFLICT
POST_INSTALLATION_CHECK_FAILED
ROLLBACK_FAILED
RECOVERY_REQUIRED
INSTALLER_VERSION_UNSUPPORTED
SCHEMA_UNSUPPORTED
```

An error code shall not be repurposed to represent a different condition. The exact retryable and recoverable attributes shall be defined by the Installer contract version.

---

## 21. Security Requirements

The Installer shall:

- verify signatures before using profiles, manifests or artifacts;
- bind the operation to the target identity;
- refuse unsigned or unknown artifacts;
- refuse undeclared writes;
- avoid logging secrets and private keys;
- protect the operation journal from unauthorized modification;
- prevent downgrade unless an explicit authorized recovery policy permits it;
- preserve audit references for every destructive action;
- stop on trust-chain or identity failure.

An Installer update shall not weaken these requirements through a compatibility fallback.

---

## 22. Installer Versioning and Existing Installations

### 22.1 Installer contract version

The Installer shall publish its own opaque contract version. A new Installer version shall declare which Hardware Profile, Installation Profile and manifest versions it supports.

### 22.2 Existing installations

Updating the Installer shall not invalidate an existing installation merely because the Installer version changed. Existing installations remain governed by their persisted profile, identity, Edge OS and runtime contracts.

### 22.3 Compatibility check

Before replacing or upgrading the Installer, the operation shall verify that:

- the target profile remains supported;
- the current identity is readable;
- the recovery path is available;
- the new Installer can interpret the persisted journal and profile references;
- rollback or recovery is available.

### 22.4 Unknown persisted data

If a newer Installer encounters a journal or profile field it cannot interpret, it shall stop safely and report `SCHEMA_UNSUPPORTED`. It shall not silently discard the field or continue destructively.

### 22.5 Backward compatibility

Compatibility with older installations shall be declared by the Installer contract. Absence of an explicit compatibility entry shall reject the operation by default.

---

## 23. Offline Installation

An offline installation is permitted only when the complete authorized plan is locally available.

The local plan shall include:

```text
sealed discovery or permitted discovery procedure
hardware profile
compatibility result
installation profile
artifact manifest
signed artifacts
data disposition policy
identity authorization
recovery or rollback artifacts
```

If an online authority is required by the authorization contract and is unavailable, the Installer shall stop before destructive work. It shall not treat an offline cache as current merely because it exists.

---

## 24. Installation Completion Contract

An operation may be marked `COMPLETED` only when all of the following are true:

```text
discovery sealed
profile matched
compatibility authorized
installation profile uniquely resolved
artifacts verified
data policy completed
writes verified
activation succeeded
identity confirmed
runtime confirmed
player confirmed
required telemetry emitted or durably queued
result sealed
```

No individual successful step may be reported as overall installation success.

---

## 25. Normative Requirements

The following requirements are normative.

### INS-001

The Installer shall perform Hardware Discovery before any destructive operation.

### INS-002

Only a sealed discovery record may be used for final profile matching.

### INS-003

The Installer shall require an exact Hardware Profile match and shall not use a commercial name as a fallback.

### INS-004

The Installer shall require exactly one effective Installation Profile for the target scope.

### INS-005

The Installer shall require an explicit Compatibility Evaluation Result.

### INS-006

The Installer shall reject `UNKNOWN`, `UNSUPPORTED` and `BLOCKED` hardware without destructive writes.

### INS-007

Experimental installation shall require explicit controlled authorization.

### INS-008

Android may be a bootstrap environment but shall not be treated as the production Edge OS.

### INS-009

SD/USB or other external media shall be used only when explicitly authorized by the Installation Profile.

### INS-010

The Installer shall never select an arbitrary image, kernel, DTB, bootloader or recovery artifact.

### INS-011

All artifacts shall pass manifest, signature, digest and profile compatibility checks before use.

### INS-012

Data preservation, migration or erasure shall follow an explicit versioned policy.

### INS-013

An absent or ambiguous data-disposition policy shall block destructive writes.

### INS-014

The Installer shall maintain a durable operation journal.

### INS-015

The Installer shall use an opaque operation identity for idempotency and resume.

### INS-016

Duplicate requests with the same operation identity shall not execute uncontrolled duplicate writes or identity creation.

### INS-017

The Installer shall verify written artifacts before activation.

### INS-018

The Installer shall have a validated rollback or recovery path before irreversible writes.

### INS-019

An interrupted or failed activation shall not be reported as completed.

### INS-020

Rollback and recovery shall preserve identity and configuration according to explicit policy.

### INS-021

The Installer shall create or preserve `EdgeInstallationId` and `DeviceKey` through the authorized identity contract.

### INS-022

MAC address shall not be the primary Edge identity.

### INS-023

Post-installation confirmation shall verify boot, identity, runtime, Player and required telemetry state.

### INS-024

Installer telemetry and diagnostics shall be correlated by operation identity and shall not expose secrets.

### INS-025

Installer failures shall use explicit, stable error codes.

### INS-026

The Installer shall stop safely when it cannot interpret a required schema, profile, manifest or journal.

### INS-027

Installer updates shall declare compatibility with existing installations and shall not silently invalidate them.

### INS-028

An offline installation shall proceed only when the complete authorized plan is locally available or the authorization contract explicitly permits offline operation.

### INS-029

The Installer shall not modify documents, domain records or business aggregates as a side effect of installation.

### INS-030

Only a sealed `InstallationResult` with all required confirmation checks may report installation completion.

---

## 26. Next Specification

The next specification shall define the broader provisioning orchestration around the Installer:

`EDGE_PROVISIONING.md`

It shall consume:

```text
EDGE_HARDWARE_COMPATIBILITY.md
EDGE_HARDWARE_DISCOVERY.md
EDGE_HARDWARE_PROFILES.md
EDGE_INSTALLER_SPECIFICATION.md
```

It shall define device onboarding, provisioning orchestration, ownership boundaries and interaction with EdgeInstallation, Device Registry, TV Network and operational actors without moving installation safety rules out of this Installer contract.
