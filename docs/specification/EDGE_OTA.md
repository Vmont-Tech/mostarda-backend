# Mostarda Edge — OTA Specification

**Status:** DRAFT
**Version:** 1.0.0
**Owner:** Mostarda Architecture
**Prerequisites:** `EDGE_HARDWARE_COMPATIBILITY.md`, `EDGE_HARDWARE_DISCOVERY.md`, `EDGE_HARDWARE_PROFILES.md`, `EDGE_INSTALLER_SPECIFICATION.md`, `EDGE_PROVISIONING.md`, `EDGE_RECOVERY.md`, `EDGE_OS_SPECIFICATION.md`
**Related ADR:** ADR-010 — Edge Hardware and Provisioning
**Scope:** authorized update resolution, verification, activation, health confirmation, rollback and recovery

---

## 1. Purpose

This document defines the normative contract for Mostarda Edge OTA.

OTA is the controlled process that changes an installed Edge state while preserving identity, integrity, configuration and recoverability.

It defines:

- Update Manifest authority;
- target resolution and compatibility binding;
- Hardware Profile and Installation Profile constraints;
- Edge OS, Runtime, Player, Web Engine, boot, recovery and security compatibility;
- artifact verification and staging;
- preflight and activation;
- health confirmation and Last Known Good state;
- A/B and non-A/B update behavior;
- rollback and Recovery handoff;
- offline update;
- interruption and power-loss behavior;
- anti-downgrade and key lifecycle;
- revocation;
- retry, resume and idempotency;
- Local Content Store protection;
- telemetry and immutable `UpdateResult`.

OTA shall never choose an update only by comparing version numbers.

---

## 2. Architectural Boundary

The authoritative update flow is:

```text
Device
   ↓
Hardware Profile
   ↓
Compatibility Evaluation
   ↓
Update Manifest
   ↓
Exact Artifact Set
   ↓
Staging / Activation / Confirmation
```

OTA consumes previously authorized contracts. It does not:

- choose a Hardware Profile;
- decide compatibility from a commercial model name;
- select an artifact by SoC alone;
- invent a manifest;
- modify device identity without an explicit identity migration/reset operation;
- erase Local Content Store as an implicit update side effect;
- change Campaign, Pricing, Financial, Evidence or Settlement behavior.

The manifest is the authority of the update package. A version value is only one input to manifest resolution and never the sole selection criterion.

---

## 3. Update Request

Every OTA operation shall begin with an immutable `UpdateRequest`.

```text
UpdateRequest
├── update_id
├── device_identity
├── target_scope
├── requested_target
├── current_state_reference
├── compatibility_context
├── authorization_reference
├── source_reference
├── offline_mode
├── identity_operation
├── content_policy
├── ota_contract_version
└── requester
```

### 3.1 `update_id`

`update_id` is the idempotency identity of the logical update operation. A retry or resume uses the same identity. A different update identity requires a new resolution and preflight.

### 3.2 `device_identity`

The request shall identify the target through `EdgeInstallationId` and `DeviceKey` references. MAC address is not a primary update identity.

### 3.3 `requested_target`

The request may contain a target version or release reference, but the target is not valid until an applicable signed Update Manifest resolves the exact artifact set and compatibility context.

### 3.4 `identity_operation`

The default is:

```text
PRESERVE_IDENTITY
```

Identity migration or reset requires an explicit authorized operation. OTA shall reject an artifact or plan that changes identity implicitly.

### 3.5 `content_policy`

The request shall declare how Local Content Store is treated:

```text
PRESERVE
REVALIDATE
MIGRATE
REBUILD_INDEX
ERASE_BY_EXPLICIT_AUTHORIZATION
```

The default update behavior is `PRESERVE`.

---

## 4. Update Manifest

The Update Manifest is the authoritative contract for a specific update package.

It shall be signed, versioned, immutable and bound to the exact target context.

### 4.1 Manifest schema

```text
UpdateManifest
├── manifest_id
├── manifest_version
├── publication_time
├── effective_period
├── source_constraints
├── target_constraints
├── hardware_profile_constraints
├── installation_profile_constraints
├── edge_os_contract
├── runtime_contract
├── player_contract
├── web_engine_contract
├── boot_contract
├── recovery_contract
├── security_policy
├── artifact_set
├── content_policy
├── rollback_policy
├── anti_downgrade_policy
├── key_policy
├── health_plan
├── signature
└── manifest_hash
```

