# Telemetry Implementation Gate V1

**Status:** mechanical code-generation gate  
**Normative domain source:** `docs/domain/TELEMETRY.md` (`DEC-063`)  
**Scope:** value contracts, the immutable minute bucket, acceptance/rejection events, and the immutable audience projection record

READY_MANIFEST: ["TelemetryBucketId","AudienceProjectionId","TelemetryEventId","TelemetryCapabilityStatus","TelemetrySchemaVersion","CollectorVersion","CapabilityVersion","CollectionPolicyVersion","AudienceProjectionVersion","AudienceProjectionPolicyVersion","TelemetryBucket","TelemetryBucketAccepted","TelemetryBucketRejected","AudienceProjection"]
PARTIAL_MANIFEST: ["TelemetryCaptured","TelemetryBucketClosed","EdgeTelemetryCapabilityChanged","EdgeTelemetryIncidentReported","TelemetryValidationIncidentReported","TelemetryCapabilityChanged","TelemetryIncidentReported","CapabilityDeclared","CapabilityValidated","CapabilityRejected","CapabilityActivated","CapabilityDegraded","CapabilitySuspended","CapabilityRecovered","CapabilityRetired","AudienceProjectionApplier","AudienceProjectionProduced","AudienceProjectionExpired","AudienceProjectionInvalidated"]

This gate certifies only the names marked `IMPLEMENTATION_READY` below. The following are not authorized: adapters; not authorized: ingestion services; not authorized: API; not authorized: repositories; not authorized: topics; not authorized: brokers. Persistence mappings, transport envelopes, and deployment resources are likewise excluded. An artifact absent from the READY list remains denied by CGS-A-1. Public event families not concretized here remain non-READY.

## 1. Mechanical certification matrix

