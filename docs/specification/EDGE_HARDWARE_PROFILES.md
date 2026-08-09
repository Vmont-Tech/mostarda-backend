# Mostarda Edge — Hardware Profile Specification

**Status:** DRAFT  
**Version:** 1.0.0  
**Owner:** Mostarda Architecture  
**Prerequisites:** `EDGE_HARDWARE_COMPATIBILITY.md`, `EDGE_HARDWARE_DISCOVERY.md`  
**Related ADR:** ADR-010 — Edge Hardware and Provisioning  
**Scope:** canonical hardware profiles, profile lifecycle and homologation

---

## 1. Purpose

This document defines how a sealed `HardwareDiscoveryRecord` becomes a versioned, integrity-protected and homologable `HardwareProfile`.

It defines:

- the canonical Hardware Profile schema;
- hardware identity and fingerprint rules;
- capability and limit representation;
- provenance from Hardware Discovery;
- profile creation and publication criteria;
- lifecycle states and transitions;
- versioning and revision rules;
- homologation evidence;
- associations with Installation Profiles, Player, Web Engine, codecs, boot, recovery and OTA;
- known incompatibilities and blocking behavior;
- profile integrity, signature and auditability.

This document does not define how an Installation Profile is implemented. It only defines the explicit reference from a Hardware Profile to one or more authorized Installation Profiles.

No concrete profile is created by this document. In particular, the MXQ Pro 4K 5G remains a laboratory candidate until a real discovery run and the complete homologation process have succeeded.

---

## 2. Architectural Boundary

A Hardware Profile is a validated description of a hardware configuration. It is not a commercial product listing, an installation procedure, an operating-system image or a compatibility guess.

```text
HardwareDiscoveryRecord
        │
        ├── sealed facts
        ├── provenance
        ├── evidence
        └── conflicts and missing requirements
                │
                ▼
        Hardware Profile creation
                │
                ├── Compatibility contract
                ├── Homologation evidence
                ├── Player capability references
                ├── Boot/Recovery/OTA references
                └── InstallationProfile references
```

The Hardware Profile owns the identity and validated capability contract of a hardware configuration.

The following concerns remain outside its ownership:

- `Hardware Discovery` owns collection and provenance of observations;
- `Compatibility Engine` evaluates eligibility against the compatibility contract;
- `Installation Profile` owns provisioning parameters and procedure;
- `Installation Adapter` executes a profile-specific mechanism;
- `Player` owns playback behavior;
- `Edge OS` owns the product operating-system envelope;
- `Recovery` owns recovery execution;
- `OTA` owns update execution.

A Hardware Profile may reference these contracts, but it shall not redefine their internal behavior.

---

## 3. Profile Identity Principle

The profile identity is based on a verified hardware configuration, not on a commercial name.

```text
Commercial Device Name
        ≠
Hardware Fingerprint
        ≠
Hardware Profile Identity
```

The following shall never be the sole basis for a profile:

```text
manufacturer name
commercial model name
CPU marketing name
Android build fingerprint
advertised RAM or storage
photograph or label
human declaration
```

A commercial name may be retained as descriptive metadata or an observed declaration. It shall not determine profile identity, capability values or lifecycle state.

---

## 4. Canonical HardwareProfile Schema

Every published profile shall conform to the following conceptual structure:

```text
HardwareProfile
├── profile_id
├── profile_version
├── lifecycle_state
├── owner
├── hardware_identity
├── discovery_reference
├── capability_set
├── operational_limits
├── compatibility_reference
├── homologation
├── runtime_references
├── installation_profile_references
├── known_incompatibilities
├── effective_period
├── integrity
└── audit_metadata
```

### 4.1 `profile_id`

`profile_id` is an opaque, canonical identity for the hardware configuration boundary represented by the profile.

It shall not be derived solely from a commercial model name. It shall remain stable only while the hardware identity boundary and the mandatory capability contract remain the same.

### 4.2 `profile_version`

`profile_version` identifies a published revision of the profile. It is an opaque producer-owned value and shall be compared by exact identity.

Each published revision is immutable. A correction, evidence renewal or capability change creates a new revision; it never edits the prior revision.

### 4.3 `lifecycle_state`