### 4.2 Manifest authority

The OTA implementation shall not modify the manifest after signature validation. A changed manifest is a different manifest and must be resolved and verified again.

### 4.3 Exact artifact set

The manifest shall declare every artifact required by the update:

```text
EDGE_OS_ARTIFACT
RUNTIME_ARTIFACT
PLAYER_ARTIFACT
WEB_ENGINE_ARTIFACT, if applicable
BOOT_ARTIFACT, if applicable
KERNEL_ARTIFACT, if applicable
DEVICE_TREE_ARTIFACT, if applicable
RECOVERY_ARTIFACT
ROLLBACK_ARTIFACT
CONFIGURATION_MIGRATION_ARTIFACT, if applicable
CONTENT_SCHEMA_ARTIFACT, if applicable
```

Missing artifacts shall cause explicit rejection. OTA shall not infer a missing artifact from a filename, a prior version or a similar hardware profile.

---

## 5. Target Resolution

OTA shall resolve the target in this order:

```text
Update Request
      ↓
Target Identity
      ↓
Current Hardware Profile
      ↓
Current Installation Profile
      ↓
Compatibility Evaluation
      ↓
Applicable Update Manifest
      ↓
Exact Artifact Set
```

### 5.1 Target identity verification

The current `EdgeInstallationId`, `DeviceKey` reference and Hardware Profile identity shall be verified before update resolution.

### 5.2 Current state verification

OTA shall inspect the current Edge OS, Runtime, Player, Web Engine, boot, recovery and security contract references.

### 5.3 Profile binding

The manifest must explicitly accept the target `HardwareProfile` and `HardwareProfileVersion` or an explicitly declared compatible profile set. A commercial model, SoC family or RAM value alone is insufficient.

### 5.4 Installation Profile binding

The manifest must explicitly accept the current `InstallationProfile` and version, or declare an authorized migration path. The update shall not switch installation method silently.

### 5.5 Compatibility result

An explicit Compatibility Evaluation Result is required. If the result is missing, stale, conflicted, unsupported or rejected, OTA shall not proceed.

### 5.6 Hardware lifecycle

`UNKNOWN`, `UNSUPPORTED` and `BLOCKED` hardware shall not receive automatic OTA.

`EXPERIMENTAL` hardware requires explicit controlled authorization. `PRODUCTION` and `PREFERRED` profiles may proceed only when all update gates pass.

---

## 6. Compatibility Dimensions

The update decision shall consider, at minimum:

```text
Hardware Profile
Installation Profile
Edge OS contract
Edge Runtime contract
Player contract
Web Engine contract
codec and VPU contract
boot contract
recovery contract
security policy
identity policy
storage and partition contract
```

An update is applicable only when all mandatory dimensions are compatible.

An update shall be rejected if any mandatory dimension is unknown, revoked, expired, unsupported or mismatched.

---

## 7. Artifact Model

Each artifact shall contain or reference:

```text
artifact_id
artifact_version
artifact_kind
target_profile
target_scope
source_contract
size
digest
signature
signing_key_id
compatibility_constraints
revocation_status
```

### 7.1 System artifacts

System artifacts change the Edge OS or boot environment. They require boot, partition, recovery and rollback validation.

### 7.2 Runtime artifacts

Runtime artifacts change Edge Runtime services. They require service, identity, configuration, health and compatibility validation.

### 7.3 Player and Web Engine artifacts

Player or Web Engine artifacts require the active Hardware Profile's rendering, codec, storage, memory and thermal contracts.

### 7.4 Content artifacts

Content artifacts are governed by a separate content policy. A system or Runtime update shall not erase or rewrite Local Content Store content unless the manifest explicitly declares a compatible migration or an explicitly authorized erase.

### 7.5 Configuration artifacts

Configuration migrations shall identify source and target schema, migration behavior, rollback behavior and preservation rules.

---

## 8. Key Lifecycle

OTA trust keys shall have an explicit lifecycle:

```text
ACTIVE
ROTATED
REVOKED
EXPIRED
```

### 8.1 ACTIVE

The key may sign artifacts or manifests within its declared scope.

### 8.2 ROTATED

The key is replaced for new signatures but may remain valid for historical verification during its declared verification period.

### 8.3 REVOKED

The key shall not validate new updates. Historical evidence may retain the prior signature and revocation reference.

### 8.4 EXPIRED

