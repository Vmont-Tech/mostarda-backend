# Mostarda Edge — Telemetry Specification

**Status:** DRAFT
**Version:** 1.0.0
**Owner:** Telemetry Context
**Prerequisites:** `EDGE_HARDWARE_PROFILES.md`, `EDGE_INSTALLATION_PROFILES.md`, `EDGE_OS_SPECIFICATION.md`, `EDGE_SECURITY.md`, `EDGE_PLAYER_SPECIFICATION.md`, `EDGE_OFFLINE_STORAGE.md`, `EDGE_OTA.md`, `EDGE_RECOVERY.md`
**Related Domains:** Playback, Evidence Ledger, Analytics, Pricing, Operations
**Scope:** operational observations, local telemetry persistence, offline synchronization and audit-safe telemetry contracts

---

## 1. Purpose

This document defines the normative contract for Edge Telemetry.

Telemetry records structured operational observations from the Edge, persists them locally when necessary and synchronizes them with Cloud after authenticated reconnection.

The contract defines:

- the boundary between Telemetry, Fact, Evidence and Log;
- `TelemetryEvent` identity and schema;
- device identity, timestamps, sequence and correlation;
- origin, integrity, signatures and hash chaining;
- local queue and offline persistence;
- retry, backoff, deduplication, idempotency and ordering;
- capacity, priority, retention and full-queue behavior;
- synchronization and acknowledgement after reconnection;
- hardware/OS, Player, Playback, Content Store, OTA, Recovery, Security and Network telemetry;
- `TelemetryResult` and error catalog;
- normative `TEL-*` requirements.

The Edge records verifiable operational facts. It does not decide legal, financial or evidentiary validity locally.

---

## 2. Architectural Boundary

The authoritative telemetry path is:

```text
Edge Runtime
    |
    +--> Hardware / OS health
    +--> Player health
    +--> Playback facts or fact references
    +--> Local Content Store
    +--> OTA
    +--> Recovery
    +--> Security
    +--> Network
            |
            v
       Telemetry Queue
            |
            v
      Local Persistence
            |
            v
      Cloud Synchronization
            |
            v
       Telemetry Context
            |
            +--> Telemetry Ledger
            +--> AudienceProjection
            +--> downstream consumers
```

### 2.1 Telemetry owns

Telemetry Context owns:

- accepted operational observations;
- `TelemetryEvent` contract and ingestion state;
- Telemetry Ledger append-only persistence;
- immutable buckets and derived projections such as `AudienceProjection`;
- consumer-facing telemetry contracts;
- local queue and synchronization semantics for Edge telemetry;
- telemetry retention and observability policy.

AudienceProjection remains an internal, versioned projection of Telemetry Context. It is not a new Audience Bounded Context.

### 2.2 Producers and consumers

Each source owns the facts it produces:

```text
Playback       -> authoritative Playback facts
Player         -> Player execution and health observations
Edge OS        -> OS, resource and device observations
Content Store  -> content and snapshot observations
OTA            -> update observations
Recovery       -> recovery observations
Security       -> security observations
Network        -> network observations
Telemetry      -> accepted observation ledger and projections
```

Pricing, Analytics, Marketplace, AI and other contexts consume public telemetry contracts. They do not acquire authority over fact production or Telemetry Ledger mutation.

### 2.3 Explicit non-responsibilities

Telemetry shall not:

- materialize `EvidenceRecord`;
- mark Evidence `VALID`;
- decide responsibility, guilt, compensation or financial eligibility;
- alter Campaign, Pricing, Settlement or Financial state;
- invent missing measurements;
- replace a missing source with a human assumption;
- expose DeviceKey private material or secrets;
- reinterpret a producer's authoritative event.

---

## 3. Telemetry, Fact, Evidence and Log

### 3.1 Telemetry

Telemetry is a structured, transportable and auditable operational observation. It records what a source reported, when it reported it, under which identity and with what integrity state.

Telemetry is not automatically a domain fact and is not automatically legal evidence.

### 3.2 Fact

A Fact is an observation owned by a bounded context or producer according to its domain contract.

Examples:

```text
PlaybackEvent
PlaybackSignature
PlayerHealthObservation
ContentSnapshotCommitted
OTAStateChanged
RecoveryCompleted
SecurityIncidentDetected
```

A Fact may be transported inside a `TelemetryEvent` or referenced by one. Telemetry does not become the owner of a Fact merely by carrying it.

### 3.3 Evidence

