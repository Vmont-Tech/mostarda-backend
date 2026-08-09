# Mostarda Edge — Recovery Specification

**Status:** DRAFT  
**Version:** 1.0.0  
**Owner:** Mostarda Architecture  
**Prerequisites:** `EDGE_HARDWARE_COMPATIBILITY.md`, `EDGE_HARDWARE_DISCOVERY.md`, `EDGE_HARDWARE_PROFILES.md`, `EDGE_INSTALLER_SPECIFICATION.md`, `EDGE_PROVISIONING.md`  
**Related ADR:** ADR-010 — Edge Hardware and Provisioning  
**Scope:** deterministic recovery, restoration of a known-good Edge state and protection against unrecoverable device states

---

## 1. Purpose

This document defines the normative contract for Mostarda Edge Recovery.

Recovery exists to restore a device to a known, verifiable and operational Edge state after an installation, provisioning, update, boot or runtime failure that cannot be resolved by normal execution.

Recovery shall prioritize:

1. preservation of device identity;
2. preservation of authorized configuration;
3. restoration of a known-good system;
4. prevention of repeated boot or update failure;
5. integrity verification;
6. deterministic evidence and telemetry.

Recovery shall never install an arbitrary image or infer a recovery artifact from a commercial device name.

---

## 2. Architectural Boundary

The recovery relationship is:

```text
Hardware Profile
        ↓
Installation Profile
        ↓
Recovery Plan
        ↓
Recovery
        ↓
Operational Recovery Result
```

Recovery consumes previously authorized contracts.

Recovery does not:

- discover arbitrary hardware as a replacement for Hardware Discovery;
- decide compatibility;
- publish Hardware Profiles;
- select an arbitrary Edge OS;
- invent a partition layout;
- bypass artifact signatures;
- create a new production identity without authorization;
- modify business, Campaign, Pricing, Financial, Evidence or Settlement behavior.

When hardware identity cannot be established safely, Recovery shall enter a diagnostic or blocked state rather than guessing.

---

## 3. Recovery Objectives

A successful recovery shall produce one explicit operational result. Operational results are not process states; they are the state of the device after the recovery process terminates.

```text
KNOWN_GOOD_EDGE
SAFE_BOOTSTRAP
CONTROLLED_RECOVERY
NO_OPERATIONAL_STATE
```

The preferred operational result is:

```text
KNOWN_GOOD_EDGE
```

where:

- Edge OS is verified;
- Edge Runtime is verified;
- Player is operational;
- identity is preserved;
- configuration is valid;
- telemetry is operational;
- recovery markers are cleared.

If a complete Edge state cannot be achieved safely, the device may produce:

```text
CONTROLLED_RECOVERY
```

The recovery process shall still terminate in one of the process terminal states defined in Section 7. `SAFE_BOOTSTRAP` and `CONTROLLED_RECOVERY` are operational results, not additional process states.

---

## 4. Recovery Triggers

Recovery may be initiated by:

```text
BOOT_FAILURE
BOOT_LOOP
FAILED_PROVISIONING
FAILED_OTA
FAILED_ROLLBACK
CORRUPTED_SYSTEM
CORRUPTED_CONFIGURATION
RUNTIME_FAILURE
PLAYER_FAILURE
IDENTITY_INCONSISTENCY
MANUAL_AUTHORIZED_RECOVERY
WATCHDOG_TRIGGER
INTEGRITY_FAILURE
```

Recovery shall not be triggered solely because a device is temporarily offline.

Network unavailability is not, by itself, a recovery condition.

---

## 5. Recovery Classes

Recovery shall distinguish:

```text
SOFT_RECOVERY
SYSTEM_ROLLBACK
FULL_RECOVERY
EXTERNAL_RECOVERY
FACTORY_RECOVERY
```

### 5.1 SOFT_RECOVERY

Restores runtime services or configuration without rewriting the operating system.

Examples:

- restart Edge Runtime;
- restart Player;
- restore known-good configuration;
- rebuild transient state;
- recover local service state.

Soft recovery shall be preferred when it can restore operation without modifying system partitions.