The profile shall have exactly one lifecycle state:

```text
CANDIDATE
EXPERIMENTAL
PRODUCTION
PREFERRED
DEPRECATED
BLOCKED
```

Lifecycle state is not inferred from a device report. It is assigned only by the profile governance process after the required evidence exists.

### 4.4 `owner`

The profile owner is the authority responsible for publishing, revising, suspending and auditing the profile. The owner does not acquire authority over discovery, installation or playback behavior.

### 4.5 `hardware_identity`

`hardware_identity` contains the canonical identity fields that distinguish this configuration from other configurations:

```text
architecture
soc_vendor
soc_family
soc_model
soc_revision
board_identifier
board_revision
hardware_fingerprint
```

Each field shall reference its source fact and evidence.

### 4.6 `discovery_reference`

The profile shall reference the sealed discovery material used to construct it:

```text
discovery_id
discovery_record_hash
discovery_schema_version
collector_version
evidence_root
sealed_at
```

### 4.7 `capability_set`

The capability set describes only capabilities observed and validated for this profile. It shall include provenance references for each material capability.

### 4.8 `operational_limits`

Operational limits express validated boundaries, such as maximum resolution, sustained workload, usable storage and tested thermal envelope. They are not marketing claims and shall include test evidence.

### 4.9 `compatibility_reference`

The profile shall reference the compatibility specification version and the compatibility evaluation result under which it was created.

### 4.10 `homologation`

The profile shall reference the homologation plan, test suite, test versions, results, timestamps, environment and evidence for every mandatory category.

### 4.11 `runtime_references`

The profile may reference validated Edge OS, Runtime, Player, Web Engine, codec, boot, recovery and OTA contracts. A reference is not an implementation definition.

### 4.12 `installation_profile_references`

The profile may reference one or more explicitly authorized `InstallationProfile` identities. These references do not define the installation method and shall not be interpreted as permission to choose an adapter implicitly.

### 4.13 `known_incompatibilities`

Known incompatibilities are explicit constraints or failure conditions that prevent a profile from being used for a declared scope.

### 4.14 `effective_period`

The effective period identifies when a published profile revision may be used for operational evaluation. Profile revisions shall not overlap ambiguously for the same identity and scope.

### 4.15 `integrity`

The integrity block shall contain a canonical serialization digest and publication signature metadata.

### 4.16 `audit_metadata`

Audit metadata shall include creation reason, reviewer references, approval evidence, publication time and supersession references.

---

## 5. Hardware Identity and Fingerprint

### 5.1 Fingerprint purpose

The hardware fingerprint identifies the physical configuration relevant to compatibility, provisioning safety and operational behavior.

It is not required to expose every hardware detail. It must include every identity dimension whose change could invalidate a profile's capability, boot, recovery, update or security assumptions.

### 5.2 Fingerprint inputs

The fingerprint shall be derived from validated facts such as:

```text
architecture
soc_vendor
soc_family
soc_model
soc_revision
board_identifier
board_revision
bootloader_identity
boot_mode
device_tree_identity
storage topology
GPU/VPU identity
display pipeline identity
secure boot state
```

The profile shall preserve the individual components in addition to the derived fingerprint.

### 5.3 Fingerprint derivation

Fingerprint derivation shall be deterministic and versioned.

The profile shall record:

```text
fingerprint_algorithm_version
canonical_input_set
excluded_input_set, if any
fingerprint_value
```

A fingerprint algorithm change creates a new profile revision or profile identity according to Section 11.

### 5.4 Identity sufficiency

A fingerprint is sufficient only when:

- all mandatory identity facts are present;
- mandatory identity facts are normalized;
- no mandatory identity conflict remains;
- evidence integrity is valid;
- the target identity is bound to the discovery record;
- the fingerprint can be reproduced from the sealed record.

If any condition fails, a profile shall not be promoted to Production.

---

## 6. Capability Set

The capability set shall mirror the capability families defined by the compatibility and discovery specifications.

### 6.1 Compute

The profile shall record validated:

```text
cpu.architecture
cpu.core_count
soc.vendor
soc.family
soc.model
soc.revision
```

### 6.2 Memory and Storage

The profile shall record:

```text
memory.ram.total
memory.ram.usable
storage.nominal
storage.usable
storage.reserved
storage.partition_layout
```

Only usable storage available to the Edge installation counts toward eligibility. The profile shall not copy nominal manufacturer capacity as usable capacity.

### 6.3 GPU, VPU and Codecs

The profile shall record validated:

```text
gpu.model
gpu.driver
vpu.model
vpu.decode_capabilities
codec_capabilities[]
```

Every production codec capability shall reference playback evidence for the profile.

### 6.4 Display

The profile shall record:

```text
display.connectors
display.maximum_resolution
display.refresh_rates
display.initialization_behavior
display.hdcp_state, if applicable
```

### 6.5 Network and Peripherals

The profile shall record validated network and peripheral characteristics:

```text
ethernet
wifi
usb
driver_identity
reconnection_behavior
```

Optional capabilities shall be marked optional. Their absence shall not be converted into an unsupported mandatory capability.

### 6.6 Boot, Recovery and Security

The profile shall record references to validated:

```text
boot_path
bootloader
kernel_requirements
device_tree_requirements
secure_boot_state
recovery_path
rollback_capability
```

The profile shall not claim a secure or recoverable path from a declaration alone.

### 6.7 Identity

The profile shall record validated identity capabilities:

```text
edge_installation_id
device_key
key_storage
attestation
persistence_across_update
persistence_across_recovery
revocation
```

MAC address is not a profile identity field.

---

## 7. Operational Limits

Operational limits are tested boundaries, not guarantees beyond the tested scope.

Each limit shall contain:

```text
limit_name
value
unit
scope
test_reference
test_environment
confidence
observed_at
```

Examples:

```text
maximum_validated_resolution
maximum_validated_frame_rate
minimum_usable_storage
maximum_sustained_temperature
validated_network_recovery_time
validated_continuous_playback_window
```

A profile shall not claim a limit that is absent from evidence or that was inferred solely from a component datasheet.

---

## 8. Relationship With HardwareDiscoveryRecord

### 8.1 Required input

A profile may be created only from a `SEALED` discovery record.

The discovery record must provide, at minimum:

- target identity binding;
- normalized mandatory identity facts;
- valid evidence references;
- no unresolved mandatory identity conflict;
- a reproducible record hash;
- discovery schema and collector versions.

### 8.2 Provenance preservation

The profile shall reference the source fact for every material identity and capability field.

It shall not silently duplicate a value without retaining:

```text
fact_id
source
evidence
confidence
observed_at
normalized_value
```

### 8.3 Snapshot semantics

The profile contains a validated snapshot of the configuration at the time of homologation. It is not a live telemetry projection.

New discovery observations do not mutate a published profile. They may trigger a new profile revision, suspension, deprecation or blocking review.

### 8.4 Discovery conflict

If the discovery record is `CONFLICTED` for a mandatory identity or capability, profile creation shall stop. A profile shall not resolve the conflict by choosing one source without a documented resolution process and new evidence.

---

## 9. Profile Creation Criteria

Profile creation is a controlled publication process.

### 9.1 Candidate creation

A `CANDIDATE` profile may be drafted only when:

- the discovery record is sealed;
- the hardware identity boundary is explicit;
- the compatibility contract is referenced;
- minimum identity and capability facts are present;
- unresolved mandatory conflicts are absent or explicitly marked as blocking;
- the profile is clearly labeled `CANDIDATE`;
- no installation or production authorization is implied.

### 9.2 Candidate contents

A candidate shall include the complete known schema, including explicit unknown or unvalidated fields. Missing fields shall not be omitted in a way that suggests validation.

### 9.3 Prohibited creation paths

A profile shall not be created solely from:

- a product name such as `MXQ Pro 4K 5G`;
- a guessed SoC family;
- a copied profile from a similar board;
- advertised RAM or storage;
- an Android build fingerprint;
- an unverified photograph or label;
- a human declaration without machine evidence.

### 9.4 Candidate review

Creation shall record the reviewer, source discovery run, profile reason and unresolved limitations. The profile remains non-operational until the lifecycle gate permits its use.

---

## 10. Compatibility and Homologation Gates

A profile lifecycle state must be supported by evidence from the compatibility and homologation requirements.