Evidence is a validated, correlated and materialized record owned by Evidence Ledger. The authoritative flow remains:

```text
operational event
        |
        v
Telemetry / Fact transport
        |
        v
Cloud validation and correlation
        |
        v
Evidence, when applicable
```

The Edge shall never claim that a telemetry record is a legally valid `EvidenceRecord`.

### 3.4 Log

A Log is diagnostic output used to investigate execution. Logs may be incomplete, sampled or ephemeral and are not authoritative facts unless a separate contract promotes a specific record.

Logs shall not be used as a substitute for `TelemetryEvent`, Playback facts or Evidence.

### 3.5 Comparison

| Artifact | Owner | Purpose | Authoritative for Evidence? |
| --- | --- | --- | --- |
| `TelemetryEvent` | Telemetry transport/source | structured observation and synchronization | No |
| Fact | originating context | domain-owned observation | Only as input to Evidence Ledger |
| Evidence | Evidence Ledger | validated legal/operational record | Yes, when valid and anchored |
| Log | producing module | diagnosis and debugging | No |

---

## 4. TelemetryEvent

### 4.1 Canonical schema

Every event submitted to the Telemetry pipeline shall conform to:

```text
TelemetryEvent
|- telemetry_event_id
|- event_type
|- event_schema_version
|- producer_context
|- producer_module
|- origin_reference
|- device_identity
|- hardware_profile_reference
|- installation_profile_reference
|- boot_session_reference
|- stream_reference
|- sequence_number
|- monotonic_counter
|- occurred_at_local
|- occurred_at_trusted
|- captured_at
|- time_quality
|- correlation_reference
|- causation_reference
|- priority
|- retention_class
|- payload
|- payload_digest
|- previous_event_hash
|- event_hash
|- signature_reference, when required
|- security_context
```

### 4.2 Event identity

`telemetry_event_id` is the immutable identity of one logical telemetry event. A retry, batch move, transport change or offline replay uses the same identity.

The same identity shall never represent two different payloads, origins, sequence positions or times.

### 4.3 Device identity

Every event shall identify the source through:

```text
EdgeInstallationId
DeviceKey reference
HardwareProfile id/version
InstallationProfile id/version, when applicable
```

MAC address, IP address, Android ID or commercial serial may be contextual fields but are not the primary Edge identity.

Private keys and secret material shall never be included in the event.

### 4.4 Producer and origin

`producer_context` and `producer_module` identify the component that observed or produced the event. `origin_reference` identifies the source operation, process, PlaybackResult, ContentStoreResult, OTA result, Recovery result or Security result when applicable.

Telemetry transport shall not replace the originating context with `Telemetry` merely because it forwards the event.

---

## 5. Time, Sequence and Correlation

### 5.1 Timestamp fields

Telemetry shall distinguish:

```text
occurred_at_local    -> time observed by the source clock
occurred_at_trusted  -> time mapped to an accepted time source, when available
captured_at          -> time persisted by the telemetry collector
```

The event shall record `time_quality`:

```text
TRUSTED
LOCAL_ONLY
ESTIMATED
UNKNOWN
```

Telemetry shall preserve the local timestamp even when a trusted timestamp is unavailable. It shall not silently convert an unknown time into a trusted time.

### 5.2 Sequence number

`sequence_number` is monotonically increasing within the declared `(EdgeInstallationId, stream_reference, boot_session_reference)` scope. It provides ordering evidence for the stream, not global ordering across all Edge devices.

Sequence gaps remain visible. The Edge shall not renumber historical events to conceal loss or reordering.

### 5.3 Monotonic counter

`monotonic_counter` is sourced from a monotonic clock or counter where the Hardware Profile/OS exposes one. It is used to compare event order across wall-clock changes within a boot session.

If a monotonic counter resets after reboot, the new `boot_session_reference` identifies the new counter epoch. A reset is not a correction to prior events.

### 5.4 Correlation and causation

Events shall carry:

```text
correlation_reference -> logical operation or session
causation_reference   -> event/command that caused this observation
origin_reference      -> producing operation or result
```

For Playback, the references should include `playback_id`, manifest/entry/asset references and the Player instance. For OTA, Recovery, Security and Content Store operations, the corresponding operation identity is required.

### 5.5 Ordering

Ordering guarantees are scoped, not global:

```text
device/stream sequence -> source order
Playback stream        -> playback order
OTA operation stream   -> update order
Recovery stream        -> recovery order
Security stream        -> incident order
```

Cloud may receive events out of transport order. It shall preserve source sequence, identify gaps and avoid fabricating an order that the Edge did not observe.