### 5.2 SYSTEM_ROLLBACK

Restores the previous verified system version.

Typical use:

- OTA failure;
- activation failure;
- post-update validation failure;
- boot failure after update.

System rollback shall preserve:

- `EdgeInstallationId`;
- `DeviceKey`;
- authorized persistent configuration;
- required telemetry history.

### 5.3 FULL_RECOVERY

Restores the complete Edge system using the validated Recovery Plan.

It may rewrite:

- system;
- runtime;
- boot artifacts;
- required configuration partitions.

It shall preserve identity when technically possible and explicitly authorized.

### 5.4 EXTERNAL_RECOVERY

Uses an authorized external bootstrap mechanism such as:

- SD;
- USB;
- recovery media;
- authorized maintenance interface.

External recovery is a recovery mechanism, not permission to use arbitrary media.

All artifacts remain subject to signature, digest and profile validation.

### 5.5 FACTORY_RECOVERY

Factory recovery returns the device to a clean Edge installation state.

Factory recovery may erase application and content data only when explicitly authorized.

Factory recovery shall not silently erase device identity.

If identity destruction is unavoidable, the operation shall require an explicit identity-reset authorization.

---

## 6. Recovery State Machine

Recovery shall use one normative process state machine. Every state named in this document belongs to one of the categories below:

- process states: active execution steps;
- wait/block states: execution is paused or prohibited and may require a dependency, rollback or controlled handoff;
- terminal states: the current recovery operation has ended;
- operational results: the device state produced by a terminal recovery result. Operational results are not process states.

### 6.1 Normative process states

```text
NOT_STARTED
      ↓
DETECTED
      ↓
DIAGNOSING
      ↓
RECOVERY_PLAN_RESOLVING
      ↓
ARTIFACTS_VALIDATING
      ↓
BACKUP_PRESERVATION
      ↓
RESTORING
      ↓
BOOT_VALIDATING
      ↓
RUNTIME_VALIDATING
      ↓
IDENTITY_VALIDATING
      ↓
CONFIGURATION_VALIDATING
      ↓
PLAYER_VALIDATING
      ↓
TELEMETRY_VALIDATING
      ↓
RECOVERY_CONFIRMING
      ├── RECOVERED
      ├── ROLLBACK_REQUIRED
      ├── RECOVERY_FAILED
      ├── MANUAL_INTERVENTION_REQUIRED
      └── BLOCKED

ROLLBACK_REQUIRED
      ├── ROLLED_BACK
      ├── RECOVERY_REQUIRED
      ├── RECOVERY_FAILED
      └── MANUAL_INTERVENTION_REQUIRED
```

### 6.2 Wait and block states

```text
PAUSED
WAITING_FOR_DEPENDENCY
RECOVERY_REQUIRED
BLOCKED
CANCELLED
```

These states are part of the same machine. They may be entered from any active state when the Recovery Plan permits a safe pause or handoff. A wait or handoff state may return to the recorded previous active state only after its explicit precondition is satisfied and a new transition is journaled.

`RECOVERY_REQUIRED` means that the current recovery path cannot continue and an explicitly declared fallback recovery path must be resolved. It is not a successful result.

`WAITING_FOR_DEPENDENCY` means that a declared dependency, such as a locally unavailable artifact or authorized network service, is not currently available. It is not a failure and it is not a compatibility decision.

`MANUAL_INTERVENTION_REQUIRED` means that no safe automatic path remains. It is a terminal process state, even when the operational result is `CONTROLLED_RECOVERY`.

### 6.3 Terminal process states

```text
RECOVERED
ROLLED_BACK
RECOVERY_FAILED
MANUAL_INTERVENTION_REQUIRED
BLOCKED
CANCELLED
```

`ROLLBACK_REQUIRED` is a process state that leads to the declared rollback path; it is not terminal. After rollback, the operation terminates as `ROLLED_BACK`, `RECOVERY_FAILED`, `MANUAL_INTERVENTION_REQUIRED` or `BLOCKED`.

### 6.4 Operational results

The terminal process result shall carry exactly one operational result:

```text
KNOWN_GOOD_EDGE
SAFE_BOOTSTRAP
CONTROLLED_RECOVERY
NO_OPERATIONAL_STATE
```

The mapping is explicit:

| Terminal process state | Allowed operational result |
| --- | --- |
| `RECOVERED` | `KNOWN_GOOD_EDGE` or `SAFE_BOOTSTRAP` |
| `ROLLED_BACK` | `KNOWN_GOOD_EDGE` or `SAFE_BOOTSTRAP` |
| `RECOVERY_FAILED` | `CONTROLLED_RECOVERY` or `NO_OPERATIONAL_STATE` |
| `MANUAL_INTERVENTION_REQUIRED` | `CONTROLLED_RECOVERY` or `NO_OPERATIONAL_STATE` |
| `BLOCKED` | `CONTROLLED_RECOVERY` or `NO_OPERATIONAL_STATE` |
| `CANCELLED` | `NO_OPERATIONAL_STATE` |

`KNOWN_GOOD_EDGE` is the only result that represents a fully operational Edge state. `SAFE_BOOTSTRAP` represents a verified limited bootstrap state that is not equivalent to production Edge operation. `CONTROLLED_RECOVERY` represents a controlled diagnostic or recovery state that must not be reported as operational.

### 6.5 Transition constraints

- Every active process state may enter `PAUSED`, `WAITING_FOR_DEPENDENCY`, `RECOVERY_REQUIRED`, `BLOCKED` or `CANCELLED` only at a safe, journaled boundary.
- `PAUSED` may return to the recorded active state only after the same plan and identity are revalidated.
- `WAITING_FOR_DEPENDENCY` may return to the recorded active state only after the dependency is verified; otherwise it may enter `RECOVERY_REQUIRED`, `BLOCKED` or `MANUAL_INTERVENTION_REQUIRED`.
- `RECOVERY_REQUIRED` may return to `RECOVERY_PLAN_RESOLVING` only when a new explicitly authorized fallback plan is available; otherwise it terminates as `MANUAL_INTERVENTION_REQUIRED` or `BLOCKED`.
- `ROLLBACK_REQUIRED` may enter `ROLLED_BACK`, `RECOVERY_REQUIRED`, `RECOVERY_FAILED` or `MANUAL_INTERVENTION_REQUIRED` according to the declared rollback result.
- Terminal process states have no implicit outgoing transition. A later attempt is a new append-only recovery attempt linked to the prior result.

---

## 7. Recovery State Definitions

### 7.1 NOT_STARTED

No recovery operation exists.

### 7.2 DETECTED

A recovery trigger was identified and recorded.

### 7.3 DIAGNOSING

The system is determining whether recovery can be safely performed.

Diagnosis shall identify:

- current boot state;
- current system state;
- last known-good state;
- available recovery paths;
- identity state;
- storage state;
- artifact availability.

### 7.4 RECOVERY_PLAN_RESOLVING

The system resolves exactly one authorized Recovery Plan.

No arbitrary recovery method may be selected.

### 7.5 ARTIFACTS_VALIDATING

All required recovery artifacts are validated.

### 7.6 BACKUP_PRESERVATION

Authorized identity and persistent configuration are preserved.

### 7.7 RESTORING

The selected recovery operation is executed.

### 7.8 BOOT_VALIDATING

The restored system is verified through the declared boot path.

### 7.9 RUNTIME_VALIDATING

Edge Runtime starts and passes health validation.

### 7.10 IDENTITY_VALIDATING

The expected identity is restored and verified.

### 7.11 CONFIGURATION_VALIDATING

Persistent configuration is checked for integrity and compatibility.

### 7.12 PLAYER_VALIDATING

The Player initializes and performs the required playback health checks.

### 7.13 TELEMETRY_VALIDATING

The device can produce and persist the required operational telemetry.

### 7.14 RECOVERY_CONFIRMING

All mandatory recovery checks are evaluated before declaring success.

### 7.15 RECOVERED

The recovery checks completed successfully and the result is sealed. The result must explicitly state whether the operational result is `KNOWN_GOOD_EDGE` or `SAFE_BOOTSTRAP`.

