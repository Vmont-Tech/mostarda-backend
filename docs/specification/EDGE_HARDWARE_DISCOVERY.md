# Mostarda Edge — Hardware Discovery Specification

**Status:** DRAFT  
**Version:** 1.1.0
**Owner:** Mostarda Architecture  
**Related ADR:** ADR-010 — Edge Hardware and Provisioning  
**Prerequisite:** `EDGE_HARDWARE_COMPATIBILITY.md`  
**Scope:** discovery, provenance, normalization and evidence of Edge hardware facts

---

## 1. Purpose

This document defines the normative discovery contract used to determine which hardware is actually present before provisioning, compatibility evaluation or Hardware Profile instantiation.

It defines:

- the discovery lifecycle;
- the fact envelope;
- required hardware fact families;
- source and provenance requirements;
- normalization rules;
- evidence and integrity requirements;
- confidence semantics;
- conflict and missing-data behavior;
- freshness and snapshot rules;
- the interfaces consumed by Installer, Compatibility Engine and Hardware Profile;
- the security boundary of hardware discovery.

This document does not decide whether a device is compatible. Compatibility is evaluated by the Compatibility Engine according to `EDGE_HARDWARE_COMPATIBILITY.md`.

This document does not define how a particular operating system, bootloader, kernel, Web Engine, codec, OTA mechanism or recovery implementation is built. It defines how facts about those capabilities are represented and proven.

---

## 2. Architectural Boundary

Hardware Discovery is an evidence-producing technical capability.

```text
Hardware Discovery
        │
        ├── collects observations
        ├── preserves provenance
        ├── normalizes representations
        ├── detects conflicts
        └── seals a discovery record
                │
                ├── Installer consumes it
                ├── Compatibility Engine evaluates it
                └── Hardware Profile is instantiated from it
```

Discovery shall not:

- classify hardware as `UNKNOWN`, `UNSUPPORTED`, `EXPERIMENTAL`, `PRODUCTION`, `PREFERRED`, `DEPRECATED` or `BLOCKED`;
- select an installation image;
- select a kernel, DTB, bootloader or recovery artifact;
- write boot, recovery, system or eMMC partitions;
- claim that a commercial model name is a hardware identity;
- infer missing capabilities from a similar device;
- convert a declaration into proof;
- overwrite a previous observation destructively;
- publish a Hardware Profile;
- authorize production provisioning.

The Compatibility Engine owns classification. The Installer owns execution of an already authorized Installation Profile. The Hardware Profile owns the validated configuration that is created after compatibility and homologation criteria are satisfied.

---

## 3. Discovery Contract

The output of discovery is a versioned `HardwareDiscoveryRecord` containing immutable or append-only facts.

```text
HardwareDiscoveryRecord
    ├── discovery_id
    ├── target_identity
    ├── schema_version
    ├── collector_version
    ├── lifecycle_state
    ├── started_at
    ├── sealed_at
    ├── facts[]
    ├── conflicts[]
    ├── missing_requirements[]
    ├── evidence_root
    └── record_hash
```

The record is a technical observation. It is not a compatibility decision, an installation authorization or a business fact.

Every fact shall preserve its original observation and its canonical representation. Normalization shall never destroy the source value.

---

## 4. Fact Envelope

Every discovery observation shall use the following conceptual envelope:

```text
FACT
├── fact_id
├── fact_type
├── observation_kind
├── source
├── value
├── normalized_value
├── confidence
├── observed_at
├── collected_at
├── evidence
├── collector_version
├── schema_version
├── target_identity
├── observation_sequence
└── validation_state
```

### 4.1 `fact_id`

`fact_id` uniquely identifies the observation. It shall be stable for the stored observation and shall not be reused for a different value.

### 4.2 `fact_type`

`fact_type` identifies the capability or attribute being observed, for example:

```text
cpu.architecture
soc.family
memory.ram.total
storage.usable
display.max_resolution
boot.secure_boot_state
identity.device_key_capability
```

The fact type is not a compatibility state and shall not encode an implementation-specific decision such as `production_supported`.

