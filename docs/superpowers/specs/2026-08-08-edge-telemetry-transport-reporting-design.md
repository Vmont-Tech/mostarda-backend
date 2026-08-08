# Edge Telemetry Transport and Reporting Design

**Status:** Approved design candidate  
**Date:** 2026-08-08  
**Scope:** Edge Runtime, Telemetry Context and their transport/reporting contracts  
**Authority:** DEC-063, DEC-064, DEC-065, Telemetry Implementation Gate V1 and the approved decisions recorded during this design session

## 1. Purpose

This design defines how the Edge Runtime transports telemetry observations and operational incidents to the Cloud without interrupting playback, inventing measurements or mutating historical observations.

It defines transport, message families, lifecycle, acknowledgment, offline behavior, integrity, authentication, compatibility, status presentation and operational diagnostics. It does not define pricing formulas, Evidence materialization, legal responsibility, camera models, Wi-Fi hardware, broker products or database technology.

## 2. Architectural boundaries

Edge Runtime acquires local observations and produces facts. It does not calculate price, materialize Evidence, assign responsibility, reinterpret audience, or decide commercial consequences.

Telemetry Context owns validation, acceptance/rejection and the Telemetry Ledger. AudienceProjection remains an internal, versioned projection of Telemetry Context. Pricing, Analytics, Marketplace and AI are consumers.

Playback remains the source of authoritative execution facts from which Evidence Ledger may materialize Evidence. Telemetry and Audience never generate Evidence.

QR and tag interactions bypass Edge and communicate directly with their authorized Cloud/Quantum flows.

## 3. Transport contract

The normative transport is Protobuf over conventional HTTPS.

```text
HTTPS = HTTP + TLS
```

The transport profile is:

- TLS 1.2 minimum for production;
- TLS 1.3 when supported;
- HTTP/1.1 mandatory compatibility baseline;
- HTTP/2 optional when available;
- Protobuf as the telemetry body format;
- JSON permitted for diagnostics, administration and human-facing APIs;
- plain HTTP permitted only for local development;
- gRPC is not required by this contract.

The Edge does not require a browser to communicate with Cloud. Browser compatibility is therefore independent of Edge transport compatibility. The public panel may use HTTPS and JSON while Edge uses HTTPS and Protobuf.

Compression is an optional transport optimization for batches. It cannot change payload semantics, identity, hashes, signatures, ordering or acknowledgment behavior.

## 4. Message families

The transport exposes four conceptual message families.

### 4.1 TelemetryBucket

One immutable observation record for one civil minute. The complete schema and invariants remain those certified in the Telemetry Implementation Gate V1.

The bucket preserves:

- bucket and installation identities;
- exact half-open interval;
- sequence and ordering key;
- capability observations;
- aggregate measurements;
- all independent schema, collector, capability and policy versions;
- payload, event and sequence-chain integrity references;
- Edge authenticity proof;
- observed time.

### 4.2 TelemetryBatch

An envelope containing up to five independently identifiable minute buckets that have not received a final acknowledgment. The batch does not merge, rewrite or renumber buckets.

Each bucket is validated and acknowledged independently. One invalid bucket cannot invalidate other buckets in the same batch.

### 4.3 EdgeTelemetryIncidentReported

A compact operational message emitted immediately when communication is possible for collection, storage, sequencing, integrity or transport conditions. It is not a TelemetryBucket and cannot be accepted as one.

### 4.4 ShiftClosureReport

A reconciliation message containing references and totals for one configured operating shift. It is not the source of truth and cannot replace minute buckets or incident messages.

## 5. Capability states

The only normative capability states are:

| State | Meaning |
|---|---|
| `AVAILABLE` | Collection executed normally and produced a valid observation. |
| `UNAVAILABLE` | Collection is temporarily unavailable although the capability may be expected. |
| `DISABLED` | Collection is not enabled for the installation. |
| `DEGRADED` | Collection executed partially or below its normal quality. |
| `FAILED` | The collector attempted operation and failed. |

The transport may reserve numeric value `0` as unspecified, but the domain rejects unspecified as a capability state. Wire numbers are technical materialization and must remain stable once published.

Examples:

- no webcam enabled for the installation → `DISABLED`;
- configured webcam temporarily unreachable → `UNAVAILABLE`;
- partial camera or Wi-Fi result → `DEGRADED`;
- collector process failure → `FAILED`;
- complete collection → `AVAILABLE`.

Missing measurements are never replaced by zero, a default or an estimate.

## 6. Bucket lifecycle

The Edge closes one bucket per civil minute, persists the original bytes locally, and places the bucket in the outbound queue.

The Edge is forward-only:

- it never reopens a closed bucket;
- it never changes a payload after closure;
- it never recalculates hashes for a prior bucket;
- it never reuses an identity for corrected content;
- it never pauses playback because telemetry failed;
- it continues producing later buckets.

If an invalid bucket is detected locally, the Edge records the defect and continues. It does not convert the defective item into a valid bucket.

## 7. Batch and acknowledgment flow

```text
close minute bucket
    ↓
persist immutable bytes locally
    ↓
include up to five pending buckets in TelemetryBatch
    ↓
serialize as Protobuf
    ↓
sign and send over HTTPS
    ↓
Cloud validates each bucket independently
    ↓
Cloud acknowledges each bucket
    ↓
Edge removes only final outcomes from the pending queue
```

The Cloud acknowledgment result is exactly one of:

- `ACCEPTED`: bucket appended as an accepted observation;
- `DUPLICATE`: the same identity and canonical content were already accepted;
- `REJECTED`: the bucket failed a deterministic validation rule and was not appended;
- `CONFLICT`: the same identity was associated with different canonical content;
- `COMPATIBILITY_NOT_EVALUATED`: the required compatibility matrix could not be loaded or evaluated.

`DUPLICATE` is a successful idempotent terminal outcome. `REJECTED` and `CONFLICT` are terminal for that bucket and generate diagnostics. `COMPATIBILITY_NOT_EVALUATED` is not incompatibility; it permits retry with the same operation identity and original bytes.

## 8. Offline queue and retry

When Cloud is unavailable, the Edge retains the original bucket bytes and metadata locally. Retry reuses the same bucket identity, event identity, sequence, hashes, signature and canonical content.

The queue preserves:

- `bucketId`;
- `eventId`;
- sequence;
- original payload bytes;
- payload/event/sequence hashes;
- authenticity proof;
- observed interval;
- attempt count;
- last transport and acknowledgment result.

The queue never reorders buckets, changes timestamps, rewrites content, recalculates integrity references, creates a replacement identity or silently drops an item.

If local capacity is exhausted, the Edge emits `LOCAL_STORAGE_FAILURE`, preserves playback and reports the loss or retention limitation when communication returns.

## 9. Rejection and incident semantics

`TelemetryBucketRejected` contains exactly one deterministic rejection reason:

```text
IDENTITY_NOT_AUTHORIZED
AUTHENTICITY_PROOF_INVALID
TELEMETRY_SCHEMA_UNSUPPORTED
INTERVAL_INVALID
SEQUENCE_GAP
SEQUENCE_REPLAY_CONFLICT
PAYLOAD_HASH_MISMATCH
EVENT_HASH_MISMATCH
PREVIOUS_SEQUENCE_HASH_MISMATCH
COLLECTION_POLICY_INVALID
```

`EdgeTelemetryIncidentReported` may contain multiple independent operational codes, ordered deterministically by severity and detection time, without duplicates:

```text
COLLECTOR_NOT_AVAILABLE
COLLECTOR_PROCESS_FAILED
DEVICE_NOT_DETECTED
INVALID_CAPTURE_OUTPUT
LOCAL_STORAGE_FAILURE
SIGNATURE_FAILURE
BUCKET_CONSTRUCTION_FAILURE
NETWORK_UNAVAILABLE
```

The canonical code name is normative. Protobuf numeric assignments are transport materialization and must remain stable after publication. A code has a documented meaning, source, severity, retryability and consumer. Generic labels such as `ERROR_1` are prohibited.

Absence of an optional camera, Wi-Fi adapter or other collector is represented by capability state and does not, by itself, reject the bucket or stop operation.

## 10. Shift closure

`ShiftClosureReport` contains only reconciliation data:

- shift identity;
- Edge installation identity;
- first and last interval;
- bucket count;
- batch count;
- accepted count;
- duplicate count;
- rejected count;
- conflict count;
- incident count;
- missing intervals;
- last sequence;
- last sequence hash;
- Edge signature.

The closure report references and summarizes immutable records. It cannot replace, edit or reinterpret them.

## 11. Integrity, confidentiality and authenticity

Hashing is not encryption and no hash is decryptable.

The contract uses:

```text
HTTPS/TLS             → confidentiality in transit
PayloadHash           → payload integrity
EventHash             → envelope integrity
PreviousSequenceHash  → sequence continuity
Edge signature        → source authenticity
```

Each hash declares its purpose and canonicalization version. A single ambiguous field named only `hash` is prohibited.

The Cloud validates identity, signature, schema, sequence, interval, hash references and compatibility before accepting a bucket.

## 12. Privacy and data minimization

The default contract transports aggregate observations, not raw camera frames, raw MAC addresses or unnecessary personal data.

A collector may report quantity, coverage, quality, confidence, algorithm version and observation interval only when authorized by its contract and policy. The Edge never fabricates missing measurements.

Secrets, private keys, credentials and complete sensitive payloads never appear in operational logs.

## 13. Visual presentation

Colors are projections for dashboards, logs and operational panels. They are not sent by the Edge and never affect domain behavior.

| Visual | Meaning |
|---|---|
| Green | `OK`: accepted or operating normally. |
| Yellow | `ATTENTION`: degraded, unavailable or pending retry. |
| Red | `ERROR`: failure, rejection, conflict or integrity problem. |
| Gray | `NOT APPLICABLE`: capability disabled or not installed. |
| Blue | `INFORMATION`: duplicate idempotency, synchronization or shift closure. |

Every color is accompanied by text and an icon. Visual mapping is versioned configuration and cannot rewrite historical records or alter price, responsibility or validity.

## 14. Compatibility boundary

The Telemetry Context initially accepts only the exact `TelemetrySchemaVersion` identity `v1` through its consumer-owned CompatibilityMatrix.

Other version identities may be preserved as opaque values in a bucket, but they do not authorize interpretation. Missing matrix entries produce `UNSUPPORTED / ENTRY_NOT_FOUND`. Matrix unavailability produces `COMPATIBILITY_NOT_EVALUATED` and permits deterministic retry.

Collector, capability, collection-policy, hash-canonicalization and signature-algorithm versions remain independent identities. They are not silently interpreted as schema compatibility.

## 15. Observability

Operational records preserve:

- event identity;
- Edge installation identity;
- bucket identity when applicable;
- sequence;
- code;
- observed and recorded times;
- causation and correlation;
- result;
- schema and policy identities.

The following concrete event families are preserved:

```text
TelemetryBucketClosed
TelemetryBucketAccepted
TelemetryBucketRejected
EdgeTelemetryIncidentReported
BatchAcknowledged
ShiftClosureReceived
```

Each event has one authoritative producer. Duplicate delivery never duplicates an effect.

## 16. Explicit non-goals

This design does not choose:

- pricing algorithms or dynamic-price thresholds;
- Evidence creation or legal responsibility;
- broker/provider product;
- database or storage engine;
- camera or Wi-Fi hardware model;
- sampling frequency inside a minute;
- local queue capacity number;
- retention duration;
- TLS certificate authority or deployment topology;
- protobuf field numbers before contract generation.

These are separate technical or domain decisions and cannot be inferred from this design.

## 17. Acceptance criteria for the next plan

The implementation plan may begin only after this design is accepted and must include tests for:

- Protobuf-over-HTTPS transport envelope;
- complete minute bucket and five-minute batch boundaries;
- independent acknowledgment outcomes;
- offline queue preservation and idempotent retry;
- forward-only rejection behavior;
- multiple incident-code ordering without duplication;
- all capability states and missing-versus-zero semantics;
- hashes, signatures and sequence continuity;
- exact schema-version compatibility behavior;
- shift closure reconciliation;
- visual projection without domain coupling;
- absence of compatibility evaluators or PARTIAL artifacts in the package surface.