---

## 6. Schema, Versioning and Compatibility

### 6.1 Version fields

The event shall distinguish:

```text
telemetry_contract_version
event_schema_version
producer_module_version
HardwareProfile version
InstallationProfile version
policy_version, when applicable
```

Version values are opaque identities. Telemetry shall preserve and compare them exactly according to the producer contract; it shall not infer ordering or compatibility from their text.

### 6.2 Schema compatibility

Cloud consumers evaluate compatibility through their own explicit compatibility declarations. The absence of a compatibility entry is not support.

If a consumer cannot evaluate or process a telemetry schema:

```text
event remains historically valid
consumer operation is rejected or not evaluated
producer artifact is not altered
```

### 6.3 Unknown fields and versions

An unknown required field, event type or schema version shall produce an explicit rejection or quarantine result. Optional fields may be ignored only when the schema contract declares them non-semantic.

### 6.4 Event families

The following event families are part of the public Telemetry contract:

```text
HardwareHealthObserved
OSHealthObserved
PlayerHealthObserved
PlaybackFactObserved
ContentStoreObserved
OTAObserved
RecoveryObserved
SecurityObserved
NetworkObserved
TelemetryQueueObserved
```

Each event family has a producer context and schema version; Telemetry does not merge semantically different families into a generic payload.

---

## 7. Integrity, Hashing and Signatures

### 7.1 Payload digest

Every event shall include a digest over its canonical payload and declared schema identity:

```text
payload_digest
digest_algorithm_reference
```

Changing a payload, identity, timestamp, sequence or schema changes the event digest.

### 7.2 Event hash

`event_hash` is the digest of the canonical event envelope, including the payload digest and integrity references.

### 7.3 Hash chain

Within a stream that supports chaining, the event shall include:

```text
hash_chain_id
previous_event_hash
event_hash
```

The chain begins with an explicit genesis reference for the boot/session stream. A missing or broken link is reported as a gap or integrity failure; the Edge shall not recompute history to hide it.

If a Hardware Profile cannot support a persistent chain, the applicable Telemetry/OS contract shall declare the alternative integrity mechanism and its limitation. The event shall not claim a stronger chain than was actually produced.

### 7.4 Signature

Signatures are required whenever the source contract, Security policy or Evidence input contract requires source authenticity. Typical mandatory candidates include:

```text
Playback facts and PlaybackSignatures
Security incidents
identity and key events
OTA state and activation results
Recovery state and results
profile/trust changes
```

The identity service or Runtime may sign on behalf of a producer. DeviceKey private material never enters the telemetry payload.

### 7.5 Verification result

The receiver shall record:

```text
signature_state
digest_state
chain_state
key_state
revocation_state
verification_time
verifier_version
```

An event with failed integrity is not silently accepted as a valid observation.

---

## 8. Event Origins and Required Payloads

### 8.1 Hardware and OS health

Hardware/OS telemetry may include:

```text
cpu_load
memory_total / used / available
storage_total / used / reserved / available
temperature and thermal state
GPU/VPU state
display state
power state
boot state
process/service state
watchdog state
```

Each observation shall identify the capability source, measurement unit, sample time and quality. A missing sensor produces `UNAVAILABLE` or `UNKNOWN`, not a fabricated value.

### 8.2 Player health

Player telemetry shall reference `PlayerHealth` and may include:

```text
player state
Web Engine state
codec/display state
memory pressure
render/decode progress
watchdog action
active snapshot reference
fallback state
```

It shall not claim a successful playback without the Player's execution result.

### 8.3 Playback facts

Playback telemetry may transport or reference:

```text
PlaybackEvent
PlaybackSignature
PlaybackResult
player_instance_id
campaign/slot/asset references
scheduled and actual times
duration observed
completion state
```

Playback remains the authoritative producer. Telemetry forwards and persists the fact; Evidence Ledger alone determines whether an EvidenceRecord can be materialized and validated.

### 8.4 Content Store

Content Store telemetry may include:

```text
snapshot commit
active/known-good pointers
staging and verification
quota and storage pressure
expiration/revocation
garbage collection
corruption and recovery
ContentStoreResult reference
```

Telemetry shall not rewrite a content snapshot or interpret its authorization.

### 8.5 OTA

OTA telemetry shall reference `UpdateResult` and include, where applicable:

```text
update_id
manifest reference
source and target versions
Hardware/Installation Profile
state transition
artifact verification
activation and health
rollback/recovery result
```