The Fact Envelope also contains the required `observation_kind` field between
`fact_type` and `source`. It is part of the serialized
`hardware-discovery-schema-v2` contract.

The canonical field order is therefore:

```text
fact_id → fact_type → observation_kind → source → value → normalized_value
→ confidence → observed_at → collected_at → evidence → collector_version
→ schema_version → target_identity → observation_sequence → validation_state
```

### 4.3 `observation_kind`

`observation_kind` is a required provenance classification. It is distinct
from `source.trust_class` and from compatibility state:

```text
DECLARED   human or administrative declaration retained as context;
OBSERVED   value directly reported by a collector or system interface;
INFERRED   value derived from other observations and accompanied by an inference description;
VALIDATED  value validated by an explicit, versioned validation procedure.
```

`INFERRED` facts shall preserve the inference description. A capability
requirement may be satisfied only by a fact whose `observation_kind` is
`VALIDATED`, whose `validation_state` is `VERIFIED`, and whose supporting
evidence is valid according to this contract. `DECLARED`, `OBSERVED` and
`INFERRED` facts remain useful observations but cannot satisfy a mandatory
capability requirement. Confidence never substitutes for validation.

The field is part of the serialized Fact contract. Records produced under a
previous schema identifier remain historical observations; a consumer that
requires `observation_kind` shall reject a record that does not declare
`hardware-discovery-schema-v2` rather than infer a classification.

### 4.4 `source`

`source` identifies where the observation came from and how it was obtained. It shall include at least:

```text
source.kind
source.component
source.version
source.reference
source.trust_class
```

### 4.5 `value`

`value` preserves the exact source representation, including the original textual form where applicable.

Examples:

```text
"S905W"
"0xAmlogic-GXL"
"17179869184"
"1920x1080@60"
```

### 4.6 `normalized_value`

`normalized_value` is the canonical representation used by downstream consumers. It shall be present only when normalization succeeds.

The original `value` shall remain available even when normalization fails.

### 4.7 `confidence`

`confidence` is a decimal value in the closed interval `[0.00, 1.00]`.

It represents the robustness of the observation based on source quality, integrity, completeness and cross-source consistency. It does not represent:

- probability that the device is compatible;
- probability of legal responsibility;
- a production authorization;
- a replacement for evidence;
- a reason to override a conflict.

Confidence is explanatory and auditable. A high confidence value cannot authorize a fact that lacks acceptable evidence.

### 4.8 `observed_at` and `collected_at`

`observed_at` is the time at which the source states that the condition existed. `collected_at` is the time at which the discovery collector obtained the observation.

Both timestamps shall be preserved when available. If the source does not provide an observation timestamp, `observed_at` shall be explicitly marked unavailable rather than fabricated.

### 4.9 `evidence`

`evidence` identifies the material supporting the observation. It shall include, where applicable:

```text
evidence.kind
evidence.digest
evidence.signature
evidence.signing_key_id
evidence.source_reference
evidence.capture_method
evidence.integrity_state
```

Evidence is referenced, not silently discarded. A discovery record shall be able to explain why a fact was accepted, rejected or marked unresolved.

For a capability requirement, supporting evidence is valid only when its
`integrity_state` is `VALID`, its digest and digest scope are present, and the
validation procedure recorded by the producer is represented by
`observation_kind: VALIDATED` and `validation_state: VERIFIED`. A declaration,
system observation, inference, unverified digest or confidence value cannot be
used as a substitute for this evidence.

---

## 5. Source Classes

Discovery may use more than one source. The source class describes provenance; it does not itself establish compatibility.

### 5.1 Hardware Attestation

Hardware attestation is a cryptographically verifiable statement produced by a hardware-backed or otherwise trusted device identity mechanism.

It may support strong identity and boot-state facts when:

- the attestation signature validates;
- the signing key is trusted for the requested fact;
- the attested measurement is bound to the target device;
- freshness or replay protection is present;
- the fact scope is explicit.

An attestation that cannot be validated is not trusted merely because it is present.

### 5.2 Bootloader or Firmware Source

Bootloader and firmware sources may report boot mode, boot state, board identifiers, firmware revisions and secure boot state.