The key is outside its signing validity period. Verification behavior follows the manifest's signed historical policy; it shall not be treated as currently authorized for new activation.

### 8.5 Key rotation update

A key-rotation manifest shall be signed by a currently trusted key and shall declare the new trust anchor, scope, activation point and rollback behavior.

OTA shall not replace the only trust anchor without a validated recovery path.

---

## 9. Signature, Digest and Revocation Verification

OTA shall verify, in order:

```text
manifest discovery
      ↓
manifest signature
      ↓
manifest validity and scope
      ↓
key lifecycle
      ↓
artifact signature
      ↓
artifact digest
      ↓
profile and contract compatibility
      ↓
revocation status
```

Failure of any mandatory step blocks staging or activation.

Revocation may apply to:

```text
manifest
artifact
signing key
Hardware Profile
Installation Profile
security policy
```

OTA shall record the exact revocation information used during the decision.

---

## 10. OTA State Machine

OTA shall use one normative process state machine:

```text
NOT_STARTED
      ↓
TARGET_RESOLVING
      ↓
COMPATIBILITY_VALIDATING
      ↓
MANIFEST_RESOLVING
      ↓
SIGNATURE_VALIDATING
      ↓
PREFLIGHT
      ↓
STAGING
      ↓
STAGED
      ↓
VERIFIED
      ↓
ACTIVATED
      ↓
BOOTED
      ↓
RUNTIME_HEALTHY
      ↓
PLAYER_HEALTHY
      ↓
CONFIRMED
      ↓
MARKED_GOOD
```

The process may enter wait or failure states at explicit safe boundaries:

```text
PAUSED
WAITING_FOR_DEPENDENCY
FAILED
ROLLBACK_REQUIRED
ROLLING_BACK
RECOVERY_REQUIRED
BLOCKED
CANCELLED
```

### 10.1 Terminal states

```text
MARKED_GOOD
ROLLED_BACK
RECOVERY_REQUIRED
FAILED
BLOCKED
CANCELLED
```

`CONFIRMED` is not terminal until the Last Known Good marker is persisted and verified as `MARKED_GOOD`.

### 10.2 State transition rules

- A state transition shall be journaled before it is acknowledged.
- A failed activation shall enter `ROLLBACK_REQUIRED` or `RECOVERY_REQUIRED`, never `MARKED_GOOD`.
- `ROLLING_BACK` shall terminate as `ROLLED_BACK`, `RECOVERY_REQUIRED` or `FAILED`.
- `WAITING_FOR_DEPENDENCY` may resume only after the dependency is verified and the same update plan remains effective.
- `BLOCKED` and `CANCELLED` have no implicit outgoing transition in the same update operation.
- A retry or resume uses the same `update_id` and appends to the existing history.

---

## 11. Preflight

Before staging or activation, OTA shall validate:

- device identity;
- current Hardware Profile and version;
- current Installation Profile and version;
- Compatibility Evaluation Result;
- current Edge OS, Runtime, Player, Web Engine, boot, recovery and security contracts;
- manifest signature and effectiveness;
- key lifecycle and revocation;
- target storage and staging capacity;
- Local Content Store preservation policy;
- identity preservation policy;
- rollback or recovery availability;
- power and thermal preconditions when observable;
- update contract version;
- anti-downgrade policy.

If a preflight check fails, OTA shall stop before activation and report the exact cause.

---

## 12. Staging

Staging shall acquire and verify the exact artifact set before activation.

```text
resolve manifest
      ↓
acquire artifacts
      ↓
verify signatures and digests
      ↓
verify profile and contract binding
      ↓
reserve storage
      ↓
persist staged set
      ↓
STAGED
```

Staging shall not modify active system artifacts or Local Content Store content.

The staged set shall be identified by manifest identity, artifact digests and `update_id`.

If staging is interrupted, OTA shall either resume from verified artifacts or discard only the staged set. It shall not assume an unverified partial artifact is usable.

---

## 13. Staged Artifact Validation

The transition from `STAGED` to `VERIFIED` requires:

- manifest signature valid;
- every required artifact present;
- every artifact digest valid;
- key lifecycle valid;
- no artifact revoked;
- Hardware Profile binding valid;
- Installation Profile binding valid;
- boot and recovery compatibility valid;
- storage and partition plan valid;
- content policy valid;
- rollback path valid.

An update shall not activate from `STAGED` without `VERIFIED`.

---

## 14. Activation