| Artifact | Status | Unique owner | Producer where applicable | Dependencies |
| --- | --- | --- | --- | --- |
| `TelemetryBucketId` | `IMPLEMENTATION_READY` | Telemetry Context | none; value type | UTF-8 string validation |
| `AudienceProjectionId` | `IMPLEMENTATION_READY` | Telemetry Context | none; value type | UTF-8 string validation |
| `TelemetryEventId` | `IMPLEMENTATION_READY` | Telemetry Context | none; value type | UTF-8 string validation |
| `TelemetryCapabilityStatus` | `IMPLEMENTATION_READY` | Telemetry Context contract; Edge observes the value | Edge Runtime collector | none |
| `TelemetrySchemaVersion` | `IMPLEMENTATION_READY` | Telemetry Context | none; value type | UTF-8 string validation |
| `CollectorVersion` | `IMPLEMENTATION_READY` | Edge Runtime | Edge Runtime collector | UTF-8 string validation |
| `CapabilityVersion` | `IMPLEMENTATION_READY` | TV Network capability owner | TV Network capability owner | UTF-8 string validation |
| `CollectionPolicyVersion` | `IMPLEMENTATION_READY` | Telemetry Context | none; value type | UTF-8 string validation |
| `AudienceProjectionVersion` | `IMPLEMENTATION_READY` | Telemetry Context | none; value type | UTF-8 string validation |
| `AudienceProjectionPolicyVersion` | `IMPLEMENTATION_READY` | Telemetry Context | none; value type | UTF-8 string validation |
| `TelemetryBucket` | `IMPLEMENTATION_READY` | Telemetry Context owns the acquisition contract; Edge Runtime produces instances | Edge Runtime | READY value contracts above; opaque external references |
| `TelemetryBucketAccepted` | `IMPLEMENTATION_READY` | Telemetry Context | Telemetry Context validator, after ledger append | `TelemetryBucket`, `TelemetryEventId` |
| `TelemetryBucketRejected` | `IMPLEMENTATION_READY` | Telemetry Context | Telemetry Context validator, without accepted-observation append | `TelemetryBucketId`, `TelemetryEventId` |
| `AudienceProjection` | `IMPLEMENTATION_READY` | Telemetry Context | projection builder is outside this gate | accepted bucket identities and READY versions |
| `TelemetryCaptured` | `IMPLEMENTATION_PARTIAL` | Edge Runtime | Edge Runtime | complete v1 payload/error schema absent |
| `TelemetryBucketClosed` | `IMPLEMENTATION_PARTIAL` | Telemetry acquisition contract | Edge Runtime | complete v1 payload/error schema absent |
| `EdgeTelemetryCapabilityChanged` | `IMPLEMENTATION_PARTIAL` | Edge Runtime | Edge Runtime | complete v1 payload/error schema absent |
| `EdgeTelemetryIncidentReported` | `IMPLEMENTATION_PARTIAL` | Edge Runtime | Edge Runtime | complete v1 payload/error schema absent |
| `TelemetryValidationIncidentReported` | `IMPLEMENTATION_PARTIAL` | Telemetry Context | Telemetry Context | complete v1 payload/error schema absent |
| `TelemetryCapabilityChanged` | `IMPLEMENTATION_PARTIAL` | conceptual family only | none | not a concrete event artifact |
| `TelemetryIncidentReported` | `IMPLEMENTATION_PARTIAL` | conceptual family only | none | not a concrete event artifact |
| `CapabilityDeclared` | `IMPLEMENTATION_PARTIAL` | TV Network capability owner | TV Network capability owner | complete telemetry-use contract absent |
| `CapabilityValidated` | `IMPLEMENTATION_PARTIAL` | TV Network capability owner | TV Network capability owner | complete telemetry-use contract absent |
| `CapabilityRejected` | `IMPLEMENTATION_PARTIAL` | TV Network capability owner | TV Network capability owner | complete telemetry-use contract absent |
| `CapabilityActivated` | `IMPLEMENTATION_PARTIAL` | TV Network capability owner | TV Network capability owner | complete telemetry-use contract absent |
| `CapabilityDegraded` | `IMPLEMENTATION_PARTIAL` | TV Network capability owner | TV Network capability owner | complete telemetry-use contract absent |
| `CapabilitySuspended` | `IMPLEMENTATION_PARTIAL` | TV Network capability owner | TV Network capability owner | complete telemetry-use contract absent |
| `CapabilityRecovered` | `IMPLEMENTATION_PARTIAL` | TV Network capability owner | TV Network capability owner | complete telemetry-use contract absent |
| `CapabilityRetired` | `IMPLEMENTATION_PARTIAL` | TV Network capability owner | TV Network capability owner | complete telemetry-use contract absent |
| `AudienceProjectionApplier` | `IMPLEMENTATION_PARTIAL` | Telemetry Context | none | replay metadata and complete transitions absent |
| `AudienceProjectionProduced` | `IMPLEMENTATION_PARTIAL` | Telemetry Context | Telemetry Context | complete v1 event/replay contract absent |
| `AudienceProjectionExpired` | `IMPLEMENTATION_PARTIAL` | Telemetry Context | Telemetry Context | complete v1 event/replay contract absent |
| `AudienceProjectionInvalidated` | `IMPLEMENTATION_PARTIAL` | Telemetry Context | Telemetry Context | complete v1 event/replay contract absent |

The conceptual families `TelemetryCapabilityChanged` and `TelemetryIncidentReported` are not concrete artifacts and are not authorized. No READY artifact authorizes a dependency by association.

## 2. Shared scalar and opaque identity contracts

All fields are required unless explicitly marked optional. `Instant` is an RFC 3339 UTC timestamp with non-zero date precision; `DurationMs` and integer counts are base-10 non-negative safe integers; lists are ordered, contain no null entries, and are immutable.

### Conceptual schema v1

- `TelemetryBucketId`, `AudienceProjectionId`, `TelemetryEventId`: non-empty opaque UTF-8 strings, compared byte-for-byte after transport decoding. They have no parseable business components.
- Each named version type is a non-empty opaque UTF-8 string: `TelemetrySchemaVersion`, `CollectorVersion`, `CapabilityVersion`, `CollectionPolicyVersion`, `AudienceProjectionVersion`, and `AudienceProjectionPolicyVersion`. Types are not interchangeable.
- `TelemetryCapabilityStatus` is exactly `AVAILABLE | UNAVAILABLE | DISABLED | DEGRADED | FAILED`.
- External references (`TVId`, `VenueId`, `EdgeInstallationId`, `DeviceId`, `PlayerInstallationId`, `CampaignId`) are opaque non-empty strings owned by their source contexts. Their presence here does not authorize their generation. `PlayerInstallationId` and `CampaignId` are optional; omission, rather than an empty sentinel, means not applicable/not permitted.
- `CanonicalHash` is `{ algorithm: "SHA-256"; canonicalizationVersion: non-empty string; digestBase64Url: non-empty unpadded base64url string }`.
- `ConfidenceMetric` is `{ metricName: non-empty string; metricValue: finite number encoded by the owning policy; policyVersion: AudienceProjectionPolicyVersion }`. No range or probability meaning is implied.