### 10.1 Discovery gate

Confirm:

- identity binding;
- board and revision;
- SoC and architecture;
- RAM and usable storage;
- GPU/VPU and display;
- boot and recovery observations;
- network and peripheral observations;
- evidence integrity.

### 10.2 Compatibility gate

The Compatibility Engine shall evaluate the sealed discovery record against the compatibility specification. A profile shall retain the evaluation result and its policy/version references.

The profile shall not replace the Compatibility Engine's decision with a local interpretation.

### 10.3 Boot gate

The profile shall reference evidence for cold boot, warm reboot, power cycle, normal startup and repeated boot behavior.

### 10.4 Player gate

The profile shall reference the validated Player environment, Web Engine identity, rendering path and supported codec tests.

### 10.5 Offline gate

For Production, the profile shall reference evidence of content persistence, continued playback during network loss and synchronization after reconnection.

### 10.6 Update and recovery gate

For Production, the profile shall reference validated update compatibility, interrupted update behavior, rollback, recovery and identity/configuration preservation.

### 10.7 Thermal and long-run gate

For Production, the profile shall reference representative long-run and thermal evidence under the intended workload.

### 10.8 Security and identity gate

For Production, the profile shall reference device identity persistence, key handling, secure update validation and the applicable trust-chain evidence.

---

## 11. Versioning and Hardware Revisions

### 11.1 Independent identities

The following identities are distinct:

```text
profile_id
profile_version
hardware_revision
discovery_id
collector_version
homologation_plan_version
```

They shall not be conflated.

### 11.2 Profile revision

A new `profile_version` under the same `profile_id` is appropriate when the hardware identity boundary remains unchanged and the published profile changes without creating a different hardware capability contract.

Examples:

- renewed homologation evidence for the same exact configuration;
- correction of descriptive metadata with no behavior change;
- addition of a non-mandatory evidence reference;
- updated owner or audit metadata.

### 11.3 New profile identity

A new `profile_id` is required when a change can alter compatibility, provisioning safety, boot, recovery, OTA, security, Player behavior or mandatory capabilities.

Examples:

- a different board revision;
- a different storage topology that changes usable capacity or partition behavior;
- a different bootloader or device-tree contract;
- a changed GPU/VPU or codec path;
- a changed secure boot or key-storage boundary;
- a changed recovery or rollback capability;
- a hardware revision whose thermal behavior is materially different.

The profile shall not hide such a change in a metadata-only revision.

### 11.4 Same commercial name, different hardware

Two devices with the same commercial name shall have different profile identities whenever their verified fingerprints or mandatory capabilities differ.

### 11.5 Same board, different software

A software or runtime difference that changes the validated Player, boot, recovery, OTA or security contract shall be represented by a new profile revision or profile identity according to the materiality rules above. The profile shall reference the exact software contract versions used for homologation.

### 11.6 Version immutability

Published profiles and their lifecycle history are append-only. A later revision supersedes but does not rewrite the prior revision.

---

## 12. Lifecycle States

The lifecycle is:

```text
CANDIDATE
    ↓
EXPERIMENTAL
    ↓
PRODUCTION
    ↓
PREFERRED
```

From any operational state, a profile may transition to:

```text
DEPRECATED
BLOCKED
```

### 12.1 CANDIDATE

The profile schema and identity are drafted from sealed discovery evidence. Candidate profiles are not automatically provisionable and do not authorize production use.

### 12.2 EXPERIMENTAL

The profile has met the experimental eligibility gate and may be used only for laboratory testing, controlled pilots or engineering validation.

Experimental profiles shall carry explicit limitations and shall not enter the production catalog automatically.

### 12.3 PRODUCTION

The profile has passed all mandatory compatibility and homologation gates and may be referenced by an authorized production Installation Profile.

Production state does not authorize an installer by itself. Installation still requires an explicit Installation Profile and provisioning authorization.

### 12.4 PREFERRED

The profile exceeds the minimum production requirements and is recommended for new deployments. Preferred does not alter functional behavior or compatibility semantics.

### 12.5 DEPRECATED

The profile is no longer recommended for new deployments. Existing installations may remain operational according to the applicable lifecycle and safety policy.

### 12.6 BLOCKED