Activation shall be performed only according to the Hardware Profile and Update Manifest.

### 14.1 A/B support

When A/B is supported and validated, OTA shall prefer:

```text
ACTIVE SLOT
      ↓
write INACTIVE SLOT
      ↓
verify INACTIVE SLOT
      ↓
activate INACTIVE SLOT
      ↓
boot
      ↓
health confirmation
      ├── success → MARKED_GOOD
      └── failure → ROLLBACK
```

The currently active slot shall remain the fallback until the new slot is confirmed and marked good.

### 14.2 Non-A/B support

Hardware without A/B shall use an explicitly validated rollback or restoration mechanism referenced by the Hardware Profile and manifest.

Examples may include a recovery partition, known-good image, dual-image arrangement or validated external recovery. Reinstalling an older version without a validated rollback contract is not rollback.

### 14.3 Activation boundary

The activation boundary shall be journaled. Power loss or process failure at this boundary shall invoke the profile-specific boot, rollback or Recovery path.

---

## 15. Boot and Health Confirmation

The update shall progress through:

```text
ACTIVATED
   ↓
BOOTED
   ↓
RUNTIME_HEALTHY
   ↓
PLAYER_HEALTHY
   ↓
CONFIRMED
   ↓
MARKED_GOOD
```

### 15.1 Activated

The exact artifact set passed activation and was selected by the profile-specific activation mechanism. Activation completion is journaled before the device boots the target state.

### 15.2 Booted

The device booted the exact activated artifact set and presented the expected Hardware Profile and identity.

### 15.3 Runtime healthy

`RUNTIME_HEALTHY` is produced only when the Runtime contract reports all of the following for the target boot session:

```text
lifecycle_state = ACTIVE
readiness_state = READY
liveness_state = ALIVE
identity_state = VERIFIED
security_state = TRUSTED
all required_for_runtime dependencies = SATISFIED
Edge OS = ACTIVE with no mandatory health dimension UNKNOWN or UNHEALTHY
```

`DEGRADED`, `NOT_READY`, `UNKNOWN`, `UNHEALTHY`, `SAFE_MODE` and `RECOVERING` do not satisfy this gate.

### 15.4 Player healthy

`PLAYER_HEALTHY` is produced only when `PlayerHealth.state = HEALTHY`, the Player is in `READY` or `PLAYING`, the active Local Content Store snapshot is integrity-verified and the mandatory display, Web Engine and codec checks for the Hardware Profile pass. Optional collector absence may coexist with `HEALTHY` only when the profile declares the collector optional.

If either health gate fails or remains unknown, OTA shall not reach `CONFIRMED` or `MARKED_GOOD`. The active Last Known Good state remains authoritative; activation failure enters `ROLLBACK_REQUIRED`, and rollback failure hands off to the Recovery Plan with the failed gate and health references preserved.

### 15.5 Confirmed

All mandatory update health criteria passed, but the Last Known Good marker has not yet been finalized.

### 15.6 Marked good

The new state and exact artifact set are persisted as Last Known Good. Only this state completes a successful OTA.

---

## 16. Last Known Good

The Last Known Good record shall include:

```text
hardware_profile
installation_profile
edge_os_version
runtime_version
player_version
web_engine_version
boot_configuration
manifest_reference
artifact_digests
identity_reference
configuration_reference
health_result
marked_good_at
record_hash
```

The Last Known Good record is immutable. A newer successful update creates a new record that supersedes it.

“Latest” shall never be used as a substitute for “Last Known Good”.

---

## 17. Rollback

Rollback shall be used when activation or health confirmation fails.

```text
FAILED
   ↓
ROLLBACK_REQUIRED
   ↓
ROLLING_BACK
   ↓
BOOT
   ↓
HEALTH CHECK
   ├── success → ROLLED_BACK / LAST_KNOWN_GOOD
   └── failure → RECOVERY_REQUIRED
```

Rollback shall:

1. stop forward activation;
2. select only the authorized Last Known Good target;
3. verify rollback artifacts and profile binding;
4. restore the declared state;
5. boot and validate Runtime, Player, identity and configuration;
6. persist the rollback result;
7. hand off to Recovery if validation fails.

Rollback shall not erase Local Content Store by default.

---

## 18. Recovery Handoff

If rollback cannot restore a safe state, OTA shall enter `RECOVERY_REQUIRED` and hand off to the Recovery contract with:

```text
update_id
device_identity
hardware_profile
installation_profile
manifest_reference
last_known_good_reference
current_state
failed_state
failure_reason
journal_reference
```

OTA shall not choose a generic recovery artifact. Recovery resolves an explicit Recovery Plan and owns the recovery state machine.

---

## 19. Offline OTA

Offline OTA is permitted when all required inputs are locally available and authorized:

```text
Update Manifest
compatibility context
signed artifacts
rollback artifacts
recovery reference
key and revocation data
health plan
```

The absence of network connectivity shall not invalidate a complete offline package.

If current key revocation or authorization information is required but unavailable, the manifest must declare the historical verification policy; otherwise the update shall wait or reject safely.

Offline OTA shall use the same signature, digest, profile, anti-downgrade and health checks as online OTA.

---

## 20. Interrupted Update and Power Loss

Every update step that can change persistent state shall be journaled.

The journal shall include:

```text
update_id
state
checkpoint
manifest_reference
artifact_reference
target
previous_state
next_state
timestamp
evidence
```

After restart or power restoration, OTA shall determine whether it can:

```text
resume
verify and continue
rollback
recover
block
```

It shall never assume that a partial write completed successfully.

### 20.1 A/B power loss

With A/B, the active confirmed slot remains the fallback until the new slot is marked good.

### 20.2 Non-A/B power loss

Without A/B, the declared rollback or recovery mechanism must determine whether the target is valid. If state is ambiguous, OTA shall enter Recovery rather than retrying an unsafe write.

### 20.3 Local Content Store

Power loss during system update shall not erase or invalidate Local Content Store metadata unless the manifest explicitly includes a validated content migration.

---

## 21. Anti-Downgrade

Anti-downgrade is a separate decision from signature validity.

A valid signature does not authorize installation of an older artifact.

The anti-downgrade policy shall evaluate:

```text
source version
target version
security epoch
minimum allowed version
profile policy
recovery exception
authorization
```

The policy shall distinguish:

```text
AUTHORIZED_UPGRADE
AUTHORIZED_ROLLBACK
UNAUTHORIZED_DOWNGRADE
```

Rollback is permitted only when explicitly authorized by the manifest, Last Known Good record and security policy.

OTA shall not bypass anti-downgrade because the target artifact is signed.

---

## 22. Revocation

OTA shall check revocation for:

```text
manifest
artifact
signing key
Hardware Profile
Installation Profile
security policy
```

A revoked item shall not be staged or activated for a new operation.

Historical `UpdateResult` records remain valid evidence and shall not be rewritten because an artifact was later revoked.

If revocation information is unavailable, the operation follows the manifest's explicit online/offline verification policy. It shall not silently assume that the item remains valid.

---

## 23. Key Rotation

Key rotation shall be treated as an OTA security update with its own signed manifest and rollback/recovery path.

The rotation plan shall define:

```text
current trusted key
new trusted key
activation time
overlap period, if any
verification policy
rollback behavior
revocation behavior
```

The device shall not discard its only trusted verification path before the new path is validated.

Key rotation shall not change `EdgeInstallationId` or `DeviceKey` unless an explicit identity operation authorizes it.

---

## 24. Retry, Resume and Idempotency

### 24.1 Stable identity

Every retry uses the same `update_id` and the same manifest plan unless a new update operation is authorized.

### 24.2 Resume checkpoint

Resume shall begin from the last verified checkpoint and revalidate:

- target identity;
- Hardware Profile;
- Installation Profile;
- manifest effectiveness;
- artifact digests;
- key and revocation state;
- storage and slot state;
- journal integrity.

### 24.3 Ambiguous step

If OTA cannot determine whether an activation or write completed, it shall verify the target state or enter rollback/recovery. It shall not repeat a non-idempotent step blindly.

### 24.4 Duplicate request

A duplicate request with the same `update_id` shall return the current state or resume the same operation. It shall not create a second activation or identity.

### 24.5 Stale plan

If the manifest, profile, key, policy or compatibility context is no longer effective, resume shall stop and require a new authorized resolution.

---

## 25. System, Runtime and Content Policies

OTA shall keep update scopes distinct:

```text
SYSTEM_POLICY
RUNTIME_POLICY
PLAYER_POLICY
CONTENT_POLICY
CONFIGURATION_POLICY
IDENTITY_POLICY
```

### 25.1 System policy

Controls Edge OS, boot, partition, recovery, rollback and security changes.