The record shall retain the source component and version. A bootloader report shall not be treated as proof of capabilities it cannot observe.

### 5.3 Kernel and Device-Tree Source

Kernel, device-tree and system interface sources may report architecture, CPU, memory, storage, buses, board data, GPU/VPU and peripheral information.

These sources are system-reported observations. They must be correlated with other evidence where production classification requires stronger assurance.

### 5.4 Direct Probe

A direct probe measures or validates a capability through an operation against the target hardware, such as:

- reading usable storage;
- executing a decode test;
- opening a display mode;
- observing network reconnection;
- invoking a recovery capability in a controlled environment.

A probe result shall include the test identity, test version, result, limits and evidence digest.

### 5.5 Runtime Source

The operating system or Edge Runtime may report software, runtime, driver and capability facts. Runtime reports shall include runtime version and collection context.

Runtime-reported facts do not prove that the underlying hardware is genuine when the same value can be arbitrarily spoofed by software.

### 5.6 External Bootstrap or Maintenance Source

An external SD, USB, recovery medium or maintenance adapter may provide discovery data during provisioning.

The external source shall be identified and its artifact integrity shall be verified. External media shall not be trusted merely because it is physically connected.

### 5.7 Human Declaration

Human-provided declarations, labels, photographs, invoices or commercial descriptions may be retained as contextual evidence.

They shall never be the sole proof for production hardware identity or capability. A declaration cannot override an inconsistent measured fact.

### 5.8 Unknown Source

When the origin cannot be established, the source shall be marked `UNKNOWN` and the fact shall not satisfy a mandatory production evidence requirement.

---

## 6. Trust Classes

Each source shall declare a trust class for the fact being produced:

```text
ATTESTED
MEASURED
SYSTEM_REPORTED
DECLARED
UNKNOWN
```

Trust class describes provenance and does not replace confidence or evidence.

### 6.1 ATTESTED

The fact is backed by a validated attestation bound to the target identity and the declared measurement scope.

### 6.2 MEASURED

The fact was obtained by a direct, versioned probe or measurement against the target hardware.

### 6.3 SYSTEM_REPORTED

The fact was reported by firmware, bootloader, kernel, device tree, operating system or runtime.

### 6.4 DECLARED

The fact was supplied by a human or external administrative process without independent machine proof.

### 6.5 UNKNOWN

The source quality or origin cannot be established.

The Compatibility Engine may require a minimum trust class for each compatibility criterion. Discovery itself shall not silently promote a lower class to a higher class.

---

## 7. Confidence and Evidence Rules

Confidence is calculated for an observation, not for the device as a whole.

The collector shall consider:

- source trust class;
- evidence integrity;
- freshness;
- completeness of the observed value;
- repeatability of a measurement;
- consistency with independent sources;
- whether the source can observe the claimed fact directly.

The collector shall not increase confidence merely because the commercial model name matches a known name.

The collector shall not average contradictory values into a synthetic value.

When two independent sources agree, the record may preserve the agreement as corroboration. The original observations and their separate provenance shall remain available.

When sources disagree, the result shall be represented as a conflict according to Section 13.

Confidence thresholds used by a Compatibility Engine belong to that engine's versioned compatibility contract. Discovery publishes the observed confidence and does not decide the threshold.

---

## 8. Canonical Normalization

Normalization transforms equivalent source representations into a canonical value without changing their meaning.

Normalization shall be deterministic, versioned and reversible to the original source value through the evidence reference.

### 8.1 Numeric Capacity

RAM and storage shall be represented in bytes in `normalized_value`.

The record may preserve the original unit and nominal value in `value`.

Storage shall distinguish:

```text
storage.nominal
storage.usable
storage.reserved
storage.unavailable
storage.partitions
```

Only usable storage available to the Edge installation can satisfy the minimum storage requirement.

### 8.2 Architecture

Architecture shall preserve the source value and expose a canonical architecture identifier defined by the discovery schema version.

The discovery contract shall not infer architecture from a commercial name.

### 8.3 SoC and Board

SoC and board facts shall keep separate fields for vendor, family, model, board identifier and revision.