The profile is prohibited from new provisioning because an unacceptable risk or incompatibility was identified.

Blocked profiles shall not be automatically provisioned, even if an older revision was previously Production.

---

## 13. Lifecycle Transition Rules

### 13.1 Candidate → Experimental

Requires:

- sealed discovery record;
- valid identity and fingerprint;
- minimum experimental RAM and usable storage;
- supported architecture;
- bootable Edge OS path;
- basic Player path;
- explicit experimental limitations;
- review and signed publication.

### 13.2 Experimental → Production

Requires all mandatory compatibility and homologation gates, including boot, Player, codecs, display, network, thermal, offline, OTA, rollback, recovery, identity and long-run stability.

### 13.3 Production → Preferred

Requires:

- production stability;
- adequate performance margin;
- preferred RAM/storage profile or equivalent validated margin;
- favorable operational characteristics;
- no unresolved critical issue.

### 13.4 Any state → Deprecated

Requires a lifecycle decision that the profile shall no longer be selected for new deployments. The reason, effective time and replacement guidance shall be recorded.

### 13.5 Any operational state → Blocked

Requires evidence of a security, integrity, recovery, update, playback, thermal, identity or other risk that prevents safe provisioning or operation.

Blocking takes effect for new automatic provisioning immediately after publication of the blocking revision. Existing-device handling is governed by the applicable operational policy and shall not silently reactivate the profile.

---

## 14. Known Incompatibilities

Each known incompatibility shall include:

```text
incompatibility_id
profile_id
affected_revision
condition
evidence_reference
severity
blocked_operations
first_observed_at
status
```

Examples include:

- unstable display initialization;
- unsupported codec or resolution;
- thermal throttling under continuous playback;
- identity loss after update;
- unsafe bootloader behavior;
- unrecoverable update;
- storage corruption;
- unstable network driver;
- board revision ambiguity;
- missing secure update path.

Known incompatibilities shall not be hidden in free-form notes when they affect lifecycle or provisioning.

---

## 15. Player, Web Engine and Codec Associations

The Hardware Profile shall identify the exact validated Player execution environment through references:

```text
player_contract_id
player_contract_version
web_engine_id
web_engine_version
codec_matrix_id
codec_matrix_version
```

The profile shall record capabilities and tested limits, not implementation instructions.

An untested engine or codec shall not be treated as Production-compatible because it is theoretically available for the SoC.

A future Web Engine or codec change that alters playback, resource use, thermal behavior or recovery assumptions shall trigger profile revalidation and appropriate versioning.

---

## 16. Boot, Recovery and OTA Associations

The profile shall reference, without embedding implementation procedures:

```text
boot_contract_id
boot_contract_version
recovery_contract_id
recovery_contract_version
ota_contract_id
ota_contract_version
rollback_contract_id
rollback_contract_version
```

Each reference shall identify the validated hardware and software context.

A profile shall not be Production if any mandatory reference is absent, incompatible or unsupported for the target configuration.

---

## 17. InstallationProfile Association

Hardware Profile and Installation Profile are distinct artifacts.

```text
HardwareProfile
        │
        └── references one or more explicit InstallationProfiles
                                      │
                                      └── selected by provisioning policy
```

The association shall include:

```text
installation_profile_id
installation_profile_version
allowed_lifecycle_states
scope
compatibility_constraints
```

The association shall not:

- define installation commands;
- imply that every adapter can install the profile;
- allow a commercial name to select the adapter;
- bypass discovery or compatibility evaluation;
- turn an experimental profile into production.

An Installation Profile may be associated with multiple hardware profiles only when the association is explicitly validated for each profile.

---

## 18. Profile Integrity and Signature

### 18.1 Canonical serialization

The profile shall have a canonical serialization covering all normative fields, capability values, provenance references, lifecycle state, limitations and associations.

### 18.2 Digest

The profile shall contain:

```text
profile_hash
hash_algorithm
canonicalization_version
```

The hash shall be reproducible from the published canonical profile.

### 18.3 Signature

Published profiles shall be signed by the profile authority.

The signature block shall include:

```text
signature
signing_key_id
signature_algorithm
signed_at
verification_state
```

An unsigned or invalidly signed profile shall not be used for automatic provisioning.