### 25.2 Runtime policy

Controls Runtime services, dependencies, configuration migrations and health checks.

### 25.3 Player policy

Controls Player/Web Engine/codec compatibility, local content interface and playback health.

### 25.4 Content policy

Controls Local Content Store preservation, revalidation, migration, indexing and explicit erasure.

### 25.5 Configuration and identity policy

Controls persistence, migration, reset and identity continuity. OTA shall not use a system update as an implicit identity reset.

One manifest may coordinate these policies, but it shall preserve their distinct scope and evidence.

---

## 26. Telemetry and Evidence

OTA shall emit structured telemetry for:

```text
update_requested
target_resolved
compatibility_validated
manifest_resolved
signature_validated
preflight_completed
staging_started
staging_completed
artifact_verified
activation_started
boot_started
runtime_health
player_health
update_confirmed
marked_good
rollback_started
rollback_completed
recovery_handoff
update_failed
```

Telemetry shall include:

```text
update_id
EdgeInstallationId
HardwareProfile
InstallationProfile
source_version
target_version
manifest_reference
state
result
timestamp
```

Private keys, passwords and secret material shall never be emitted.

OTA evidence shall preserve why the update was selected, which artifacts were used, which checks passed, what failed and what final state was reached.

---

## 27. Update Journal

The OTA journal shall be append-only and integrity-protected.

Each entry shall include:

```text
sequence
update_id
state
checkpoint
operation
manifest_reference
artifact_reference
target
result
timestamp
evidence_reference
entry_hash
```

The journal shall survive process restart and power loss to the extent required by the Hardware Profile.

Journal corruption shall block further destructive OTA work and trigger rollback or Recovery according to the current state.

---

## 28. Update Result

Every OTA operation shall produce an immutable `UpdateResult` containing at least:

```text
update_id
device_identity
hardware_profile
installation_profile
source_version
target_version
manifest
artifacts
activation_result
health_result
rollback_result
final_state
evidence
result_hash
```

The result shall also record:

```text
started_at
completed_at
key_verification_result
revocation_result
anti_downgrade_result
last_known_good_reference
recovery_handoff_result
```

The result is sealed after terminal state. A later update creates a new result and does not rewrite the historical result.

---

## 29. Error Catalog

OTA errors shall be typed and stable.

```text
OTA_REQUEST_INCOMPLETE
OTA_OPERATION_CONFLICT
OTA_DEVICE_IDENTITY_INVALID
OTA_HARDWARE_PROFILE_MISSING
OTA_HARDWARE_PROFILE_MISMATCH
OTA_INSTALLATION_PROFILE_MISSING
OTA_INSTALLATION_PROFILE_MISMATCH
OTA_COMPATIBILITY_MISSING
OTA_COMPATIBILITY_REJECTED
OTA_MANIFEST_NOT_FOUND
OTA_MANIFEST_SIGNATURE_INVALID
OTA_MANIFEST_NOT_EFFECTIVE
OTA_MANIFEST_REVOKED
OTA_ARTIFACT_MISSING
OTA_ARTIFACT_SIGNATURE_INVALID
OTA_ARTIFACT_DIGEST_MISMATCH
OTA_ARTIFACT_REVOKED
OTA_KEY_REVOKED
OTA_KEY_EXPIRED
OTA_KEY_UNSUPPORTED
OTA_ANTI_DOWNGRADE_REJECTED
OTA_STORAGE_INSUFFICIENT
OTA_CONTENT_POLICY_CONFLICT
OTA_PREFLIGHT_FAILED
OTA_STAGING_FAILED
OTA_ACTIVATION_FAILED
OTA_BOOT_FAILED
OTA_RUNTIME_HEALTH_FAILED
OTA_PLAYER_HEALTH_FAILED
OTA_CONFIRMATION_FAILED
OTA_MARK_GOOD_FAILED
OTA_ROLLBACK_REQUIRED
OTA_ROLLBACK_FAILED
OTA_RECOVERY_REQUIRED
OTA_POWER_INTERRUPTED
OTA_JOURNAL_INVALID
OTA_SCHEMA_UNSUPPORTED
OTA_OFFLINE_DEPENDENCY_MISSING
```

Each error shall declare phase, retryability, recoverability and required action in the applicable OTA contract version.

---

## 30. Security Requirements

OTA shall:

- validate manifest and artifact signatures;
- validate digests;
- enforce key lifecycle;
- enforce revocation;
- enforce anti-downgrade;
- bind target to Hardware Profile and Installation Profile;
- protect identity and configuration;
- preserve Last Known Good;
- protect the journal;
- prevent arbitrary activation;
- hand off to Recovery on unsafe failure;
- avoid secret leakage.

An OTA implementation shall not weaken security because the device is offline, in recovery, non-A/B or running an older version.

---

## 31. Compatibility and Versioning

OTA shall treat the following as independent opaque identities:

```text
ota_contract_version
manifest_version
artifact_version
edge_os_version
runtime_version
player_version
web_engine_version
boot_contract_version
recovery_contract_version
security_policy_version
```

The manifest or compatibility contract shall declare supported combinations. OTA shall not infer compatibility from ordering, semantic version comparison or equal text alone.

An unknown schema or contract shall result in explicit rejection or a safe wait state. It shall not be silently ignored.

---

## 32. Completion Criteria

An OTA operation may be marked `MARKED_GOOD` only when:

```text
target resolved
compatibility validated
manifest verified
artifacts verified
preflight passed
staging completed
activation completed
boot confirmed
Runtime healthy
Player healthy
identity preserved
configuration valid
Local Content Store policy completed
telemetry emitted or durably queued
Last Known Good persisted
UpdateResult sealed
```

If any required condition fails, OTA shall terminate in rollback, Recovery, failure, blocked or cancellation according to the state machine.

---

## 33. Normative Requirements

### OTA-001

OTA shall resolve updates through an authoritative signed Update Manifest.

### OTA-002

OTA shall never select an update solely by version number, commercial name or SoC family.

### OTA-003

OTA shall bind the manifest to Hardware Profile and Installation Profile.

### OTA-004

OTA shall validate Edge OS, Runtime, Player, Web Engine, boot, recovery and security compatibility.

### OTA-005

Unknown, Unsupported and Blocked devices shall not receive automatic OTA.

### OTA-006

Experimental devices shall require explicit controlled authorization.

### OTA-007

All artifacts shall pass signature and digest verification before staging and activation.

### OTA-008

OTA shall use a single explicit state machine with journaled transitions.

### OTA-009

An update shall not become active before boot, Runtime and Player health confirmation.

### OTA-010

An update shall not be marked good before the Last Known Good record is persisted.

### OTA-011

A/B rollback shall be preferred when supported and validated by the Hardware Profile.

### OTA-012

Non-A/B hardware shall have a validated rollback or recovery mechanism.

### OTA-013

Power loss and interrupted writes shall result in deterministic resume, rollback or Recovery.

### OTA-014

OTA shall enforce anti-downgrade independently of signature validity.

### OTA-015

Signing keys shall support Active, Rotated, Revoked and Expired lifecycle states.

### OTA-016

Revoked manifests, artifacts, keys or profiles shall not be activated.

### OTA-017

Retry and resume shall use the same `update_id` and shall be idempotent.

### OTA-018

OTA shall not modify device identity without explicit identity migration or reset authorization.

### OTA-019

OTA shall preserve Local Content Store by default and apply system, Runtime and content policies separately.

### OTA-020

Offline OTA shall work when all required signed artifacts and verification data are locally available.

### OTA-021

OTA shall hand off to Recovery when rollback cannot restore a safe state.

### OTA-022

OTA shall produce an immutable `UpdateResult` containing update identity, target context, versions, manifest, artifacts, activation, health, rollback, final state, evidence and result hash.

### OTA-023

OTA shall preserve immutable journal and evidence records after success or failure.

### OTA-024

OTA shall not erase Local Content Store without an explicit compatible content policy and authorization.

### OTA-025

OTA shall not introduce Campaign, Pricing, Financial, Evidence or Settlement behavior.

---

## 34. Next Specification

The next specification shall define Edge Security:

`EDGE_SECURITY.md`

It shall consume:

```text
EDGE_HARDWARE_COMPATIBILITY.md
EDGE_HARDWARE_DISCOVERY.md
EDGE_HARDWARE_PROFILES.md
EDGE_INSTALLER_SPECIFICATION.md
EDGE_PROVISIONING.md
EDGE_RECOVERY.md
EDGE_OS_SPECIFICATION.md
EDGE_OTA.md
```

It shall consolidate trust anchors, key management, device identity, secure transport, artifact signatures, revocation, sandboxing and security incident handling without changing the OTA boundaries established here.