### Error codes

Scalar construction returns exactly `EMPTY_OPAQUE_VALUE`, `INVALID_INSTANT`, `INVALID_NON_NEGATIVE_INTEGER`, `INVALID_BASE64URL`, `UNSUPPORTED_HASH_ALGORITHM`, or `NON_FINITE_CONFIDENCE`. A wrong semantic version type is a compile-time type error.

### Lifecycle and terminality

Values are immutable and have no lifecycle. A version or identity is never edited or reused to mean something else.

### Replay and rebuild

Decoding the same valid scalar is deterministic. Replay preserves its exact value and semantic type.

### Compatibility and version evolution

Readers accept only explicitly supported opaque version values. Unsupported values fail with `UNSUPPORTED_TELEMETRY_SCHEMA_VERSION`, `UNSUPPORTED_AUDIENCE_PROJECTION_VERSION`, or `UNSUPPORTED_POLICY_VERSION`; they are never partially interpreted. New enum members are breaking for exhaustive v1 readers.

### Dependencies

Only UTF-8, RFC 3339, safe-integer, and base64url validation; no repository or transport dependency.

### Required tests

Round-trip every opaque type; reject empty values and malformed timestamps/hashes; prove version types cannot be interchanged; exhaustively test the five capability statuses and unsupported versions.

## 3. `TelemetryBucket`

### Conceptual schema v1

`TelemetryBucket` is an immutable record with these required fields:

- `bucketId: TelemetryBucketId`
- `tvId: TVId`, `venueId: VenueId`, `edgeInstallationId: EdgeInstallationId`, `deviceId: DeviceId`
- `playerInstallationId?: PlayerInstallationId`, `campaignId?: CampaignId`
- `intervalStart: Instant`, `intervalEnd: Instant`; the half-open interval is exactly one civil minute in `venueTimeZone: non-empty IANA time-zone name`
- `sequence: non-negative safe integer`; ordering key is `edgeInstallationId`
- `capabilities: non-empty ordered list` of `{ capabilityName: non-empty string; status: TelemetryCapabilityStatus; capabilityVersion: CapabilityVersion; collectorVersion: CollectorVersion; coveragePermille: integer 0..1000; confidence?: ConfidenceMetric }`; capability names are unique within a bucket; confidence is required for `AVAILABLE` and `DEGRADED` and absent for the other statuses
- `measurements: ordered list` of `{ capabilityName: non-empty string; metricName: non-empty string; unit: non-empty string; value: finite number }`; each capability name must exist in `capabilities`, and measurements are forbidden unless its status is `AVAILABLE` or `DEGRADED`
- `telemetrySchemaVersion: TelemetrySchemaVersion`, `collectionPolicyVersion: CollectionPolicyVersion`
- `payloadHash: CanonicalHash`, `eventHash: CanonicalHash`, `previousSequenceHash?: CanonicalHash`
- `authenticityProof: { keyId: non-empty string; algorithm: non-empty string; signatureBase64Url: non-empty unpadded base64url string }`
- `observedAt: Instant`, equal to `intervalEnd`

### Error codes

Construction/validation returns exactly `INVALID_BUCKET_INTERVAL`, `INVALID_VENUE_TIME_ZONE`, `INVALID_SEQUENCE`, `DUPLICATE_CAPABILITY`, `INVALID_CAPABILITY_COVERAGE`, `MISSING_CONFIDENCE`, `UNEXPECTED_CONFIDENCE`, `UNKNOWN_MEASUREMENT_CAPABILITY`, `MEASUREMENT_FOR_UNAVAILABLE_CAPABILITY`, `NON_FINITE_MEASUREMENT`, `INVALID_INTEGRITY_REFERENCE`, `INVALID_AUTHENTICITY_PROOF`, or the shared scalar/version errors.