### 7.16 ROLLED_BACK

The declared rollback path restored and verified a previous known-good state. Rollback is a terminal process result, not a new recovery state.

### 7.17 ROLLBACK_REQUIRED

The recovery operation itself produced an invalid or unsafe state and a declared fallback exists.

### 7.18 RECOVERY_FAILED

Recovery could not restore a known-good state.

### 7.19 MANUAL_INTERVENTION_REQUIRED

No safe automatic path remains.

### 7.20 WAITING_FOR_DEPENDENCY

A declared dependency is temporarily unavailable. The operation remains paused without claiming success or failure.

### 7.21 RECOVERY_REQUIRED

The current path cannot continue and an explicitly declared fallback recovery path must be resolved. The operation shall not continue by selecting an arbitrary artifact or method.

### 7.22 PAUSED

The operation is stopped at a safe checkpoint and may resume with the same recovery identity and unchanged plan.

### 7.23 CANCELLED

The operation was cancelled at an allowed safe point. Cancellation never produces a successful operational result.

### 7.24 BLOCKED

Recovery is prohibited because integrity, identity or hardware conditions make automatic recovery unsafe.

---

## 8. Recovery Plan

Every automatic recovery operation shall reference exactly one effective Recovery Plan.

The plan shall define:

```text
recovery_plan_id
recovery_plan_version
hardware_profile_id
hardware_profile_version
installation_profile_id
installation_profile_version
target_state
recovery_method
artifacts
partition_plan
identity_policy
configuration_policy
rollback_policy
validation_plan
```

The Recovery Plan shall be signed and versioned.

An invalid, expired, revoked or incompatible Recovery Plan shall be rejected.

---

## 9. Known-Good State

A recovery target shall be explicitly identified as a known-good state.

A known-good state shall include:

```text
Edge OS version
Edge Runtime version
Player version
configuration version
Hardware Profile reference
Installation Profile reference
artifact manifest
boot configuration
recovery metadata
```

The known-good state shall have verifiable integrity.

Recovery shall never define “latest version” as equivalent to “known-good version”.

---

## 10. A/B Recovery

When the Hardware Profile supports A/B system slots, Recovery shall prefer slot-based rollback.

The expected model is:

```text
ACTIVE SLOT
     ↓
UPDATE
     ↓
INACTIVE SLOT
     ↓
VERIFY
     ↓
ACTIVATE
     ↓
HEALTH CHECK
     ├── SUCCESS → MARK GOOD
     └── FAILURE → ROLLBACK
```

A failed activation shall return to the last known-good slot when the hardware supports this mechanism.

A/B capability is preferred but is not mandatory for every hardware profile.

Hardware without A/B shall use its validated recovery mechanism.

---

## 11. Recovery Without A/B

For hardware without A/B support, the Recovery Plan shall define an alternative verified rollback or restoration mechanism.

Possible mechanisms include:

- recovery partition;
- known-good system image;
- external recovery;
- validated backup;
- dual-image implementation.

The selected mechanism must be explicitly associated with the Hardware Profile.

A generic recovery image shall not be used.

---

## 12. Artifact Integrity

Recovery artifacts shall follow the same trust model as installation and provisioning.

Every artifact shall have:

```text
artifact_identity
artifact_version
digest
signature
signing_key_id
compatibility_scope
```

Recovery shall verify:

- manifest signature;
- artifact signature;
- artifact digest;
- Hardware Profile compatibility;
- Recovery Plan compatibility;
- partition compatibility;
- boot compatibility.

Failure of any mandatory check blocks recovery.

---

## 13. Recovery Artifact Classes

Recovery may require:

```text
EDGE_OS_ARTIFACT
RUNTIME_ARTIFACT
PLAYER_ARTIFACT
BOOT_ARTIFACT
KERNEL_ARTIFACT
DEVICE_TREE_ARTIFACT
RECOVERY_ARTIFACT
ROLLBACK_ARTIFACT
CONFIGURATION_ARTIFACT
```

The Recovery Plan shall explicitly declare which artifacts are required.

Recovery shall not infer missing artifacts.

