# Mostarda Edge — Installation Profile Specification

**Status:** DRAFT
**Version:** 1.0.0
**Owner:** Mostarda Architecture
**Prerequisites:** `EDGE_HARDWARE_COMPATIBILITY.md`, `EDGE_HARDWARE_DISCOVERY.md`, `EDGE_HARDWARE_PROFILES.md`
**Consumers:** `EDGE_INSTALLER_SPECIFICATION.md`, `EDGE_PROVISIONING.md`, `EDGE_RECOVERY.md`, `EDGE_OS_SPECIFICATION.md`, `EDGE_OTA.md`
**Related ADR:** ADR-010 — Edge Hardware and Provisioning
**Scope:** canonical installation plans, hardware binding, lifecycle, validation and execution contracts

---

## 1. Purpose

This document defines the normative contract for an `InstallationProfile`.

An Installation Profile is an immutable, versioned and signed contract that describes how an already identified and compatible Hardware Profile may be transformed into a Mostarda Edge installation.

It defines:

- canonical identity and schema;
- exact Hardware Profile binding;
- installation class and bootstrap requirements;
- installation adapter and boot contract;
- storage layout and partition plan;
- required artifacts and Edge OS target;
- recovery and OTA references;
- identity and data-disposition policy;
- prerequisites, capabilities and validation gates;
- lifecycle, immutability and effective periods;
- Installer and Provisioning boundaries;
- migration between profiles;
- integrity, signature and homologation evidence.

This document does not create a concrete profile for any device. In particular, no MXQ Pro, TV Box, board or commercial model is homologated by this document.

---

## 2. Architectural Boundary

The normative resolution chain is:

```text
Hardware Discovery Record
        |
        v
Compatibility Evaluation
        |
        v
Hardware Profile
        |
        v
Installation Profile Resolution
        |
        v
Installer
        |
        v
Provisioning
        |
        v
Edge OS
```

### 2.1 Discovery and Compatibility

Hardware Discovery owns observed facts, provenance and evidence. The Compatibility Engine evaluates those facts against published hardware compatibility contracts and identifies the exact Hardware Profile that may be used.

The Installation Profile is resolved only after the Hardware Profile and Compatibility Evaluation Result are available.

### 2.2 Installation Profile ownership

The Installation Profile owner publishes and governs installation plans. It owns:

- the profile identity and revisions;
- the allowed installation class;
- the exact hardware and scope bindings;
- installation artifacts and adapter references;
- partition, boot, identity, recovery and validation parameters;
- lifecycle state and homologation evidence.

The owner does not acquire authority to declare that a device is compatible. Compatibility remains the responsibility of the Compatibility Engine and the Hardware Profile contract.

### 2.3 Installer and Provisioning

The Installer resolves and orchestrates an authorized Installation Profile. Provisioning executes the resolved plan and reports its result.

Neither component may invent a profile, substitute a profile, select a nearest profile or replace an undeclared value with a local default.

### 2.4 Explicit non-responsibilities

An Installation Profile shall not:

- identify hardware from a commercial name or SoC family alone;
- publish or mutate a Hardware Profile;
- decide Compatibility Evaluation Result;
- choose a different profile when the selected profile is not applicable;
- define Player business behavior, Campaign, Pricing, Financial, Evidence or Settlement rules;
- act as a generic image catalog;
- silently change identity, erase data or bypass Recovery;
- redefine the semantics of the Edge OS, OTA or Recovery contracts.

---

## 3. Resolution Rules

### 3.1 Required resolution inputs

Installation Profile Resolution requires all of the following:

```text
sealed HardwareDiscoveryRecord
CompatibilityEvaluationResult
effective HardwareProfile reference
requested installation scope
requested lifecycle state
authorized installation request
```

An absent, stale, invalid or contradictory input stops resolution.

### 3.2 Exact Hardware Profile binding

Every Production Installation Profile shall bind to one or more explicit `HardwareProfile` identities and revisions. A binding may be a set only when the profile contract declares each member explicitly and applies the same validated installation behavior to each member.