### Lifecycle and terminality

Construction closes the bucket. Closed is terminal: no edit, reopen, replacement, or deletion operation exists. Correction, late completion, and invalidation require a separately identified correlated fact, which is outside this gate.

### Replay and rebuild

Replay of the same `bucketId` and byte-equivalent canonical content is idempotent. The same identity with different canonical content is rejected as `BUCKET_ID_CONTENT_CONFLICT`. Rebuild reads immutable bucket values and never mutates them.

### Producer

Edge Runtime is the sole producer of `TelemetryBucket` instances. Telemetry Context validates them and does not fabricate collection facts.

### Compatibility and version evolution

Interpretation is selected only by `telemetrySchemaVersion`; collector, capability, collection-policy, hash-canonicalization, and signature algorithm values remain distinct. A v1 reader rejects unsupported values without partial decoding and preserves the original immutable envelope for any authorized future upcast.

### Dependencies

READY scalar contracts plus opaque external references. No adapter, ingestion service, API, repository, topic, broker, pricing contract, or Evidence contract is a dependency.

### Required tests

Validate a complete bucket; reject every error code; prove a one-minute half-open interval; preserve missing optional IDs; distinguish missing measurement from zero; prove closure immutability; prove identical retry idempotency and identity/content conflict; retain all independent versions and all three hash purposes.

## 4. Bucket decision events

Both records share required envelope fields: `eventId: TelemetryEventId`, `producer: "TelemetryContext"`, `causationId: non-empty string`, `correlationId: non-empty string`, `observedAt: Instant`, `recordedAt: Instant`, `eventSchemaVersion: "1"`, `orderingKey: EdgeInstallationId`, and `eventHash: CanonicalHash`.

### Conceptual schema v1

- `TelemetryBucketAccepted` adds `bucket: TelemetryBucket`, `ledgerPosition: non-negative safe integer`, and `acceptedAt: Instant`. The complete immutable bucket is the accepted observation.
- `TelemetryBucketRejected` adds `bucketId: TelemetryBucketId`, `edgeInstallationId: EdgeInstallationId`, `sequence: non-negative safe integer`, `telemetrySchemaVersion: TelemetrySchemaVersion`, `rejectedAt: Instant`, and `reasonCode`, exactly one of `IDENTITY_NOT_AUTHORIZED | AUTHENTICITY_PROOF_INVALID | TELEMETRY_SCHEMA_UNSUPPORTED | INTERVAL_INVALID | SEQUENCE_GAP | SEQUENCE_REPLAY_CONFLICT | PAYLOAD_HASH_MISMATCH | EVENT_HASH_MISMATCH | PREVIOUS_SEQUENCE_HASH_MISMATCH | COLLECTION_POLICY_INVALID`. It contains no accepted `TelemetryBucket`.

### Error codes

Envelope validation returns `INVALID_EVENT_ENVELOPE`, `INVALID_EVENT_TIME_ORDER`, `INVALID_LEDGER_POSITION`, `INVALID_REJECTION_REASON`, plus shared errors. Domain decision errors are exactly the rejection reason codes above. Duplicate `eventId` with different canonical content returns `EVENT_ID_CONTENT_CONFLICT`.

### Lifecycle and terminality

Each decision event is immutable and terminal for that submitted identity/content pair. Rejection does not append an accepted observation. A later corrected bucket uses a new bucket identity; neither event is overwritten.

### Replay and rebuild

Duplicate byte-equivalent events have no duplicate effect. Accepted replay restores the same ledger position and observation; rejected replay restores only rejection history. Conflicting duplicate identities fail.

### Producer

Telemetry Context is the sole producer, after validation. `TelemetryBucketAccepted` is emitted only after the append-only ledger write succeeds; `TelemetryBucketRejected` is emitted without that append.

### Compatibility and version evolution

`eventSchemaVersion` selects the event shape. Unknown versions and rejection codes are rejected, not mapped to a generic reason. Additive fields require a declared compatible successor; original envelopes remain preserved.

### Dependencies

READY bucket, identity, version, instant, and hash contracts. Ledger storage implementation is deliberately not authorized.

### Required tests