---

## 14. Identity Preservation

The following identities shall be preserved across normal recovery:

```text
EdgeInstallationId
DeviceKey
HardwareProfile reference
```

unless an explicit identity reset operation has been authorized.

Identity preservation shall be validated after recovery.

A recovery operation that boots successfully but loses the expected device identity shall not be classified as `RECOVERED`.

---

## 15. Device Key Protection

Private key material shall never be exposed through:

- logs;
- telemetry;
- diagnostics;
- recovery reports;
- screenshots;
- exported manifests.

Where hardware-backed key storage exists, Recovery shall preserve it.

Where software-backed identity is used, Recovery shall use the declared protected storage mechanism.

A failed identity restoration shall result in:

```text
IDENTITY_RECOVERY_FAILURE
```

and prevent normal production activation.

---

## 16. Configuration Preservation

Recovery shall preserve authorized configuration whenever compatible.

Configuration categories include:

```text
device configuration
network configuration
Player configuration
content configuration
telemetry configuration
operational policies
```

Configuration shall be validated against the restored software contract.

Incompatible configuration shall not be blindly restored.

The Recovery Plan shall define:

```text
PRESERVE
MIGRATE
RESET
```

for each configuration category.

---

## 17. Local Content Store

Recovery shall distinguish system recovery from content recovery.

The Local Content Store shall not be erased by default.

The Recovery Plan shall specify whether content is:

```text
PRESERVE
REINDEX
REVALIDATE
REBUILD
ERASE
```

Content corruption shall not automatically imply system corruption.

Where possible, Recovery shall restore the system while preserving valid local content.

---

## 18. Offline Recovery

Recovery shall support operation without network access when all required artifacts are locally available.

Offline recovery may use:

- local recovery partition;
- local artifact cache;
- local signed content store;
- authorized external media.

Network connectivity shall not be assumed during recovery.

If a recovery operation requires network access and no valid local fallback exists, it shall enter:

```text
WAITING_FOR_DEPENDENCY
```

or:

```text
MANUAL_INTERVENTION_REQUIRED
```

rather than failing through an unsafe partial operation.

---

## 19. Power Loss

Recovery shall be designed for unexpected power loss.

Every destructive operation shall be journaled.

The journal shall record:

```text
recovery_id
current_state
checkpoint
target
artifact
operation
previous_state
next_state
timestamp
evidence
```

After power restoration, the system shall determine whether it can:

```text
resume
rollback
recover
block
```

It shall never assume that an interrupted write completed successfully.

---

## 20. Recovery Journal

The journal is append-only.

Each entry shall include:

```text
sequence
recovery_id
operation
state
checkpoint
target
artifact_reference
result
timestamp
evidence_reference
entry_hash
```

Journal integrity shall be verifiable.

Recovery shall never rewrite historical entries to conceal an unsuccessful attempt.

---

## 21. Recovery Idempotency

Repeating the same recovery operation shall not:

- duplicate identity;
- generate a new DeviceKey;
- corrupt configuration;
- duplicate content;
- invalidate the recovery journal;
- create conflicting boot entries.

A recovery operation shall use a stable `recovery_id`.

A retry shall either:

```text
resume
restart from a safe checkpoint
rollback
enter recovery failure
```

according to the Recovery Plan.

---

## 22. Boot Failure Handling

If the restored system fails to boot:

```text
boot failure
    ↓
collect evidence
    ↓
identify last known-good state
    ↓
rollback if available
    ↓
validate rollback
```

If rollback fails:

```text
RECOVERY_REQUIRED
        ↓
alternative recovery
        ↓
manual intervention if necessary
```

The device shall not enter an uncontrolled boot loop.

---

## 23. Runtime Failure Handling

If the operating system boots but Edge Runtime fails, Recovery shall first attempt the least destructive valid path:

```text
restart runtime
    ↓
restore configuration
    ↓
restore runtime artifact
    ↓
system rollback
    ↓
full recovery
```

The exact sequence shall be defined by the Recovery Plan.

---

## 24. Player Failure Handling

Player failure shall not automatically trigger full system recovery.