The following are not valid bindings:

```text
S905W
MXQ Pro
Android TV Box
similar board
same advertised RAM
same commercial model
```

The binding must reference the canonical Hardware Profile identity, profile revision, effective scope and compatibility contract used for the resolution.

### 3.3 No compatibility decision by the profile

An Installation Profile may declare required capabilities and constraints for execution. These declarations are inputs to compatibility evaluation and preflight; they do not turn the profile into the compatibility authority.

The profile cannot promote `UNKNOWN`, `UNSUPPORTED` or `BLOCKED` hardware to an installable state.

### 3.4 Exactly one effective result

For a Production installation request, resolution shall produce exactly one effective Installation Profile for the resolved Hardware Profile, scope, target state and instant.

The following outcomes are explicit failures, not selection opportunities:

```text
NO_MATCH
MULTIPLE_MATCHES
PROFILE_NOT_EFFECTIVE
PROFILE_REVOKED
PROFILE_BLOCKED
PROFILE_VERSION_UNRESOLVABLE
```

There is no nearest-profile, global-profile, inherited-profile or silent fallback behavior.

---

## 4. Canonical InstallationProfile Schema

Every published profile shall conform to this conceptual schema:

```text
InstallationProfile
|- installation_profile_id
|- installation_profile_version
|- lifecycle_state
|- owner
|- scope
|- hardware_profile_bindings[]
|- compatibility_reference
|- installation_class
|- bootstrap_requirements
|- installation_adapter
|- discovery_requirements
|- preconditions
|- boot_contract
|- storage_layout
|- partition_plan
|- artifact_set
|- edge_os_target
|- runtime_target
|- player_target
|- recovery_contract
|- ota_contract
|- identity_policy
|- data_disposition_policy
|- network_bootstrap_policy
|- validation_plan
|- migration_references[]
|- effective_period
|- integrity
|- signature
|- homologation
|- audit_metadata
```

### 4.1 Canonical identity fields

`installation_profile_id` is an opaque, producer-owned identity. `installation_profile_version` is an opaque identity for one immutable revision.

Both values shall use the producer-declared version/identity syntax. The platform shall compare them exactly and shall not infer ordering, equivalence or compatibility from their text.

### 4.2 Owner and authority

`owner` identifies the authority permitted to publish, supersede, deprecate or block the profile. Distribution through Configuration Service or another transport does not transfer ownership.

### 4.3 Scope

`scope` identifies the operational boundary in which the profile is effective. It shall use a canonical `InstallationScopeId` and shall be versioned by the owning contract.

The platform shall preserve the identity opaquely. It shall not infer inheritance, region fallback, tenant fallback or composition of scopes.

### 4.4 Hardware Profile bindings

Each `hardware_profile_bindings[]` entry shall contain at least:

```text
hardware_profile_id
hardware_profile_version
hardware_profile_scope
compatibility_contract_version
binding_reason
```

The binding is a reference, not a copy of the hardware contract. Changes to the referenced Hardware Profile do not mutate a published Installation Profile revision.

### 4.5 Compatibility reference

The profile shall identify the compatibility contract and evaluation context required to resolve it:

```text
compatibility_contract_id
compatibility_contract_version
evaluation_scope
required_result_state
```

The required result state shall be explicit. A profile cannot treat a missing or non-effective evaluation as compatible.

---

## 5. Installation Classes

An Installation Profile declares exactly one installation class:

```text
FULL
ASSISTED
EXTERNAL_BOOTSTRAP
```

### 5.1 FULL

`FULL` performs the authorized installation through the current execution environment without requiring external physical media. It is valid only when the Hardware Profile and Installation Profile prove that discovery, boot transition, writes, rollback and recovery are safe through that path.

`FULL` does not mean that every device can be installed directly from Android or from an existing operating system. The applicable adapter and boot contract must explicitly validate the path.

### 5.2 ASSISTED

`ASSISTED` requires a controlled user action, such as a reboot, recovery entry, confirmation or connection step. The profile shall declare:

```text
required_user_action
expected_pre_action_state
expected_post_action_state
confirmation_method
timeout_policy_reference
```

The action is part of the installation contract; it is not an informal instruction outside the journal.

### 5.3 EXTERNAL_BOOTSTRAP

`EXTERNAL_BOOTSTRAP` uses SD, USB, recovery media or another physical bootstrap mechanism explicitly declared by the profile. The media shall carry or securely resolve the exact signed artifacts and binding for the target Hardware Profile.

External media is a fallback installation method, not a universal requirement. A generic image or unbound media package is invalid.

---

## 6. Bootstrap Requirements

The `bootstrap_requirements` block shall state how the Installer can enter the authorized installation path:

```text
bootstrap_type
current_os_requirement
android_bootstrap
required_boot_entry
user_interaction
external_media_requirements
network_requirement
power_requirement
preservation_requirement
```

### 6.1 Android bootstrap

Android may be a bootstrap environment when the Hardware Profile and Installation Profile explicitly validate it. Android is not thereby selected as the final Edge OS.

An Android bootstrap declaration shall identify, as applicable:

```text
minimum_bootstrap_capability
required_privileges
supported_boot_transition
data_access_boundary
rollback_or_recovery_entry
validation_evidence
```

The profile shall not assume that an Android API, bootloader or write capability exists merely because the device reports an Android version.

### 6.2 SD/USB requirements

When external media is required, the profile shall declare:

```text
media_type
bootable_requirement
partition_or_filesystem_requirement
artifact_manifest_reference
media_integrity_requirement
user_action
media_removal_rule
```

If the media is optional, the profile shall state the exact condition under which it becomes required. The Installer shall not silently switch to media when the selected profile does not authorize it.

---

## 7. Installation Adapter

The `installation_adapter` identifies the mechanism that performs profile-specific operations. It shall be a versioned, signed and independently validated contract.

```text
InstallationAdapter
|- adapter_id
|- adapter_version
|- supported_installation_class
|- supported_hardware_bindings[]
|- supported_boot_operations[]
|- supported_write_operations[]
|- interruption_behavior
|- rollback_behavior
|- recovery_handoff
|- integrity
|- signature
```

An adapter may execute only when the profile binding and Compatibility Evaluation Result authorize it. The adapter cannot broaden the profile's hardware scope or replace the partition, boot or recovery plan.

Adapter implementation details are outside this document, but every externally observable safety behavior is part of the referenced adapter contract.

---

## 8. Discovery Requirements and Preconditions

The profile shall declare the discovery facts and operational preconditions required before any irreversible action.

### 8.1 Required discovery facts

The profile may require facts from these families:

```text
cpu / SoC
architecture
board and board revision
RAM
storage topology
GPU / VPU / codecs
display path
network interfaces
bootloader and boot mode
partitions
secure boot state
OS and runtime
device identity capabilities
```

Each requirement shall identify:

```text
fact_path
required_state
source_requirement
evidence_requirement
confidence_requirement
conflict_behavior
```

The Installation Profile shall not accept a human declaration as a substitute for a mandatory device fact when the Hardware Profile requires machine evidence.

### 8.2 Operational preconditions

The `preconditions` block shall declare the conditions that must be true before Provisioning begins:

```text
identity_condition
power_condition
thermal_condition
storage_condition
network_condition
backup_or_rollback_condition
user_authorization_condition
security_condition
```

An optional capability that is not required by the profile shall produce an explicit degraded result, not stop the Player or invalidate installation by inference.

### 8.3 Precondition failure

If a mandatory precondition is absent, contradictory, stale or unverifiable, the Installer shall reject or pause before destructive work. It shall record the exact failed requirement and shall not substitute a weaker requirement.

---

## 9. Boot Contract

The `boot_contract` reference defines how the provisioned system becomes bootable on the bound Hardware Profile.

It shall identify:

```text
boot_contract_id
boot_contract_version
boot_mode
bootloader_reference
secure_boot_requirement
boot_artifact_references[]
boot_configuration_reference
boot_selection_mechanism
boot_failure_behavior
```