Test each rejection reason; accepted-after-append ordering; rejected-without-append; producer literal; time ordering (`recordedAt >= observedAt`); duplicate idempotency; conflict rejection; unsupported versions; and preservation of causation, correlation, ordering, and hashes.

## 5. `AudienceProjection` immutable record

### Conceptual schema v1

`AudienceProjection` is an immutable record containing:

- `projectionId: AudienceProjectionId`, `tvId: TVId`, `venueId: VenueId`
- `windowStart: Instant`, `windowEnd: Instant`; half-open duration is exactly fifteen minutes
- `coveredBucketIds: ordered unique non-empty list<TelemetryBucketId>`
- `missingIntervals: ordered list<{ start: Instant; end: Instant }>` and `rejectedIntervals: ordered list<{ start: Instant; end: Instant; bucketId?: TelemetryBucketId; reasonCode: TelemetryBucketRejected.reasonCode }>`; intervals are non-overlapping and inside the window
- `contributingCapabilities: ordered unique non-empty list<{ capabilityName: non-empty string; capabilityVersion: CapabilityVersion; collectorVersion: CollectorVersion }>`
- `telemetrySchemaVersions: ordered unique non-empty list<TelemetrySchemaVersion>`
- `collectionPolicyVersions: ordered unique non-empty list<CollectionPolicyVersion>`
- `audienceProjectionVersion: AudienceProjectionVersion`, `audienceProjectionPolicyVersion: AudienceProjectionPolicyVersion`
- `confidence: ConfidenceMetric`, `coveragePermille: integer 0..1000`
- `calculatedAt: Instant`, `validFrom: Instant`, `validUntil: Instant`, where `validFrom <= calculatedAt < validUntil`

### Error codes

Validation returns exactly `INVALID_PROJECTION_WINDOW`, `EMPTY_COVERED_BUCKETS`, `DUPLICATE_COVERED_BUCKET`, `INTERVAL_OUTSIDE_WINDOW`, `OVERLAPPING_EXCEPTION_INTERVAL`, `EMPTY_CONTRIBUTING_CAPABILITIES`, `DUPLICATE_CONTRIBUTING_CAPABILITY`, `EMPTY_VERSION_PROVENANCE`, `INVALID_PROJECTION_COVERAGE`, `INVALID_VALIDITY_INTERVAL`, plus shared errors.

### Lifecycle and terminality

The projection is an immutable snapshot with a declared validity interval and no independent lifecycle authority. A later calculation has a new `projectionId`. Expiration/invalidation events and event-driven transitions are outside this READY record contract.

### Replay and rebuild

Rebuilding the immutable record from the same accepted observations and recorded versions is deterministic and never mutates the Telemetry Ledger.

### Producer

Telemetry Context produces the immutable record. The projection builder algorithm and scheduling are not authorized by this gate.

### Compatibility and version evolution

Projection shape and derivation semantics remain separate via `audienceProjectionVersion` and `audienceProjectionPolicyVersion`. Unsupported versions fail explicitly. Historical records retain every contributing schema, capability, collector, and policy version and are never reinterpreted. New state or reason enum members require a new declared compatible contract.

### Dependencies

Only READY values, accepted bucket identities, and rejection reason codes. Lifecycle events, Pricing, Analytics, Marketplace, AI, Evidence, storage, transport, and the projection builder are not dependencies authorized here.

### Required tests

Validate every required field, interval bound, uniqueness constraint, provenance value, confidence/coverage value, and validity invariant; rebuild the same inputs twice with identical record content and prove input buckets remain byte-equivalent.

## Artifact: TelemetryBucketId
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context.
### Conceptual schema v1
Required non-empty opaque UTF-8 string, compared byte-for-byte; no parseable components.
### Error codes
`EMPTY_OPAQUE_VALUE`.
### Lifecycle and terminality
Immutable; never reused for different canonical bucket content.
### Replay and rebuild
Same identity and content is idempotent; divergent content is `BUCKET_ID_CONTENT_CONFLICT`.
### Producer
Edge Runtime allocates it under the Telemetry acquisition contract.
### Compatibility and version evolution
Shape changes require a successor contract; v1 readers do not parse it.
### Dependencies
UTF-8 validation only.
### Required tests
Empty rejection, byte equality, round-trip, idempotency, and content conflict.