### 8.6 Recovery

Recovery telemetry shall reference the Recovery operation and include:

```text
recovery_id
Recovery Plan reference
trigger
state transition
artifact validation
identity result
rollback result
health result
final state
```

### 8.7 Security

Security telemetry shall include only redacted and authorized security observations:

```text
SecurityResult reference
incident state
tamper result
key/certificate state
profile/manifest trust result
authorization result
replay/revocation result
quarantine or Recovery action
```

It shall never include private keys, passwords, bearer tokens or raw secret material.

### 8.8 Network

Network telemetry may include:

```text
interface state
link state
addressing state
DNS/time synchronization state
secure transport state
connection loss/reconnection
queue synchronization state
```

It shall not expose network credentials or unnecessary personal data.

---

## 9. Local Telemetry Queue

### 9.1 Queue boundary

Every accepted event shall be persisted to the local telemetry queue before the source receives a durable acceptance result, unless the event contract explicitly allows best-effort loss.

```text
produce event
      |
      v
validate envelope
      |
      v
persist locally
      |
      v
ack source / continue operation
      |
      v
synchronize with Cloud
```

### 9.2 Queue record

```text
TelemetryQueueRecord
|- queue_record_id
|- telemetry_event_id
|- priority
|- retention_class
|- enqueue_sequence
|- local_persisted_at
|- retry_count
|- next_retry_at
|- synchronization_state
|- event_reference
|- record_hash
```

Queue records are append-only until acknowledged or moved to a terminal retention state.

### 9.3 Local persistence

Queue storage shall use the `TELEMETRY_QUEUE` logical storage role and quotas from `EDGE_OFFLINE_STORAGE.md`. It shall not borrow unbounded space from OS, identity, Recovery, OTA staging or Local Content Store.

The queue shall preserve event identity, stream ordering, hash references, retry state and security context across process restart and reboot.

### 9.4 Offline behavior

When Cloud is unavailable, the Edge shall:

```text
persist eligible events locally
preserve source order and identity
apply retention and priority policy
continue local playback and operation when allowed
report queue pressure
avoid discarding critical events
```

It shall not claim Cloud acceptance merely because an event was locally persisted.

---

## 10. Priority, Retention and Loss Policy

### 10.1 Priority classes

Every event shall declare a priority:

```text
P0_CRITICAL
P1_HIGH
P2_NORMAL
P3_BEST_EFFORT
```

### 10.2 P0 Critical

P0 events shall not be discarded by ordinary queue pressure. They include, according to the source contracts:

```text
Playback facts required by Evidence input
Security incidents and compromise results
identity creation, rotation, revocation or reset
OTA activation, rollback and Recovery handoff
Recovery state transitions and final results
content corruption affecting active/known-good snapshots
telemetry integrity or journal failures
```

If P0 cannot be persisted, the Edge shall record a local critical-persistence failure and enter the source-specific safe behavior. It shall not convert the event to P3.

### 10.3 P1 High

P1 events include:

```text
PlayerHealth transitions
OS/Runtime health transitions
storage low/critical/full states
network loss/reconnection
content snapshot commit/fallback
watchdog action
hardware thermal or resource alarm
```

P1 events may be retained until Cloud acceptance or the declared terminal retention policy.

### 10.4 P2 Normal

P2 events include periodic metrics and immutable telemetry buckets used by Analytics, Operations or projections. They are retained according to the configured policy and may be batched.

### 10.5 P3 Best Effort

P3 events include repeated diagnostics, high-frequency samples or nonessential debug observations. They may be sampled or discarded under pressure, provided the discard is counted and reported.

### 10.6 Retention classes

Retention is separate from priority:

```text
RETAIN_UNTIL_ACCEPTED
RETAIN_UNTIL_TERMINAL_REJECT
RETAIN_FOR_AUDIT_PERIOD
RETAIN_UNTIL_BUCKET_CLOSED
BEST_EFFORT_EXPIRABLE
```

No retention policy may delete an event that is required by an active operation, Evidence input contract, security incident or immutable audit chain.

---

## 11. Storage Pressure and Full Queue

The queue shall expose:

```text
NORMAL
LOW
CRITICAL
FULL
CRITICAL_PERSISTENCE_FAILURE
UNKNOWN
```

When the queue is `LOW` or `CRITICAL`, it shall:

```text
retain P0 and P1 events
apply safe P3 sampling/discard rules
run only permitted queue cleanup
emit pressure telemetry
notify Runtime/Cloud when possible
preserve local playback
```