The recovery hierarchy should prefer:

```text
Player restart
    ↓
Player configuration recovery
    ↓
Player artifact restoration
    ↓
Runtime recovery
    ↓
System rollback
    ↓
Full recovery
```

Full system recovery requires evidence that lower-level recovery cannot restore the required Player state.

---

## 25. Telemetry

Recovery shall emit structured telemetry for:

```text
recovery_started
recovery_trigger
recovery_plan_selected
artifact_validation
backup_started
restore_started
restore_completed
boot_validation
runtime_validation
identity_validation
player_validation
rollback_started
rollback_completed
recovery_completed
recovery_failed
manual_intervention_required
```

Telemetry shall include:

```text
EdgeInstallationId
HardwareProfile
RecoveryPlan
software_version
recovery_id
state
result
timestamp
```

Private keys and sensitive secret material shall never be emitted.

---

## 26. Evidence

Every recovery operation shall produce evidence sufficient to reconstruct:

- why recovery started;
- which plan was used;
- which artifacts were used;
- which state transitions occurred;
- what was preserved;
- what was restored;
- what failed;
- what validation passed;
- what final state was reached.

Evidence shall be immutable after sealing.

---

## 27. Security

Recovery is a privileged operation.

It shall enforce:

- artifact signature validation;
- manifest validation;
- profile compatibility;
- authorized recovery plan;
- protected identity handling;
- rollback integrity;
- secure logging;
- anti-downgrade policy where applicable.

A recovery operation shall not bypass production security controls simply because the normal OS is unavailable.

---

## 28. Anti-Rollback Policy

Rollback is allowed only to a state explicitly authorized by the Recovery Plan.

The system shall distinguish:

```text
VALID_ROLLBACK
UNAUTHORIZED_DOWNGRADE
```

A cryptographically older but valid artifact may still be rejected when policy prohibits downgrade.

Recovery shall not weaken the security baseline.

---

## 29. Hardware Compatibility During Recovery

Recovery shall continue to honor the Hardware Profile.

A device shall not use a recovery artifact simply because it is able to boot it.

Recovery artifacts must match:

```text
Hardware Profile
Hardware revision
Boot contract
Recovery contract
Security contract
```

If the device identity no longer matches the expected Hardware Profile:

```text
BLOCKED
```

unless an explicit diagnostic/recovery procedure authorizes re-discovery.

---

## 30. Unknown Hardware During Recovery

Unknown hardware shall not receive automatic production recovery.

If the system cannot establish the expected hardware identity:

```text
NO AUTOMATIC IMAGE SELECTION
NO GENERIC RECOVERY
NO UNSIGNED ARTIFACT
```

The device shall enter controlled diagnostic or manual recovery.

---

## 31. Factory Reset

Factory reset is not equivalent to recovery.

Factory reset may remove:

- configuration;
- local content;
- runtime state;
- application state.

but shall preserve:

- hardware identity;
- device identity;
- trust anchors;
- recovery capability.

unless an explicit identity destruction procedure has been authorized.

---

## 32. Manual Intervention

Manual intervention shall be required when:

- no valid Recovery Plan exists;
- no compatible recovery artifact exists;
- hardware identity cannot be established;
- secure artifact verification fails;
- storage integrity is compromised;
- recovery and rollback paths are unavailable;
- identity cannot be safely preserved;
- repeated automatic recovery attempts exceed the policy limit.

The device shall expose a diagnostic identifier without exposing secrets.

---

## 33. Recovery Attempt Limits

Recovery shall have bounded automatic retry behavior.

Repeated failure shall not create an infinite recovery loop.

The Recovery Plan shall define:

```text
maximum_attempts
retry_backoff
fallback_action
manual_intervention_threshold
```

When the threshold is reached:

```text
MANUAL_INTERVENTION_REQUIRED
```

shall be entered.

---

## 34. Recovery Result

Every recovery operation shall produce an immutable `RecoveryResult` containing:

```text
recovery_id
terminal_state
trigger
recovery_plan_reference
hardware_profile_reference
previous_state
restored_state
identity_result
configuration_result
boot_result
runtime_result
player_result
telemetry_result
rollback_result
diagnostic_reference
evidence_reference
result_hash
```