## Artifact: AudienceProjectionId
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context.
### Conceptual schema v1
Required non-empty opaque UTF-8 string, compared byte-for-byte; no parseable components.
### Error codes
`EMPTY_OPAQUE_VALUE`.
### Lifecycle and terminality
Immutable and identifies one projection record only.
### Replay and rebuild
Rebuild preserves the identifier of the rebuilt historical record; a later calculation uses a new identifier.
### Producer
Telemetry Context projection builder allocates it; that builder is not authorized here.
### Compatibility and version evolution
Shape changes require a successor contract; v1 readers do not parse it.
### Dependencies
UTF-8 validation only.
### Required tests
Empty rejection, byte equality, round-trip, and non-reuse across calculations.

## Artifact: TelemetryEventId
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context.
### Conceptual schema v1
Required non-empty opaque UTF-8 string, compared byte-for-byte; no parseable components.
### Error codes
`EMPTY_OPAQUE_VALUE`, `EVENT_ID_CONTENT_CONFLICT`.
### Lifecycle and terminality
Immutable and identifies one concrete event envelope.
### Replay and rebuild
Same identity and canonical envelope is idempotent; divergent content conflicts.
### Producer
The authoritative concrete event producer allocates it; READY events here are produced by Telemetry Context.
### Compatibility and version evolution
Shape changes require a successor contract; v1 readers do not parse it.
### Dependencies
UTF-8 validation and canonical event content.
### Required tests
Empty rejection, round-trip, duplicate idempotency, and divergent-content conflict.

## Artifact: TelemetryCapabilityStatus
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context owns the acquisition status contract; Edge Runtime reports observations.
### Conceptual schema v1
Exactly `AVAILABLE | UNAVAILABLE | DISABLED | DEGRADED | FAILED`.
### Error codes
`UNSUPPORTED_CAPABILITY_STATUS`.
### Lifecycle and terminality
It is an immutable observation value, not a state machine or lifecycle authority.
### Replay and rebuild
Replay preserves the exact value and never substitutes missing information or zero.
### Producer
Edge Runtime collector reports the observed value.
### Compatibility and version evolution
Adding a member is breaking for exhaustive v1 readers.
### Dependencies
None.
### Required tests
Exhaust all five values, reject all others, and preserve missing-versus-zero semantics.

## Artifact: TelemetrySchemaVersion
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context, as exclusive owner of telemetry acquisition contracts and schemas.
### Conceptual schema v1
Required non-empty opaque UTF-8 string branded `TelemetrySchemaVersion`.
### Error codes
`EMPTY_OPAQUE_VALUE`, `UNSUPPORTED_TELEMETRY_SCHEMA_VERSION`.
### Lifecycle and terminality
Immutable; a meaning or shape change publishes a successor.
### Replay and rebuild
Historical buckets retain the original value and are never reinterpreted.
### Producer
Telemetry Context publishes supported values; Edge Runtime records the selected value.
### Compatibility and version evolution
Only declared compatible values are accepted; upcast preserves the original envelope.
### Dependencies
UTF-8 validation only.
### Required tests
Brand separation, empty and unsupported rejection, round-trip, and historical preservation.

## Artifact: CollectorVersion
Status: `IMPLEMENTATION_READY`
### Unique owner
Edge Runtime, owner of the collector implementation and algorithm that produced a measurement.
### Conceptual schema v1
Required non-empty opaque UTF-8 string branded `CollectorVersion`.
### Error codes
`EMPTY_OPAQUE_VALUE`, `UNSUPPORTED_COLLECTOR_VERSION`.
### Lifecycle and terminality
Immutable; algorithm or normalization changes publish a successor.
### Replay and rebuild
Historical observations retain the original value.
### Producer
Edge Runtime collector reports its own value.
### Compatibility and version evolution
Telemetry accepts only declared compatible values and never silently reinterprets them.
### Dependencies
UTF-8 validation only.
### Required tests
Brand separation, empty and unsupported rejection, round-trip, and historical preservation.