An absent board revision shall remain absent. It shall not be replaced by the family revision or by a value inferred from a product name.

### 8.4 Display Modes

Resolution and refresh rate shall be represented as structured values, not display strings only.

```text
width
height
refresh_rate
pixel_format
connector
```

### 8.5 Versions

Collector, firmware, bootloader, OS, runtime and capability versions shall be preserved as opaque producer-owned version identities.

Discovery shall not order, normalize, coerce or infer equivalence between version values beyond the producer contract.

### 8.6 Enumerations

When a source value is outside the schema vocabulary, the original value shall be retained and the normalized value shall be marked unresolved. Unknown enumeration values shall not be silently mapped to a known value.

---

## 9. Required Fact Families

The following fact families are required for a complete production-oriented discovery record.

Missing facts may be acceptable for an experimental evaluation only when the Compatibility Engine explicitly declares the missing capability non-mandatory for that evaluation. Discovery shall always report the omission.

### 9.1 CPU and SoC

The record shall support:

```text
cpu.architecture
cpu.implementer
cpu.model
cpu.core_count
soc.vendor
soc.family
soc.model
soc.revision
```

Each fact shall state whether it was measured, attested or merely reported.

### 9.2 Board

The record shall support:

```text
board.identifier
board.revision
board.manufacturer
board.variant
board.device_tree_identity
```

Board identity is distinct from commercial device name.

### 9.3 RAM

The record shall support:

```text
memory.ram.total
memory.ram.usable
memory.ram.reserved
```

The values shall be normalized to bytes and shall include the observation source.

### 9.4 Storage

The record shall support:

```text
storage.devices
storage.nominal
storage.usable
storage.reserved
storage.partitions
storage.write_capability
storage.persistence
```

Usable storage shall be determined from the storage available to the Edge installation, not from marketing capacity.

### 9.5 GPU and VPU

The record shall support:

```text
gpu.vendor
gpu.model
gpu.driver
gpu.driver_version
vpu.vendor
vpu.model
vpu.decode_capabilities
vpu.encode_capabilities
```

Reported support and measured playback support shall remain distinguishable.

### 9.6 Codecs

The record shall support a capability list containing:

```text
codec
container
profile
level
bit_depth
maximum_resolution
maximum_frame_rate
decode_path
acceleration
validation_state
```

The list shall not claim production support solely from a static SoC lookup.

### 9.7 Display

The record shall support:

```text
display.connectors
display.modes
display.maximum_resolution
display.refresh_rates
display.initialization_behavior
display.hdcp_state
```

Display initialization behavior shall include the result of reboot and power-cycle observations when available.

### 9.8 Ethernet

The record shall support:

```text
network.ethernet.present
network.ethernet.interface
network.ethernet.chipset
network.ethernet.driver
network.ethernet.link_state
network.ethernet.dhcp_behavior
network.ethernet.reconnection_behavior
```

### 9.9 Wi-Fi

The record shall support:

```text
network.wifi.present
network.wifi.interface
network.wifi.chipset
network.wifi.driver
network.wifi.firmware
network.wifi.link_state
network.wifi.reconnection_behavior
```

The presence of a Wi-Fi interface does not prove stable commercial operation.

### 9.10 USB

The record shall support:

```text
usb.controllers
usb.ports
usb.host_capability
usb.external_boot_capability
usb.recovery_capability
```

USB is optional for normal playback but may be required by an Installation Profile.

### 9.11 Bootloader and Boot Mode

The record shall support:

```text
boot.bootloader
boot.bootloader_version
boot.mode
boot.partition
boot.kernel
boot.device_tree
boot.unlocked_state
```

A missing boot fact shall not be interpreted as a safe boot path.

### 9.12 Partitions

The record shall support:

```text
partition.name
partition.type
partition.start
partition.size
partition.writable
partition.mount_state
partition.role
partition.integrity_state
```

Partition observations shall not authorize writes. They only describe observed capability and state.

### 9.13 Recovery Capability

The record shall support:

```text
recovery.present
recovery.kind
recovery.entry_path
recovery.rollback_capability
recovery.last_known_good_capability
recovery.validation_state
```

A declared recovery path is not equivalent to a validated recovery path.

### 9.14 Secure Boot State

The record shall support:

```text
security.secure_boot.state
security.secure_boot.mode
security.secure_boot.root_of_trust
security.secure_boot.measurement
security.secure_boot.key_reference
security.secure_boot.validation_state
```

Possible observed states shall distinguish at least enabled, disabled, unsupported, unknown and conflicting observations.

### 9.15 OS and Runtime

The record shall support:

```text
software.os.name
software.os.version
software.kernel.version
software.runtime.name
software.runtime.version
software.player.environment
software.collector.version
```

The OS and runtime facts identify the current environment. They do not alone establish that the hardware can run the production Edge stack.

### 9.16 Device Identity Capabilities

The record shall support:

```text
identity.edge_installation_id_capability
identity.device_key_capability
identity.key_storage_kind
identity.key_attestation_capability
identity.persistence_across_update
identity.persistence_across_recovery
identity.revocation_capability
```

MAC addresses may be observed as network facts but shall not be used as the primary Edge identity.

---

## 10. Discovery Lifecycle

A discovery run shall progress through explicit states:

```text
NOT_STARTED
      ↓
COLLECTING
      ↓
NORMALIZING
      ↓
CORRELATING
      ├── CONFLICTED
      ├── PARTIAL
      └── COMPLETE
             ↓
           SEALED
```

### 10.1 NOT_STARTED

No observation has been accepted for the target.

### 10.2 COLLECTING

Collectors are obtaining observations. A collecting record is not suitable for compatibility evaluation as a final record.

### 10.3 NORMALIZING

Source values are being converted into canonical representations while preserving originals.

### 10.4 CORRELATING

Observations from independent sources are compared for identity, consistency and completeness.

### 10.5 PARTIAL

Some facts were collected, but one or more requested facts are unavailable or unresolved. Partial is not a compatibility classification.

### 10.6 CONFLICTED

Two or more observations for a mandatory or identity-related fact cannot be reconciled deterministically.

### 10.7 COMPLETE

All facts required by the requested discovery scope were collected, normalized and correlated without unresolved mandatory conflicts.

Complete does not mean compatible.

### 10.8 SEALED

The record is immutable as a snapshot of the discovery run. Later discovery creates a new record or append-only revision; it does not rewrite the sealed record.

Only a sealed record may be submitted as the discovery input to a compatibility evaluation.

---

## 11. Discovery Scope

A discovery run shall declare its scope before collection begins.

The scope shall identify:

```text
target_identity
requested_fact_families
required_evidence_level
requested_profile_context, if known
collector_policy_version
```

The same target may have multiple discovery runs over time. Each run preserves its own timestamps, collector version and evidence root.

A discovery run shall not claim that unrequested facts were inspected.

---

## 12. Identity Binding

Discovery facts shall be bound to a target identity for the duration of the run.

The binding shall use the strongest available combination of:

```text
EdgeInstallationId
DeviceKey
hardware-backed identity
boot identity
stable board identity
```

Before an EdgeInstallationId exists, a bootstrap identity may be used, but it shall be explicitly marked provisional.

The following shall not be sufficient as the sole target identity:

```text
MAC address
commercial model name
Android build fingerprint
serial number reported without provenance
user-provided label
```

If identity observations conflict, the discovery record shall be `CONFLICTED` and shall not be submitted as a production compatibility input.

---

## 13. Conflict Handling

Discovery shall preserve conflicting observations instead of selecting a convenient value.

For a conflict, the record shall include:

```text
conflict_id
fact_type
observations[]
conflict_kind
deterministic_resolution
blocking_scope
created_at
```

Conflict kinds shall distinguish at least:

```text
VALUE_MISMATCH
IDENTITY_MISMATCH
SOURCE_UNTRUSTED
STALE_OBSERVATION
NORMALIZATION_FAILURE
EVIDENCE_INVALID
MISSING_CORROBORATION
```

The collector shall not resolve a conflict by averaging, choosing the first observation or preferring a commercial name.