### 18.4 Evidence binding

The signature shall cover the references to the discovery record, compatibility result and homologation evidence. A profile signature shall not make invalid source evidence valid.

### 18.5 Revocation and blocking

Revocation or blocking shall produce a new append-only lifecycle record. It shall not erase the prior profile history.

---

## 19. Profile Publication and Consumption

### 19.1 Publication prerequisites

Before publication, the authority shall verify:

- schema validity;
- profile identity uniqueness;
- discovery record sealed state;
- provenance completeness;
- evidence integrity;
- lifecycle transition legality;
- signature validity;
- no conflicting effective profile for the same identity and scope.

### 19.2 Installer consumption

The Installer may consume a profile only when:

- the profile signature validates;
- the profile is effective for the requested scope;
- its lifecycle state permits the requested operation;
- the target discovery record matches the profile identity and mandatory fingerprint;
- an explicit Installation Profile association exists;
- Compatibility Engine authorization is present.

### 19.3 Compatibility Engine consumption

The Compatibility Engine may use a profile as a validated target configuration, but it shall continue to inspect the current discovery record and the profile's effective compatibility constraints.

A profile is not permission to ignore current hardware facts.

### 19.4 Hardware Profile consumers

Player, OTA, Recovery, Telemetry and Operations may consume profile references to select their own validated contracts. None may mutate the profile or change its lifecycle state directly.

---

## 20. Unknown or Mismatched Hardware

When the current discovery record does not match a profile's mandatory identity or capability boundary:

```text
PROFILE_MATCH = REJECTED
```

The system shall not:

- select the nearest profile;
- ignore a board revision mismatch;
- substitute a similar SoC;
- treat a larger RAM value as proof of all other compatibility;
- use the commercial name as a fallback key;
- install a generic image;
- silently downgrade to an experimental profile.

The mismatch shall be reported with explicit reason and evidence references.

---

## 21. MXQ Pro and Initial Experimental Target

This specification does not create an MXQ Pro Hardware Profile.

The architectural status is:

```text
Amlogic S905W/GXL
        ↓
candidate family
        ↓
real Hardware Discovery
        ↓
fingerprint and capability validation
        ↓
candidate profile
        ↓
experimental homologation
```

The commercial name `MXQ Pro 4K 5G` may identify the laboratory object supplied for discovery, but it shall not be used as the profile identity.

No MXQ profile may be created until:

- the actual board and revision are discovered;
- the sealed discovery record exists;
- the fingerprint is reproducible;
- the compatibility evaluation is complete;
- the experimental homologation evidence exists;
- the profile is reviewed and signed.

---

## 22. Profile Example

The following is a structural example only. It does not represent a real or approved device:

```json
{
  "profile_id": "opaque-profile-id",
  "profile_version": "profile-v1",
  "lifecycle_state": "CANDIDATE",
  "hardware_identity": {
    "architecture": "arm64",
    "soc_vendor": "amlogic",
    "soc_family": "gxl",
    "soc_model": "s905w",
    "soc_revision": "opaque-revision",
    "board_identifier": "detected-board-reference",
    "board_revision": "detected-revision",
    "hardware_fingerprint": "opaque-fingerprint"
  },
  "discovery_reference": {
    "discovery_id": "opaque-discovery-id",
    "discovery_record_hash": "opaque-record-hash",
    "discovery_schema_version": "discovery-schema-v1",
    "collector_version": "collector-v1",
    "evidence_root": "opaque-evidence-root",
    "sealed_at": "2026-08-09T12:00:00Z"
  },
  "capability_set": {
    "ram_usable_bytes": 1073741824,
    "storage_usable_bytes": 8589934592,
    "validated_codecs": [],
    "validated_display_modes": [],
    "recovery": "UNVALIDATED"
  },
  "installation_profile_references": [],
  "known_incompatibilities": [],
  "integrity": {
    "profile_hash": "opaque-profile-hash",
    "signature": "opaque-signature",
    "verification_state": "VALID"
  }
}
```

The empty codec, display and installation references are intentional: a candidate cannot imply validation that has not occurred.

---

## 23. Failure and Blocking Rules

A profile creation or promotion shall fail explicitly when:

```text
DISCOVERY_NOT_SEALED
IDENTITY_INCOMPLETE
IDENTITY_CONFLICTED
FINGERPRINT_NOT_REPRODUCIBLE
PROVENANCE_INCOMPLETE
EVIDENCE_INVALID
COMPATIBILITY_NOT_EVALUATED
HOMOLOGATION_INCOMPLETE
SIGNATURE_INVALID
PROFILE_ID_COLLISION
UNSUPPORTED_LIFECYCLE_TRANSITION
```

A failure shall not produce a partially authorized profile.

If a previously published profile becomes unsafe, it shall transition to `BLOCKED` or `DEPRECATED` through an append-only signed lifecycle decision. It shall not be silently edited.

---

## 24. Audit and Replay

A profile audit shall be able to answer:

- which discovery record produced this profile;
- which facts and evidence support each mandatory capability;
- which compatibility contract and result were used;
- which homologation tests passed;
- which Player, Web Engine and codec contracts were validated;
- which boot, recovery and OTA contracts were referenced;
- who published and signed the profile;
- which revision superseded it;
- why it was deprecated or blocked, if applicable.

Replay of a profile publication shall reproduce the profile identity, profile version, lifecycle state, provenance references, capability values, limits, associations, integrity digest and signature metadata.

Replay shall not recollect hardware or rewrite historical profile revisions.

---

## 25. Normative Requirements

The following requirements are normative.

### HP-001

A Hardware Profile shall be created only from a sealed `HardwareDiscoveryRecord`.

### HP-002

A profile shall preserve provenance for every material identity and capability field.

### HP-003

Commercial model names shall not be sufficient to create or identify a Hardware Profile.

### HP-004

Every published profile shall have an opaque `profile_id` and immutable `profile_version`.

### HP-005

Each profile shall have exactly one lifecycle state.

### HP-006

Profile lifecycle transitions shall be explicit, valid and evidenced.

### HP-007

A profile shall not be promoted without the compatibility and homologation evidence required for its target state.

### HP-008

Mandatory identity conflicts shall prevent Production promotion.

### HP-009

A hardware revision that changes mandatory capability, boot, recovery, OTA, security or identity assumptions shall receive a new profile identity.

### HP-010

Published profile revisions shall be immutable and append-only.

### HP-011

The profile shall reference its discovery record hash, schema version, collector version and evidence root.

### HP-012

The profile shall reference the compatibility contract and evaluation context used for creation.

### HP-013

Production profiles shall reference validated Player, Web Engine and codec behavior.

### HP-014

Production profiles shall reference validated boot, recovery, OTA, rollback and identity behavior.

### HP-015

Installation Profile references shall be explicit and shall not define installation behavior inside the Hardware Profile.

### HP-016

An invalid or unsigned profile shall not authorize automatic provisioning.

### HP-017

The profile shall not resolve discovery conflicts by selecting a convenient source or inferred value.

### HP-018

A profile shall not copy nominal manufacturer RAM or storage as validated usable capacity.

### HP-019

A current discovery record that does not match the profile's mandatory fingerprint shall reject profile matching.

### HP-020

The MXQ Pro 4K 5G shall not receive a concrete Hardware Profile from this specification alone.

### HP-021

Amlogic S905W/GXL shall remain a candidate experimental family and shall not imply automatic compatibility.

### HP-022

Known incompatibilities shall be explicit, versioned and linked to evidence.

### HP-023

Profile integrity shall cover capability values, lifecycle state, provenance references and associations.

### HP-024

Profile replay shall preserve historical values and references without recollecting or mutating the source record.

### HP-025

The Hardware Profile specification shall not redefine compatibility thresholds established by `EDGE_HARDWARE_COMPATIBILITY.md`.

---

## 26. Next Specification

The next specification shall define how an authorized Hardware Profile is provisioned:

`EDGE_INSTALLER_SPECIFICATION.md`

It shall consume:

```text
EDGE_HARDWARE_COMPATIBILITY.md
EDGE_HARDWARE_DISCOVERY.md
EDGE_HARDWARE_PROFILES.md
```

It shall define the Installer contract and its safe interaction with Hardware Profiles without moving profile ownership or inventing a concrete MXQ Pro profile.