The profile shall not assume a universal bootloader, Secure Boot implementation, partition naming scheme or boot mode. These are declared only through validated contracts for the bound hardware.

The boot contract shall define how a power loss or interrupted write is detected and how control passes to rollback or Recovery.

---

## 10. Storage and Partition Plan

The `storage_layout` and `partition_plan` are mandatory for any profile that writes persistent storage.

```text
StorageLayout
|- storage_device_binding
|- minimum_capacity
|- usable_capacity
|- filesystem_contracts[]
|- integrity_contract
|- encryption_contract
|- local_content_store_reference
|- update_staging_reference
|- journal_reference
|- recovery_reference

PartitionPlan
|- partition_scheme
|- partitions[]
|- boot_partition
|- system_partitions[]
|- runtime_partition
|- content_partition
|- configuration_partition
|- journal_partition
|- recovery_partition
|- A_B_topology
|- preserve_targets[]
|- erase_targets[]
|- migration_targets[]
```

Each partition entry shall declare its role, target binding, required capacity, write policy, integrity policy and preservation behavior.

The profile shall not create, erase or rewrite an undeclared target. If the discovered topology does not match the plan, Provisioning shall stop and report the mismatch.

### 10.1 Local Content Store

The Local Content Store is a distinct logical role. The profile shall declare whether content is preserved, migrated, revalidated or explicitly erased. System provisioning shall not erase content as an implicit side effect.

### 10.2 A/B topology

If A/B is present, the profile shall identify active and inactive slot roles, slot-selection behavior and rollback evidence. If A/B is absent, the profile shall reference a validated non-A/B rollback or Recovery mechanism.

---

## 11. Artifact Set

The `artifact_set` shall identify the exact artifacts required by this Installation Profile:

```text
artifact_manifest_reference
edge_os_artifacts[]
boot_artifacts[]
runtime_artifacts[]
player_artifacts[]
web_engine_artifacts[]
configuration_artifacts[]
recovery_artifacts[]
rollback_artifacts[]
artifact_digests[]
artifact_signatures[]
```

The manifest is authoritative for the package. The Installation Profile may reference an authorized manifest, but it shall not alter the manifest or choose an artifact by filename, version text, commercial name or SoC alone.

Artifact availability, signature, digest, profile binding and revocation shall be validated before any irreversible write.

---

## 12. Edge OS, Runtime and Player Targets

The profile shall reference the target contracts without redefining them:

```text
edge_os_contract_id
edge_os_contract_version
edge_os_implementation_reference
runtime_contract_id
runtime_contract_version
player_contract_id
player_contract_version
web_engine_contract_id
web_engine_contract_version
```

The target must be compatible with the bound Hardware Profile's memory, storage, display, GPU/VPU, codec, boot, offline and recovery capabilities.

The profile may reference a concrete base or implementation only after that base has passed the Edge OS, security, recovery, OTA and homologation gates. Referencing a candidate base does not promote it to a normative platform choice.

---

## 13. Recovery and OTA Contracts

### 13.1 Recovery

The profile shall reference exactly one effective Recovery Plan for each supported installation path:

```text
recovery_plan_id
recovery_plan_version
recovery_entry
known_good_reference
rollback_mechanism
power_loss_behavior
manual_intervention_path
```

Recovery owns recovery execution and its state machine. The Installation Profile supplies the binding and prerequisites; it does not reimplement Recovery.

### 13.2 OTA

The profile shall reference the OTA contract and the target update context:

```text
ota_contract_id
ota_contract_version
update_manifest_scope
anti_downgrade_policy_reference
key_policy_reference
content_update_policy_reference
```

The profile shall not grant OTA permission to a device whose Hardware Profile or lifecycle state is not authorized. OTA performs its own compatibility and manifest evaluation.

---

## 14. Identity Policy

The `identity_policy` shall state how identity is created, preserved and recovered:

```text
identity_mode
identity_capability_requirement
identity_creation_reference
identity_persistence_target
identity_preservation_rule
identity_migration_reference
identity_reset_authorization
```