If a mandatory production fact remains conflicted, the record cannot be used to produce a Production classification.

If a non-mandatory optional fact conflicts, the conflict shall remain visible and the Compatibility Engine shall decide whether that optional capability affects its evaluation.

---

## 14. Missing, Unsupported and Unobservable Facts

Discovery shall distinguish:

```text
NOT_COLLECTED
NOT_AVAILABLE
NOT_SUPPORTED
UNOBSERVABLE
INVALID
CONFLICTED
```

These conditions shall never be encoded as a fabricated zero, empty string, false value or guessed enum.

Examples:

- a missing Wi-Fi adapter is `NOT_PRESENT` or `NOT_SUPPORTED`, not a failed Wi-Fi measurement;
- an inaccessible secure boot register is `UNOBSERVABLE`, not `DISABLED`;
- an unknown board revision is `NOT_AVAILABLE`, not revision `0`;
- a failed codec probe is `INVALID` or `FAILED`, not codec support;
- a collector that did not run produces `NOT_COLLECTED`, not a negative capability.

The Compatibility Engine maps these conditions to its own compatibility result. Discovery only preserves the reason.

---

## 15. Evidence Integrity

Every sealed discovery record shall have an integrity root covering:

```text
schema_version
collector_version
target_identity
fact envelopes
conflicts
missing requirements
timestamps
```

The integrity root shall be reproducible from the canonical serialized record.

Where a source provides a signature, the record shall preserve:

```text
signature
signing_key_id
algorithm_identifier
verification_result
```

Invalid signatures shall not be converted into low-confidence valid facts. They shall produce an explicit evidence failure.

The record hash is an integrity reference. It does not by itself prove that every source value is true.

---

## 16. Freshness and Re-observation

Hardware facts have different freshness requirements.

The discovery record shall preserve the observation timestamp and the fact's freshness class when defined by the consumer contract.

Examples:

```text
board.identity          → generally stable
ram.total               → stable until hardware replacement
network.link_state      → volatile
thermal.characteristic  → workload-dependent
recovery.validation     → remains valid only for the tested software/profile context
```

Discovery shall not silently carry a volatile observation into a new run as if it were freshly observed.

A new run shall create a new observation for any fact whose freshness requirement has expired or whose environment changed materially.

---

## 17. Repeated Measurements

When a capability requires repeated observation, each measurement shall be preserved as a separate fact or evidence item.

The sealed record may expose a derived summary such as `stable`, `unstable` or `inconclusive`, but it shall retain the observations from which the summary was derived.

Repeated measurement summaries are projections of discovery evidence. They do not replace the underlying facts.

The summary algorithm and version shall be identified in the record.

---

## 18. Consumer Contracts

### 18.1 Installer

The Installer consumes:

```text
sealed HardwareDiscoveryRecord
CompatibilityEvaluationResult
authorized InstallationProfile
```

The Installer shall not execute provisioning from an unsealed discovery record.

The Installer shall not choose an image or adapter by commercial model name.

If discovery is incomplete, conflicted, invalid or identity-unbound, the Installer shall stop before destructive operations and report the explicit reason.

### 18.2 Compatibility Engine

The Compatibility Engine consumes the sealed discovery record and evaluates it against the compatibility contract and its own versioned evaluation policy.

It shall be able to inspect:

```text
source
trust_class
confidence
evidence integrity
timestamps
normalization state
conflicts
missing facts
```

The Compatibility Engine shall never receive an already-classified state from Discovery as an authoritative result.

### 18.3 Hardware Profile

A Hardware Profile consumes the discovery record only after the compatibility and homologation gates required by the profile lifecycle have been satisfied.

The profile shall reference:

```text
discovery_id
record_hash
fact schema version
collector version
evidence root
validated capabilities
```

A profile shall not silently copy facts without preserving their provenance.

### 18.4 Audit and Operations

Audit and operations consumers may read discovery records, conflicts and evidence references. They shall not mutate sealed records or reinterpret a discovery observation as a compatibility authorization.

---

## 19. Discovery Output Contract

The conceptual output shape is:

```json
{
  "discovery_id": "opaque-discovery-id",
  "target_identity": {
    "edge_installation_id": "provisional-or-stable-id",
    "device_key_reference": "opaque-key-reference",
    "binding_state": "PROVISIONAL"
  },
  "schema_version": "hardware-discovery-schema-v2",
  "collector_version": "collector-v1",
  "lifecycle_state": "SEALED",
  "facts": [
    {
      "fact_id": "fact-001",
      "fact_type": "soc.family",
      "observation_kind": "OBSERVED",
      "source": {
        "kind": "SYSTEM_REPORTED",
        "component": "device-tree",
        "version": "collector-v1",
        "trust_class": "SYSTEM_REPORTED"
      },
      "value": "amlogic,gxl",
      "normalized_value": "amlogic-gxl",
      "confidence": 0.82,
      "observed_at": "2026-08-09T12:00:00Z",
      "collected_at": "2026-08-09T12:00:01Z",
      "evidence": {
        "kind": "device-tree-reading",
        "digest": "opaque-digest",
        "integrity_state": "VALID"
      }
    }
  ],
  "conflicts": [],
  "missing_requirements": [],
  "evidence_root": "opaque-root",
  "record_hash": "opaque-record-hash"
}
```

The example is illustrative. Field names, identifiers and version values are contract data and shall be governed by the published discovery schema.

---

## 20. Example: Validated Fact With Corroboration

Two independent sources report the same usable storage:

```text
Source A: direct storage probe
Source B: partition table inspection
Normalized value: 17179869184 bytes
```

The record shall preserve both observations, their evidence and their confidence. A derived corroboration may state that the observations agree, but it shall not remove either source.

This supports the question:

```text
Which evidence shows the device has this usable capacity?
```

It does not merely state:

```text
storage = 16 GB
```

---

## 21. Example: Commercial Name Without Hardware Proof

If a device reports:

```text
commercial_model = "MXQ Pro 4K 5G"
```

but board, revision, boot path or storage evidence is missing, the discovery record shall preserve the commercial name as a declared or system-reported fact and shall leave the corresponding hardware identity facts unresolved.

The record shall not create a production Hardware Profile from that name.

---

## 22. Example: Conflicting Board Identity

If the device tree reports board revision `A` and a validated boot source reports revision `B`:

```text
fact_type: board.revision
conflict_kind: VALUE_MISMATCH
```

Both observations shall remain in the record. The record shall become `CONFLICTED` for the affected identity scope and shall not be used to authorize production provisioning until the conflict is resolved by a later discovery run or an explicitly versioned resolution process.

---

## 23. Example: Missing Optional Collector

If no Wi-Fi adapter exists:

```text
fact_type: network.wifi.present
status: NOT_PRESENT
```

The discovery record remains valid for the facts it can observe. It shall not invent Wi-Fi metrics, and it shall not stop unrelated playback or discovery collection merely because an optional capability is absent.

The Compatibility Engine decides whether the absence is compatible with the requested profile.

---

## 24. Security and Privacy

Discovery shall minimize sensitive data while retaining sufficient evidence for compatibility and audit.

The record shall not include private keys or secret material. It may include opaque references, public-key fingerprints, attestation references and evidence digests.

Raw source material shall be retained according to the applicable security and retention policy. The discovery contract shall preserve enough metadata to determine whether an observation was verified without exposing secrets.

Collectors shall run with the minimum permissions required to observe their fact families.

Discovery shall report permission denial as an explicit observation condition, not as a false negative capability.

---

## 25. Versioning and Compatibility

The following identities are independent:

```text
DiscoverySchemaVersion
CollectorVersion
SourceComponentVersion
NormalizationVersion
EvidenceAlgorithmVersion
```

Version values are opaque producer-owned identities. Discovery shall preserve the exact values and shall not infer ordering or equivalence.

A consumer that cannot interpret a discovery schema shall reject the operation explicitly. It shall not reinterpret an unknown field or silently drop a mandatory fact.

Historical discovery records remain valid observations under their original schema and collector versions. A newer consumer may reject processing for lack of compatibility without invalidating the historical record.