---

## 35. Terminal States

Recovery may terminate as:

```text
RECOVERED
ROLLED_BACK
RECOVERY_FAILED
MANUAL_INTERVENTION_REQUIRED
BLOCKED
CANCELLED
```

`RECOVERED` requires successful validation of every mandatory recovery criterion.

A device that merely boots shall not be considered recovered.

---

## 36. Recovery Success Criteria

A Production hardware profile may report `RECOVERED` only when:

```text
Hardware Identity       ✓
Hardware Profile        ✓
Edge OS                 ✓
Boot                    ✓
Edge Runtime            ✓
Identity                ✓
Configuration           ✓
Player                  ✓
Local Content Store     ✓
Telemetry               ✓
Recovery markers        ✓
Integrity               ✓
```

The exact validation thresholds are inherited from the applicable Hardware Profile, Installation Profile, Edge OS, Player and Telemetry contracts.

---

## 37. Normative Requirements

### REC-001

Every Production Hardware Profile shall have a validated recovery path.

### REC-002

Recovery shall use an explicit Recovery Plan.

### REC-003

Recovery shall never select an artifact by commercial model name.

### REC-004

Recovery artifacts shall be cryptographically verified before use.

### REC-005

Recovery shall preserve `EdgeInstallationId` across normal recovery.

### REC-006

Recovery shall preserve `DeviceKey` across normal recovery when technically possible and authorized.

### REC-007

Recovery shall not expose private key material.

### REC-008

Recovery shall maintain an append-only journal.

### REC-009

Recovery shall support deterministic resume, rollback or controlled failure after power loss.

### REC-010

Recovery shall not enter uncontrolled boot loops.

### REC-011

Recovery shall distinguish system recovery from content recovery.

### REC-012

Recovery shall support offline operation when required artifacts are locally available.

### REC-013

Recovery shall validate the restored boot path.

### REC-014

Recovery shall validate Edge Runtime after restoration.

### REC-015

Recovery shall validate Player operation before reporting successful Production recovery.

### REC-016

Recovery shall validate telemetry operation before reporting successful Production recovery.

### REC-017

Recovery shall honor Hardware Profile compatibility.

### REC-018

Unknown hardware shall not receive automatic Production recovery.

### REC-019

Recovery shall not bypass artifact signatures or trust controls.

### REC-020

Recovery shall enforce the applicable anti-downgrade policy.

### REC-021

Recovery shall have bounded automatic retry behavior.

### REC-022

Recovery shall produce immutable evidence.

### REC-023

Recovery shall produce an immutable `RecoveryResult`.

### REC-024

Factory reset shall not silently destroy device identity.

### REC-025

A device shall not be classified as recovered merely because it boots.

### REC-026

Recovery shall prefer the least destructive valid recovery mechanism.

### REC-027

Recovery shall use A/B rollback when supported and validated.

### REC-028

Hardware without A/B shall use an explicitly validated alternative recovery mechanism.

### REC-029

Recovery shall stop when identity, hardware compatibility or artifact integrity cannot be established safely.

### REC-030

Recovery shall distinguish automatic recovery from manual intervention.

---

## 38. Relationship With Previous Specifications

Recovery consumes:

```text
EDGE_HARDWARE_COMPATIBILITY.md
EDGE_HARDWARE_DISCOVERY.md
EDGE_HARDWARE_PROFILES.md
EDGE_INSTALLER_SPECIFICATION.md
EDGE_PROVISIONING.md
```

The responsibility chain is:

```text
Compatibility
    ↓
Hardware Profile
    ↓
Installation Profile
    ↓
Installer
    ↓
Provisioning
    ↓
Recovery
```

Recovery shall not redefine requirements owned by those contracts.

---

## 39. Next Specification

The next specification shall define the Edge operating-system envelope:

`EDGE_OS_SPECIFICATION.md`

It shall define the runtime environment that Installation, Provisioning, Recovery, OTA, Player, Offline Storage and Telemetry depend upon.