Allowed identity modes shall be explicit:

```text
CREATE_ON_FIRST_PROVISIONING
PRESERVE_EXISTING
MIGRATE_BY_EXPLICIT_CONTRACT
```

Installation shall not change `EdgeInstallationId` or `DeviceKey` implicitly. Identity reset or migration is a separate authorized operation, journaled and represented in the result.

---

## 15. Data-Disposition Policy

The profile shall declare how existing data is treated:

```text
PRESERVE
MIGRATE
ERASE_BY_EXPLICIT_AUTHORIZATION
```

For every target role, the policy shall state:

```text
target
current_state_requirement
allowed_operation
backup_requirement
verification_requirement
failure_behavior
```

`PRESERVE` is the default for identity, configuration and Local Content Store unless a separate authorized migration says otherwise. An empty policy is not permission to erase.

---

## 16. Network Bootstrap Policy

The profile shall declare the minimum network behavior required during installation and the behavior after completion:

```text
bootstrap_network_requirement
configuration_method
credential_handling_reference
offline_allowed
online_confirmation_requirement
failure_behavior
```

Credentials and secret material shall not be embedded in the public profile. They shall be supplied through the authorized provisioning mechanism and never persisted outside the declared secure target.

Network availability is not a universal installation prerequisite. Offline continuation is valid only when all artifacts, authorization, integrity data and recovery dependencies are available locally and the profile explicitly permits it.

---

## 17. Validation Plan

The `validation_plan` shall define the deterministic gates for preflight, provisioning and post-installation confirmation:

```text
preflight_checks[]
write_checks[]
boot_checks[]
edge_os_health_checks[]
runtime_health_checks[]
player_health_checks[]
identity_checks[]
storage_checks[]
recovery_checks[]
ota_readiness_checks[]
completion_criteria[]
```

Each check shall identify:

```text
check_id
required_or_optional
input_reference
success_condition
failure_code
retryability
recovery_action
evidence_output
```

Optional collector or peripheral absence shall be represented as an explicit capability result. It shall not invalidate core playback or provisioning unless the profile marks that capability as mandatory.

### 17.1 Installation completion

An installation may be reported as successful only when the target boots the exact declared artifact set, presents the expected identity and Hardware Profile, passes required OS/Runtime/Player health checks, persists configuration and records an immutable `InstallationResult`.

### 17.2 Partial and failed outcomes

The profile shall distinguish:

```text
COMPLETED
DEGRADED_COMPLETED
PAUSED
ROLLED_BACK
RECOVERY_REQUIRED
FAILED
CANCELLED
```

`DEGRADED_COMPLETED` is valid only when the profile explicitly marks the missing capability as optional and the core completion criteria remain true.

---

## 18. Profile Lifecycle

Each revision has exactly one lifecycle state:

```text
CANDIDATE
EXPERIMENTAL
PRODUCTION
DEPRECATED
BLOCKED
```

### 18.1 CANDIDATE

The profile schema and references may be under preparation. It cannot be used for automatic production installation.

### 18.2 EXPERIMENTAL

The profile may be used only under explicit controlled authorization and declared experiment scope. It shall produce clearly marked experimental results and cannot silently create Production installations.

### 18.3 PRODUCTION

The profile passed all mandatory homologation gates and may be used for authorized Production installation within its effective scope.

### 18.4 DEPRECATED

Deprecated profiles remain historically valid and may continue to support explicitly authorized maintenance or migration. Deprecation does not change the profile's behavior or mutate its revision.

### 18.5 BLOCKED

Blocked profiles shall not be selected for new installations or automatic OTA. Existing historical results remain valid. Unblocking requires a new reviewed revision; a blocked revision is never edited in place.

### 18.6 Lifecycle transitions

```text
CANDIDATE
    |
    v
EXPERIMENTAL
    |
    v
PRODUCTION
    |
    v
DEPRECATED
```

`BLOCKED` may be entered from any non-terminal lifecycle state when a safety, integrity, compatibility or security condition requires immediate suspension. A blocked revision does not return to an earlier state; a new revision must pass the applicable gates.