---

## 26. Replay and Reproducibility

A sealed discovery record shall be replayable as an observation record.

Replay shall reproduce:

- the original fact values;
- normalized values;
- source classes;
- confidence values;
- timestamps;
- conflicts;
- missing requirements;
- evidence references;
- record hash.

Replay shall not recollect the device or replace historical facts with current observations.

A new physical observation is a new discovery run, not a mutation of a historical record.

---

## 27. Failure Behavior

Discovery failures shall be explicit and typed.

At minimum, the contract shall distinguish:

```text
COLLECTOR_UNAVAILABLE
PERMISSION_DENIED
SOURCE_UNREADABLE
NORMALIZATION_FAILED
EVIDENCE_INVALID
IDENTITY_UNBOUND
REQUIRED_FACT_MISSING
CONFLICT_DETECTED
SCHEMA_UNSUPPORTED
INTEGRITY_ROOT_FAILED
```

A failure shall not be converted into a fabricated fact. The discovery run may become `PARTIAL`, `CONFLICTED` or failed according to the affected scope, but the reason shall remain visible.

The system may retry collection using the same discovery operation identity when the failure is transient. A retry shall create additional evidence or an explicit attempt record; it shall not overwrite the prior attempt destructively.

---

## 28. Normative Requirements

The following requirements are normative.

### HD-001

Discovery shall produce a versioned `HardwareDiscoveryRecord` rather than an unstructured hardware label.

### HD-002

Every fact shall contain source, original value, normalized value when available, confidence, timestamps and evidence reference.

### HD-003

Discovery shall preserve the original source value when normalization succeeds or fails.

### HD-004

Confidence shall be represented as a decimal in `[0.00, 1.00]` and shall describe evidence robustness, not compatibility.

### HD-005

Discovery shall not classify compatibility or authorize provisioning.

### HD-006

Commercial model names shall never be the sole proof of hardware identity.

### HD-007

Unknown, missing, invalid and conflicted observations shall remain distinguishable.

### HD-008

The collector shall not fabricate, average or silently infer mandatory hardware facts.

### HD-009

Only a sealed discovery record may be submitted as the final discovery input to Compatibility Evaluation.

### HD-010

Conflicting mandatory identity or capability observations shall prevent production compatibility input until resolved.

### HD-011

Discovery shall preserve evidence integrity metadata and a reproducible record hash.

### HD-012

Discovery shall bind observations to a target identity and shall mark provisional identity explicitly.

### HD-013

MAC address, commercial model name and user declaration shall not be sufficient as the sole Edge identity.

### HD-014

RAM, storage, CPU/SoC, board, GPU/VPU, codecs, display, network, USB, boot, partitions, recovery, secure boot, OS/runtime and device identity capabilities shall be representable by the contract.

### HD-015

Discovery shall preserve independent observations when sources corroborate or conflict.

### HD-016

Historical sealed records shall remain immutable and replayable.

### HD-017

An unsupported discovery schema shall result in explicit rejection and shall not invalidate the source record.

### HD-018

Discovery failure shall be reported with a typed cause and shall not be represented as a valid capability.

### HD-019

The Installer shall consume sealed discovery plus an explicit Compatibility Evaluation Result and Installation Profile.

### HD-020

The Compatibility Engine shall evaluate facts, provenance, evidence, confidence, freshness, conflicts and missing requirements instead of trusting a preclassified discovery result.

### HD-021

A Hardware Profile shall preserve the discovery record identity, hash, schema version, collector version and evidence root from which it was instantiated.

### HD-022

Discovery shall not redefine thresholds established by `EDGE_HARDWARE_COMPATIBILITY.md`.

---

## 29. Next Specification

The next specification shall define validated hardware profile instantiation:

`EDGE_HARDWARE_PROFILES.md`

It shall consume:

```text
EDGE_HARDWARE_COMPATIBILITY.md
EDGE_HARDWARE_DISCOVERY.md
```

It shall define how a sealed discovery record, a compatibility result and homologation evidence become a versioned Hardware Profile without losing provenance or changing the compatibility thresholds.