## Artifact: CapabilityVersion
Status: `IMPLEMENTATION_READY`
### Unique owner
TV Network capability owner, whose authoritative capability transitions are listed by `TELEMETRY.md`.
### Conceptual schema v1
Required non-empty opaque UTF-8 string branded `CapabilityVersion`.
### Error codes
`EMPTY_OPAQUE_VALUE`, `UNSUPPORTED_CAPABILITY_VERSION`.
### Lifecycle and terminality
Immutable; behavior or support changes publish a successor.
### Replay and rebuild
Historical observations retain the declared source value.
### Producer
TV Network capability owner declares it; Edge Runtime reports the active declared value.
### Compatibility and version evolution
Telemetry accepts only declared compatible values and never substitutes a collector version.
### Dependencies
UTF-8 validation only; capability transition events remain denied.
### Required tests
Brand separation, empty and unsupported rejection, round-trip, and source-value preservation.

## Artifact: CollectionPolicyVersion
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context, owner of collection authorization, minimization, and validation rules.
### Conceptual schema v1
Required non-empty opaque UTF-8 string branded `CollectionPolicyVersion`.
### Error codes
`EMPTY_OPAQUE_VALUE`, `UNSUPPORTED_POLICY_VERSION`.
### Lifecycle and terminality
Immutable; policy changes publish a successor.
### Replay and rebuild
Historical observations retain the active value and are not reinterpreted.
### Producer
Telemetry Context publishes it; Edge Runtime records the selected policy.
### Compatibility and version evolution
Only declared compatible values are accepted.
### Dependencies
UTF-8 validation only.
### Required tests
Brand separation, empty and unsupported rejection, round-trip, and historical preservation.

## Artifact: AudienceProjectionVersion
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context, exclusive owner of `AudienceProjection`.
### Conceptual schema v1
Required non-empty opaque UTF-8 string branded `AudienceProjectionVersion`.
### Error codes
`EMPTY_OPAQUE_VALUE`, `UNSUPPORTED_AUDIENCE_PROJECTION_VERSION`.
### Lifecycle and terminality
Immutable; projection shape or derivation-contract changes publish a successor.
### Replay and rebuild
Rebuilt records identify the version used and never reinterpret predecessors.
### Producer
Telemetry Context projection builder records it; the builder remains outside authorization.
### Compatibility and version evolution
Only declared compatible values are read; it cannot substitute for policy version.
### Dependencies
UTF-8 validation only.
### Required tests
Brand separation, empty and unsupported rejection, round-trip, and rebuild preservation.

## Artifact: AudienceProjectionPolicyVersion
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context, owner of projection confidence, coverage, validity, and derivation semantics.
### Conceptual schema v1
Required non-empty opaque UTF-8 string branded `AudienceProjectionPolicyVersion`.
### Error codes
`EMPTY_OPAQUE_VALUE`, `UNSUPPORTED_POLICY_VERSION`.
### Lifecycle and terminality
Immutable; semantic changes publish a successor.
### Replay and rebuild
Rebuild records the selected policy and never reinterprets historical confidence.
### Producer
Telemetry Context publishes it and its projection builder records it.
### Compatibility and version evolution
Only declared compatible values are read; it remains distinct from projection schema version.
### Dependencies
UTF-8 validation only.
### Required tests
Brand separation, empty and unsupported rejection, round-trip, and confidence preservation.

## Artifact: TelemetryBucket
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context owns the acquisition contract and validation boundary.
### Conceptual schema v1
The complete required/optional field schema and invariants are in section 3: identities, exact civil-minute interval, ordering sequence, capability observations, aggregate measurements, six independent versions/policies where applicable, three purpose-specific hashes, authenticity proof, and observed time.
### Error codes
Exactly the construction, scalar, version, retry, and conflict codes catalogued in section 3.
### Lifecycle and terminality
Edge construction closes it; closed is immutable and terminal.
### Replay and rebuild
Identical retry is idempotent; same identity with different canonical content conflicts; rebuild never mutates it.
### Producer
Edge Runtime is sole producer; Telemetry Context validates it.
### Compatibility and version evolution
Schema selection uses only `TelemetrySchemaVersion`; unsupported versions are rejected without partial interpretation.
### Dependencies
The ten READY scalar/status contracts and opaque external references; no infrastructure artifact.
### Required tests
Every field invariant/error, closure, hash-purpose separation, retry idempotency/conflict, version retention, and missing-versus-zero.