---

## 19. Versioning, Effectivity and Immutability

### 19.1 Immutable revisions

An effective Installation Profile revision is append-only. Changes to any behaviorally relevant field require a new `installation_profile_version` and a new signed publication.

Historical revisions, installation results and evidence shall not be rewritten.

### 19.2 Supersession

Each revision shall state:

```text
supersedes_reference
superseded_by_reference, when known
change_reason
change_scope
migration_requirement
```

Supersession does not alter already completed installations or historical results.

### 19.3 Effective periods

For the same `(installation_profile_id, scope, Hardware Profile binding)` there shall be at most one effective Production revision at any instant.

Activation of a new revision is atomic within the applicable scope. There is no partial rollout represented as one effective revision; rollout segmentation belongs to an explicit scope or deployment contract.

### 19.4 Compatibility of versions

Version values are identities, not numbers. Consumers shall use exact declared references and an explicit compatibility contract. No component may infer that a newer or older text value is compatible.

---

## 20. Integrity, Signature and Revocation

The profile shall contain:

```text
canonical_serialization
profile_hash
signature_algorithm_reference
signing_key_reference
signature
publication_certificate_reference
revocation_reference
```

The canonical serialization and hash shall be calculated over the exact profile content excluding the signature field according to the declared serialization contract.

The Installer and Provisioning shall verify:

- profile integrity;
- signature validity;
- signing-key lifecycle;
- effective period;
- revocation state;
- referenced Hardware Profile integrity and lifecycle;
- referenced adapter, boot, Recovery and artifact contracts.

A valid signature does not make a `BLOCKED`, revoked, expired or otherwise non-effective profile usable.

---

## 21. Installer Contract

The Installer shall:

1. obtain a sealed Discovery record;
2. obtain the Compatibility Evaluation Result;
3. verify the exact Hardware Profile reference;
4. resolve the exact Installation Profile for scope and requested state;
5. verify profile signature, effectivity and revocation;
6. verify all declared prerequisites and artifacts;
7. present the selected profile and material data disposition to the user or authorized controller;
8. create a journaled installation operation;
9. invoke Provisioning with the immutable profile reference;
10. record the resulting `InstallationResult`.

The Installer shall stop before destructive work when any required resolution step fails.

---

## 22. Provisioning Contract

Provisioning shall receive exactly one effective Installation Profile reference and an immutable plan derived from it.

Provisioning shall execute only values declared by the profile for:

```text
installation class
adapter
boot
storage
partitioning
artifacts
identity
network
rollback
recovery
validation
```

It may validate internal consistency and report a failure, but it may not replace the profile with another profile, choose undeclared storage targets or downgrade a mandatory condition to optional.

Provisioning retries and resumes shall preserve the same operation identity and profile revision.

---

## 23. Migration Between Installation Profiles

An installation may move from one Installation Profile to another only through an explicit migration contract.

```text
InstallationProfileMigration
|- migration_id
|- source_profile_reference
|- target_profile_reference
|- source_hardware_binding
|- target_hardware_binding
|- preconditions
|- data_disposition
|- identity_policy
|- artifact_manifest_reference
|- rollback_or_recovery_reference
|- validation_plan
|- authorization
|- signature
```

Migration shall prove that:

- the target Hardware Profile is explicitly compatible;
- the target Installation Profile is effective and authorized;
- identity preservation or migration is explicit;
- data preservation or transformation is explicit;
- rollback or Recovery is available;
- post-migration health criteria are defined.

No automatic migration occurs merely because a target profile has a higher version value or is marked preferred by an external system.

---

## 24. Homologation Criteria

An Installation Profile may be promoted to `PRODUCTION` only when the evidence set proves, for every bound Hardware Profile and scope:

```text
discovery binding reproduced
compatibility evaluation accepted
installation path repeatable
adapter behavior validated
boot success validated
partition and storage safety validated
identity creation/preservation validated
data-disposition behavior validated
Edge OS health validated
Runtime health validated
Player/Web Engine health validated
Recovery path validated
rollback path validated
power-loss behavior validated
offline behavior validated, when declared
OTA binding validated
signature and revocation checks validated
retry/resume idempotency validated
logs and evidence sealed
```