When the queue is `FULL`:

- P0 persistence remains mandatory;
- P1 retention follows its contract;
- P3 events may be dropped and counted;
- P2 events may be batched or dropped only according to retention;
- no OS, identity, Recovery, OTA or content data is deleted;
- playback does not stop solely because a best-effort event cannot be queued;
- failure to persist a critical event is a security/operational incident.

### 11.1 Critical event capacity

The Hardware Profile/Installation Profile shall reserve capacity for P0 events and their integrity metadata. A profile that cannot preserve its mandatory P0 volume cannot claim the corresponding telemetry capability without an explicit degraded state.

---

## 12. Batching, Retry and Backoff

### 12.1 Batch

Cloud synchronization may batch events, but batching shall not change event identities, sequence numbers, timestamps, signatures or hash chains.

```text
TelemetryBatch
|- batch_id
|- device_identity_reference
|- stream_ranges[]
|- event_references[]
|- first_sequence
|- last_sequence
|- batch_hash
|- transport_attempt
```

### 12.2 Retry identity

Every retry uses the same `telemetry_event_id`, `queue_record_id` and logical operation identity. A transport retry is not a new event.

### 12.3 Backoff

Retry delay shall follow the versioned operational policy, with bounded backoff and jitter where supported. The exact numeric parameters are configuration, but the observable invariants are mandatory:

```text
no busy-loop retry
no unbounded retry storm
critical events remain eligible
retry state survives reboot
same event identity is reused
```

### 12.4 Retry outcomes

The synchronizer shall distinguish:

```text
ACCEPTED
ALREADY_ACCEPTED
RETRYABLE_FAILURE
PERMANENT_REJECTION
NOT_EVALUATED
REVOKED
SCHEMA_UNSUPPORTED
```

A permanent rejection preserves the original event and reason. It is not silently converted into acceptance or deleted without the retention policy.

---

## 13. Deduplication and Idempotency

### 13.1 Deduplication key

The canonical deduplication identity is `telemetry_event_id` within the declared device and producer scope. If an event is a derivative batch or result, its own operation identity is also retained.

### 13.2 Duplicate event

Receiving the same event identity and identical digest returns the original acceptance/result. It shall not create a second ledger observation or side effect.

The same identity with a different digest is an integrity conflict:

```text
reject duplicate
preserve both references for diagnosis
raise TEL_EVENT_IDENTITY_CONFLICT
```

### 13.3 Acknowledgement

Cloud acknowledgement shall identify accepted, duplicate, rejected and not-evaluated event IDs explicitly. A generic batch-level success is insufficient for deleting local records.

---

## 14. Cloud Synchronization

### 14.1 Synchronization handshake

The synchronizer shall authenticate the device and establish:

```text
device identity
Telemetry contract version
consumer compatibility context
last acknowledged stream cursors
revocation and security state
batch limits and policy version
```

Authentication and authorization follow `EDGE_SECURITY.md`. Network reachability alone does not authorize synchronization.

### 14.2 Cursor and acknowledgement

Synchronization shall use explicit per-stream cursors or event acknowledgements. The Edge shall retain events until the Cloud result satisfies their retention policy.

The synchronizer shall not advance a cursor over an unacknowledged critical event unless the protocol explicitly records a gap and terminal reason.

### 14.3 Gaps and out-of-order events

Cloud may receive an event out of source order. It shall preserve sequence metadata, identify missing ranges and request or record a gap according to the contract.

The Edge shall not fill a gap with an invented event and shall not renumber later events.

### 14.4 Reconnection sequence

After reconnection:

```text
authenticate device
      |
      v
validate contract and revocation state
      |
      v
reconcile cursors
      |
      v
send P0/P1 backlog
      |
      v
send P2/P3 according to quota and retention
      |
      v
persist Cloud acknowledgements
      |
      v
advance or retain local queue records
```

Reconnection shall not alter original event occurrence timestamps or source sequence.

### 14.5 Cloud unavailable during critical incident

When Cloud cannot be reached during a critical event, the Edge persists the event locally and emits a local security/operational alarm. It shall not drop the event merely because acknowledgement is unavailable.

---

## 15. Telemetry Ledger and Immutable Buckets

### 15.1 Accepted observation

Telemetry Context may accept a verified event into the Telemetry Ledger when schema, identity, integrity, compatibility and retention checks pass.

Accepted observations are append-only. Corrections are new observations referencing the original; existing observations are not destructively rewritten.

### 15.2 Telemetry Ledger