## Artifact: TelemetryBucketAccepted
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context.
### Conceptual schema v1
The complete section 4 envelope plus required `bucket`, `ledgerPosition`, and `acceptedAt`; producer literal is `TelemetryContext`.
### Error codes
Exactly `INVALID_EVENT_ENVELOPE`, `INVALID_EVENT_TIME_ORDER`, `INVALID_LEDGER_POSITION`, `EVENT_ID_CONTENT_CONFLICT`, and shared errors.
### Lifecycle and terminality
Immutable terminal decision for the submitted identity/content pair, emitted only after ledger append succeeds.
### Replay and rebuild
Byte-equivalent duplicate has no duplicate effect; conflict fails; replay restores the same ledger position and observation.
### Producer
Telemetry Context validator, after successful append.
### Compatibility and version evolution
`eventSchemaVersion` selects shape; unknown versions fail and original envelopes are preserved.
### Dependencies
READY `TelemetryBucket` and `TelemetryEventId`; repository/topic mechanisms remain denied.
### Required tests
Envelope fields, producer, time order, append-before-event, duplicate/conflict, unsupported version, and provenance retention.

## Artifact: TelemetryBucketRejected
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context.
### Conceptual schema v1
The complete section 4 envelope plus bucket/install/sequence/schema references, rejection time, and exactly one catalogued rejection reason; it contains no accepted bucket.
### Error codes
The ten rejection reasons plus `INVALID_EVENT_ENVELOPE`, `INVALID_EVENT_TIME_ORDER`, `INVALID_REJECTION_REASON`, `EVENT_ID_CONTENT_CONFLICT`, and shared errors.
### Lifecycle and terminality
Immutable terminal decision for the submitted identity/content pair; no accepted-observation append occurs.
### Replay and rebuild
Byte-equivalent duplicate has no duplicate effect; conflict fails; replay restores rejection history only.
### Producer
Telemetry Context validator.
### Compatibility and version evolution
Unknown event versions or reason codes fail rather than map to a generic reason.
### Dependencies
READY identity/version contracts; API/broker mechanisms remain denied.
### Required tests
Every reason, envelope fields, producer, absence of append, duplicate/conflict, and unsupported version/reason.

## Artifact: AudienceProjection
Status: `IMPLEMENTATION_READY`
### Unique owner
Telemetry Context.
### Conceptual schema v1
The complete section 5 immutable record: projection/TV/Venue identities, exact rolling fifteen-minute window, covered buckets, missing/rejected intervals, contributing capabilities, all provenance versions, confidence, coverage, and calculation/validity times.
### Error codes
Exactly the ten record validation codes in section 5, plus shared scalar/version errors; lifecycle-event and applier errors are not part of this READY artifact.
### Lifecycle and terminality
The record represents one immutable snapshot with no independent lifecycle authority. Any later improvement is a new projection.
### Replay and rebuild
Rebuild deterministically recreates record content from accepted observations under recorded versions and never mutates the Telemetry Ledger; event-fold behavior is not certified.
### Producer
Telemetry Context; the projection builder algorithm/scheduling remains outside authorization.
### Compatibility and version evolution
Projection schema and policy versions remain independent; unsupported versions fail and historical provenance is retained.
### Dependencies
READY identities/status/versions and accepted bucket identities; applier, lifecycle events, storage, and consumers remain denied.
### Required tests
All fields, interval/uniqueness/provenance rules, confidence/coverage/validity, deterministic reconstruction, and ledger non-mutation.

## Non-READY PARTIAL lifecycle and event artifacts

Every artifact in `PARTIAL_MANIFEST` is `IMPLEMENTATION_PARTIAL` and remains denied. Projection lifecycle artifacts lack replay metadata, complete event schemas, and complete transition/error behavior; no transition table, stream fold, or duplicate-event behavior is certified. The other PARTIAL contracts lack a complete telemetry-specific v1 payload/error schema or are conceptual families rather than concrete event artifacts.

## 6. Gate conclusion

The exact READY set is the set of `IMPLEMENTATION_READY` rows in section 1. All listed schemas, error catalogs, ownership, producers, lifecycle/terminality, replay/rebuild rules, compatibility rules, dependencies, and tests are closed for that set. The PARTIAL set remains denied because its concrete schema is incomplete. Everything absent remains `IMPLEMENTATION_BLOCKED_ARCHITECTURE` by default.