The homologation record shall include test versions, exact profile revisions, artifact digests, environment, timestamps, failures and reviewer/approval references.

No production profile may be promoted solely from a successful installation on a commercially similar device.

---

## 25. Telemetry and Evidence

The Installer and Provisioning shall emit structured records for:

```text
installation_profile_resolution_started
installation_profile_resolved
installation_profile_rejected
preconditions_validated
artifacts_validated
bootstrap_started
provisioning_started
profile_checkpoint_completed
profile_checkpoint_failed
profile_rollback_started
profile_recovery_handoff
profile_validation_completed
installation_completed
installation_degraded
installation_failed
```

Each record shall reference:

```text
operation_id
installation_profile_id
installation_profile_version
hardware_profile_id
hardware_profile_version
compatibility_result_reference
state
timestamp
result
evidence_reference
```

Telemetry does not create Evidence of playback. It records the installation process and references its own technical evidence. Playback facts remain owned by Playback and Evidence remains materialized by Evidence Ledger.

---

## 26. Error Catalog

The following error identities are normative for the Installation Profile boundary:

```text
INSTALLATION_PROFILE_REQUEST_INCOMPLETE
INSTALLATION_PROFILE_DISCOVERY_MISSING
INSTALLATION_PROFILE_COMPATIBILITY_MISSING
INSTALLATION_PROFILE_HARDWARE_BINDING_MISMATCH
INSTALLATION_PROFILE_NO_MATCH
INSTALLATION_PROFILE_MULTIPLE_MATCHES
INSTALLATION_PROFILE_NOT_EFFECTIVE
INSTALLATION_PROFILE_VERSION_UNRESOLVABLE
INSTALLATION_PROFILE_REVOKED
INSTALLATION_PROFILE_BLOCKED
INSTALLATION_PROFILE_SIGNATURE_INVALID
INSTALLATION_PROFILE_INTEGRITY_INVALID
INSTALLATION_PROFILE_ADAPTER_UNSUPPORTED
INSTALLATION_PROFILE_BOOT_CONTRACT_INVALID
INSTALLATION_PROFILE_STORAGE_PLAN_INVALID
INSTALLATION_PROFILE_ARTIFACT_MISSING
INSTALLATION_PROFILE_ARTIFACT_MISMATCH
INSTALLATION_PROFILE_PRECONDITION_FAILED
INSTALLATION_PROFILE_DATA_POLICY_AMBIGUOUS
INSTALLATION_PROFILE_IDENTITY_POLICY_INVALID
INSTALLATION_PROFILE_RECOVERY_MISSING
INSTALLATION_PROFILE_OTA_BINDING_INVALID
INSTALLATION_PROFILE_VALIDATION_FAILED
INSTALLATION_PROFILE_MIGRATION_UNAUTHORIZED
INSTALLATION_PROFILE_OPERATION_CONFLICT
```

Each implementation shall map an error to phase, retryability, recoverability, user-visible explanation and required action in the applicable contract version. It shall not silently reinterpret an error as a different profile or successful installation.

---

## 27. Security and Safety Invariants

An Installation Profile implementation shall:

- refuse unsigned, altered, revoked or blocked profiles;
- bind every destructive action to the exact profile revision;
- preserve identity unless explicit identity policy authorizes migration or reset;
- protect secrets and credentials from profile publication;
- preserve declared content and configuration targets;
- journal irreversible steps before acknowledging them;
- provide a validated rollback or Recovery path;
- stop safely on ambiguous discovery, storage, boot or artifact state;
- never fall back to an arbitrary image or adapter;
- retain immutable results and evidence.

Security controls may be strengthened by the security contract, but may not weaken these profile invariants.

---

## 28. Normative Requirements

### IP-001

An Installation Profile shall be immutable, versioned, signed and explicitly effective before use.

### IP-002