```text
TelemetryLedgerEntry
|- ledger_entry_id
|- telemetry_event_id
|- event_reference
|- acceptance_result
|- accepted_at
|- verifier_reference
|- source_sequence
|- hash_chain_reference
|- retention_reference
|- entry_hash
```

The Ledger is not an Evidence Ledger and does not mark playback legally valid.

### 15.3 Minute buckets

When the applicable Telemetry contract aggregates observations, the canonical Edge bucket is an immutable one-minute bucket:

```text
TelemetryBucket
|- bucket_id
|- device_identity_reference
|- stream_reference
|- start_time
|- end_time
|- source_event_ranges[]
|- observations[]
|- completeness_state
|- bucket_hash
|- schema_version
|- created_at
```

Buckets are observations, not truth claims. A closed bucket is never edited; a late or corrected observation creates a new event or correction reference.

The platform's current aggregation policy normally transmits buckets in batches of five minutes and uses them to feed a fifteen-minute projection window. These batching/window parameters do not change bucket immutability or event identity.

### 15.4 AudienceProjection

`AudienceProjection` is a versioned internal Telemetry projection derived from accepted observations and buckets. It is not an EvidenceRecord and does not authorize pricing or legal conclusions.

Pricing, Analytics, Marketplace and AI consume it through explicit contracts. They do not write or reinterpret its source ledger.

---

## 16. Event Families and Priority Defaults

The following defaults apply unless the source contract declares a stricter policy:

| Event family | Producer | Default priority | Default retention |
| --- | --- | --- | --- |
| Playback fact/signature | Playback/Player | P0 | until accepted / audit policy |
| Security incident | Security | P0 | until accepted / audit policy |
| Identity/key operation | Security/Identity | P0 | until terminal/audit policy |
| OTA activation/rollback | OTA | P0 | until accepted / audit policy |
| Recovery transition/result | Recovery | P0 | until accepted / audit policy |
| Active content corruption | Content Store | P0 | until Recovery/audit policy |
| Player health transition | Player/OS | P1 | operational retention |
| Storage pressure | Content Store/OS | P1 | operational retention |
| Network transition | OS/Runtime | P1 | operational retention |
| Snapshot commit/fallback | Content Store | P1 | operational retention |
| Periodic hardware metrics | OS/Runtime | P2 | policy-defined |
| Periodic audience/health bucket | Telemetry | P2 | policy-defined |
| Repeated heartbeat/debug sample | Runtime | P3 | best effort |

Source contracts may promote priority but may not demote a P0 event that is required for Evidence, security, identity, OTA or Recovery integrity.

---

## 17. Telemetry Security and Privacy

### 17.1 Secure transport

Device-to-Cloud telemetry shall use the authenticated secure transport defined by `EDGE_SECURITY.md`. Plain HTTP shall not carry protected telemetry, credentials, manifests, identity references that require confidentiality or security events.

### 17.2 Device authentication

The Edge authenticates through `DeviceKey` proof of possession or the authorized certificate-bound mechanism. MAC address, IP address or a shared public token is not sufficient.

### 17.3 Replay protection

Telemetry synchronization shall use:

```text
telemetry_event_id
batch_id
nonce/challenge, when required
sequence and monotonic counter
payload/event digest
signature or authenticated channel
acknowledgement identity
```

Replayed events are deduplicated or rejected deterministically. They shall not create duplicate Playback facts, bucket observations or side effects.

### 17.4 Secret protection

Telemetry shall never contain:

```text
DeviceKey private material
certificate private material
passwords
bearer tokens
encryption keys
identity reset secrets
network credentials
raw protected content
```

Opaque references, digests and redacted diagnostics may be emitted when authorized.

### 17.5 Privacy minimization

Telemetry shall collect only data required by the authorized source and consumer contract. Optional camera, Wi-Fi, audience or presence measurements shall expose availability and quality without inventing a value when the device is absent.

### 17.6 Tamper response

Queue, ledger, hash-chain or identity integrity failure shall produce an explicit security/telemetry result and follow the Security/Recovery contract. It shall not be repaired silently by deleting the affected history.

---

## 18. TelemetryResult

Every queue, batch or synchronization operation shall produce an immutable `TelemetryResult` or an idempotent reference to the same result:

```text
TelemetryResult
|- telemetry_operation_id
|- device_identity_reference
|- stream_references[]
|- event_references[]
|- batch_reference
|- local_persistence_result
|- verification_result
|- synchronization_result
|- accepted_event_ids[]
|- duplicate_event_ids[]
|- rejected_event_ids[]
|- not_evaluated_event_ids[]
|- gap_references[]
|- retry_result
|- queue_state
|- retention_result
|- final_state
|- error_references[]
|- evidence_references[]
|- started_at
|- completed_at
|- result_hash
```

### 18.1 Final states

```text
PERSISTED_LOCALLY
SYNCHRONIZED
PARTIALLY_SYNCHRONIZED
QUEUED
REJECTED
NOT_EVALUATED
FAILED
DEGRADED
CRITICAL_PERSISTENCE_FAILURE
```

`SYNCHRONIZED` means Cloud returned a result for the retained events; it does not mean that every event became Evidence. `NOT_EVALUATED` means a compatibility, authorization or infrastructure decision could not be produced and is not an approval.

---

## 19. Error Catalog

The following telemetry error identities are normative:

```text
TEL_EVENT_INVALID
TEL_EVENT_SCHEMA_UNSUPPORTED
TEL_EVENT_IDENTITY_MISSING
TEL_EVENT_IDENTITY_CONFLICT
TEL_EVENT_ORIGIN_UNKNOWN
TEL_EVENT_TIMESTAMP_INVALID
TEL_EVENT_TIME_UNTRUSTED
TEL_EVENT_SEQUENCE_INVALID
TEL_EVENT_SEQUENCE_GAP
TEL_EVENT_DUPLICATE_CONFLICT
TEL_EVENT_PAYLOAD_DIGEST_MISMATCH
TEL_EVENT_HASH_CHAIN_BROKEN
TEL_EVENT_SIGNATURE_INVALID
TEL_EVENT_KEY_REVOKED
TEL_EVENT_KEY_UNAVAILABLE
TEL_EVENT_REPLAY_DETECTED
TEL_EVENT_SECRET_DETECTED
TEL_EVENT_PROFILE_MISMATCH
TEL_EVENT_AUTHORIZATION_INVALID
TEL_QUEUE_UNAVAILABLE
TEL_QUEUE_CORRUPTED
TEL_QUEUE_FULL
TEL_QUEUE_CRITICAL_PERSISTENCE_FAILURE
TEL_QUEUE_RESERVE_VIOLATION
TEL_QUEUE_STORAGE_UNAVAILABLE
TEL_RETRYABLE_TRANSPORT_FAILURE
TEL_RETRY_POLICY_INVALID
TEL_BACKOFF_EXHAUSTED
TEL_BATCH_INVALID
TEL_BATCH_DIGEST_MISMATCH
TEL_ACK_UNKNOWN
TEL_ACK_CONFLICT
TEL_SYNC_NOT_AUTHORIZED
TEL_SYNC_UNAVAILABLE
TEL_SYNC_SCHEMA_UNSUPPORTED
TEL_SYNC_GAP_UNRESOLVED
TEL_SYNC_CURSOR_INVALID
TEL_LEDGER_REJECTED
TEL_BUCKET_INCOMPLETE
TEL_BUCKET_INTEGRITY_FAILED
TEL_PROJECTION_REBUILD_FAILED
TEL_RETENTION_CONFLICT
TEL_REDACTION_FAILED
TEL_RESULT_SEAL_FAILED
TEL_NOT_EVALUATED
```

Each error shall declare phase, retryability, recoverability, priority impact, retention behavior and required source/Cloud action.

---

## 20. Normative Requirements

### TEL-001

Telemetry shall remain distinct from Fact, Evidence and Log.

### TEL-002

Telemetry shall not materialize Evidence or decide legal, financial or responsibility outcomes.

### TEL-003

Each `TelemetryEvent` shall have immutable identity, producer origin, schema version, device identity and integrity metadata.

### TEL-004

`EdgeInstallationId` shall be the primary device identity; MAC, IP, Android ID and commercial serial shall not replace it.

### TEL-005

Local, trusted and captured timestamps shall remain distinct and preserve time quality.

### TEL-006

Sequence numbers and monotonic counters shall preserve source ordering without renumbering historical events.

### TEL-007

Correlation, causation and origin references shall be preserved for every event that participates in an operation.

### TEL-008

Event schemas and producer versions shall be explicit, immutable and compatible only through an explicit consumer contract.

### TEL-009

Payload digest and event integrity shall be verified before acceptance.

### TEL-010

Hash chaining or an explicitly declared equivalent integrity mechanism shall preserve the integrity of supported telemetry streams.

### TEL-011