Installation Profile Resolution shall occur only after a sealed Discovery record, Compatibility Evaluation Result and exact Hardware Profile are available.

### IP-003

An Installation Profile shall not decide hardware compatibility or select a Hardware Profile by inference.

### IP-004

Production resolution shall produce exactly one effective profile or an explicit failure.

### IP-005

Commercial model names, SoC families and advertised capabilities shall never be sufficient profile bindings.

### IP-006

Each profile shall declare exactly one installation class: `FULL`, `ASSISTED` or `EXTERNAL_BOOTSTRAP`.

### IP-007

Android may be used only as an explicitly validated bootstrap environment and shall not be inferred to be the final Edge OS.

### IP-008

SD/USB or another external medium shall be required only when the selected profile explicitly authorizes it.

### IP-009

Every persistent write target, partition, artifact, boot operation and recovery path shall be declared by the profile or its referenced signed contract.

### IP-010

Local Content Store, identity and configuration shall have explicit preservation, migration or erase policies.

### IP-011

Every Production profile shall reference validated boot, Recovery and rollback contracts.

### IP-012

Identity shall not change without an explicit identity migration or reset operation.

### IP-013

Profile lifecycle state shall be explicit; `BLOCKED` and `DEPRECATED` revisions shall not be selected for unauthorized new operations.

### IP-014

Changes to behaviorally relevant profile data shall create a new immutable revision.

### IP-015

At most one effective Production revision may exist for the same profile identity, scope and Hardware Profile binding at an instant.

### IP-016

Provisioning shall execute the resolved profile and shall not choose a replacement profile or undeclared default.

### IP-017

Migration between Installation Profiles shall require an explicit signed migration contract.

### IP-018

Production promotion shall require the homologation evidence defined by this specification.

### IP-019

Retry and resume shall preserve the same operation identity and profile revision.

### IP-020

Every terminal operation shall produce an immutable result that identifies the profile, hardware binding, artifacts, identity outcome, validation outcome and final state.

---

## 29. Relationship to Other Specifications

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
        +--> EDGE_OTA.md
```

`EDGE_INSTALLATION_PROFILES.md` is the missing contract between a validated Hardware Profile and the execution contracts. It does not modify the authority or semantics of the documents above; it makes their referenced Installation Profile explicit and auditable.

---

## 30. Concrete Profile Creation Is Deferred

This document defines how a profile is created and homologated. It does not create a profile for MXQ Pro, TV Box, Armbian, Rockchip, Amlogic or any other concrete device.

A concrete profile may be published only after:

```text
real Hardware Discovery
        |
        v
Compatibility Evaluation
        |
        v
validated Hardware Profile
        |
        v
Installation Profile candidate
        |
        v
homologation evidence
        |
        v
EXPERIMENTAL or PRODUCTION publication
```

Until that process succeeds, the device remains a candidate and no Installer or Provisioning implementation may treat it as an authorized production target.

---

## 31. Completion Criteria

This specification is complete for downstream design when an implementer can determine, without inventing behavior:

- which exact Hardware Profile must be resolved first;
- how one Installation Profile is selected for a scope;
- which installation method and adapter are authorized;
- which boot, storage, partition, artifact and OS contracts apply;
- how identity and existing data are handled;
- which Recovery and OTA contracts are bound;
- which preconditions and health gates are mandatory;
- how lifecycle, signature, revocation and versioning work;
- how Installer and Provisioning divide responsibility;
- how migration, retry, failure and evidence are represented.

Any implementation-specific value not declared by the profile or its referenced contract is an explicit profile gap and shall block the affected operation rather than be inferred.

---

## 32. Next Review

After this document is reviewed, the dependency chain shall be audited as:

```text
Compatibility
    -> Discovery
    -> Hardware Profiles
    -> Installation Profiles
    -> Installer
    -> Provisioning
    -> Recovery
    -> Edge OS
    -> OTA
    -> Security
```

No security contract shall assume an Installation Profile behavior that is absent from this document. A concrete profile remains blocked until its discovery, compatibility and homologation evidence are available.