Required signatures shall be produced through the authorized identity boundary without exposing DeviceKey private material.

### TEL-012

Telemetry shall be persisted locally before durable acknowledgement whenever the event's retention policy requires it.

### TEL-013

Telemetry shall continue to operate offline within the quotas of `EDGE_OFFLINE_STORAGE.md`.

### TEL-014

Retries shall reuse the same event and operation identities and shall be idempotent.

### TEL-015

Backoff shall prevent retry storms and preserve critical event eligibility.

### TEL-016

Cloud acknowledgements shall identify accepted, duplicate, rejected and not-evaluated events explicitly.

### TEL-017

Sequence gaps and out-of-order delivery shall remain visible and shall not be filled by invented events.

### TEL-018

P0 critical events shall not be discarded by ordinary storage pressure.

### TEL-019

P3 best-effort events may be sampled or discarded only under the declared loss policy, with loss counted and reported.

### TEL-020

Storage-full behavior shall preserve critical events and shall not delete OS, identity, Recovery, OTA or Local Content Store data.

### TEL-021

Telemetry shall preserve hardware, OS, Player, Playback, Content Store, OTA, Recovery, Security and Network event origins.

### TEL-022

Playback facts transported by Telemetry shall remain owned by Playback and shall be sent to Evidence Ledger for validation when applicable.

### TEL-023

Telemetry buckets shall be immutable observations; late or corrected observations shall be new records.

### TEL-024

AudienceProjection shall remain an internal Telemetry projection and shall not become a source of Evidence or financial authority.

### TEL-025

Offline synchronization shall preserve original timestamps, sequence, identity, hashes and event ordering metadata.

### TEL-026

Telemetry shall reject or quarantine unknown schemas, profiles, keys, origins and compatibility states instead of inferring trust.

### TEL-027

Telemetry queue and ledger integrity failures shall produce explicit security and Recovery signals.

### TEL-028

Telemetry shall not emit private keys, credentials, tokens, encryption keys, identity-reset secrets or unnecessary protected content.

### TEL-029

Every queue, batch and synchronization operation shall produce an immutable `TelemetryResult` or an idempotent reference.

### TEL-030

Telemetry retention shall be policy-versioned and shall preserve events required for Evidence input, security, OTA, Recovery and audit.

### TEL-031

Telemetry shall not alter Campaign, Pricing, Financial, Settlement or Evidence state.

### TEL-032

The Edge shall never claim Cloud acceptance, Evidence validity or financial effect solely because an event was locally generated or queued.

---

## 21. Completion Criteria

The Edge Telemetry contract is implementable for a target when its Hardware Profile, Installation Profile, OS, Security and Offline Storage contracts provide:

```text
device identity and stream scope
timestamp and time-quality policy
sequence and monotonic counter capability
event schema and compatibility context
integrity/signature policy
local queue storage and reserved capacity
priority and retention policy
retry/backoff and acknowledgement contract
offline and reconnection behavior
source event families
bucket and projection policy
security/redaction policy
TelemetryResult and error contract
```

Any missing mandatory input produces an explicit unavailable, rejected or not-evaluated result. It never authorizes fabricated telemetry.

---

## 22. Relationship to Other Specifications

```text
EDGE_HARDWARE_PROFILES.md
        |
        v
EDGE_INSTALLATION_PROFILES.md
        |
        +--> EDGE_SECURITY.md
        +--> EDGE_OFFLINE_STORAGE.md
        +--> EDGE_PLAYER_SPECIFICATION.md
        +--> EDGE_OTA.md
        +--> EDGE_RECOVERY.md
        |
        v
EDGE_TELEMETRY.md
        |
        +--> Telemetry Ledger
        +--> AudienceProjection
        +--> downstream consumers
```

Telemetry consumes operational observations from the Edge layers but does not take ownership of their domain facts. Evidence Ledger remains the only authority for materializing Evidence from eligible Playback facts.

---

## 23. Next Review

Before implementation, the architecture review shall verify:

```text
all source producers have unique event ownership
Playback facts remain distinct from Telemetry transport
queue quotas do not threaten OS/identity/content reserves
P0 retention and offline durability are feasible for each Hardware Profile
schema and consumer compatibility are explicit
deduplication and replay behavior is deterministic
Cloud acknowledgement preserves gaps and rejects
Telemetry does not create Evidence or financial effects
```

No device, sensor, camera, Wi-Fi adapter, event family or audience metric becomes a guaranteed capability merely because it appears in this specification. The active Hardware Profile and source contracts must prove what is available.
