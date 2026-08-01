# Telemetry Implementation Gate V1

**Status:** mechanical code-generation gate  
**Normative domain source:** `docs/domain/TELEMETRY.md` (`DEC-063`)  
**Scope:** value contracts, the immutable minute bucket, acceptance/rejection events, the audience projection state, and its pure applier

This gate certifies only the names marked `IMPLEMENTATION_READY` below. The following are not authorized: adapters; not authorized: ingestion services; not authorized: API; not authorized: repositories; not authorized: topics; not authorized: brokers. Persistence mappings, transport envelopes, and deployment resources are likewise excluded. An artifact absent from the READY list remains denied by CGS-A-1. Public event families not concretized here remain non-READY.

## 1. Mechanical certification matrix

| Artifact | Status | Unique owner | Producer where applicable | Dependencies |
| --- | --- | --- | --- | --- |
| `TelemetryBucketId`, `AudienceProjectionId`, `TelemetryEventId` | `IMPLEMENTATION_READY` | Telemetry Context | none; value types | UTF-8 string validation |
| `TelemetryCapabilityStatus` | `IMPLEMENTATION_READY` | Telemetry Context contract; Edge observes the value | Edge Runtime collector | none |
| `TelemetrySchemaVersion`, `CollectorVersion`, `CapabilityVersion`, `CollectionPolicyVersion`, `AudienceProjectionVersion`, `AudienceProjectionPolicyVersion` | `IMPLEMENTATION_READY` | owner of the named contract; Telemetry preserves every value | none; value types | UTF-8 string validation |
| `TelemetryBucket` | `IMPLEMENTATION_READY` | Telemetry Context owns the acquisition contract; Edge Runtime produces instances | Edge Runtime | READY value contracts above; opaque external references |
| `TelemetryBucketAccepted` | `IMPLEMENTATION_READY` | Telemetry Context | Telemetry Context validator, after ledger append | `TelemetryBucket`, `TelemetryEventId` |
| `TelemetryBucketRejected` | `IMPLEMENTATION_READY` | Telemetry Context | Telemetry Context validator, without accepted-observation append | `TelemetryBucketId`, `TelemetryEventId` |
| `AudienceProjection` | `IMPLEMENTATION_READY` | Telemetry Context | projection builder is outside this gate | accepted bucket identities and READY versions |
| `AudienceProjectionApplier` | `IMPLEMENTATION_READY` | Telemetry Context | pure function, no event producer | `AudienceProjection` and the three concrete projection lifecycle events below |
| `AudienceProjectionProduced`, `AudienceProjectionExpired`, `AudienceProjectionInvalidated` | `IMPLEMENTATION_READY` | Telemetry Context | Telemetry Context | `AudienceProjection`, `TelemetryEventId` |
| `TelemetryCaptured`, `TelemetryBucketClosed`, `EdgeTelemetryCapabilityChanged`, capability-owner transition events, `EdgeTelemetryIncidentReported`, `TelemetryValidationIncidentReported` | `IMPLEMENTATION_PARTIAL` | owners are stated by `TELEMETRY.md` | stated there | complete v1 payload/error schemas are absent |

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

## 5. `AudienceProjection` and lifecycle events

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
- `state`, exactly `CURRENT | EXPIRED | INVALIDATED`; `invalidationReason?: SOURCE_OBSERVATION_INVALIDATED | POLICY_INVALIDATED`, required only for `INVALIDATED`

Lifecycle event envelopes use the shared event envelope with producer `TelemetryContext`, ordering key `projectionId`, and `eventSchemaVersion: "1"`:

- `AudienceProjectionProduced`: `{ event envelope; projection: AudienceProjection }`, where the projection state is `CURRENT`.
- `AudienceProjectionExpired`: `{ event envelope; projectionId; expiredAt: Instant }`.
- `AudienceProjectionInvalidated`: `{ event envelope; projectionId; invalidatedAt: Instant; reasonCode: SOURCE_OBSERVATION_INVALIDATED | POLICY_INVALIDATED }`.

### Error codes

Validation returns exactly `INVALID_PROJECTION_WINDOW`, `EMPTY_COVERED_BUCKETS`, `DUPLICATE_COVERED_BUCKET`, `INTERVAL_OUTSIDE_WINDOW`, `OVERLAPPING_EXCEPTION_INTERVAL`, `EMPTY_CONTRIBUTING_CAPABILITIES`, `DUPLICATE_CONTRIBUTING_CAPABILITY`, `EMPTY_VERSION_PROVENANCE`, `INVALID_PROJECTION_COVERAGE`, `INVALID_VALIDITY_INTERVAL`, `INVALID_PROJECTION_STATE`, `MISSING_INVALIDATION_REASON`, `UNEXPECTED_INVALIDATION_REASON`, `PROJECTION_NOT_FOUND`, `PROJECTION_ALREADY_TERMINAL`, `PROJECTION_EVENT_ID_CONFLICT`, plus shared errors.

### Lifecycle and terminality

`Produced` creates `CURRENT`. `Expired` changes `CURRENT` to terminal `EXPIRED`; `Invalidated` changes `CURRENT` to terminal `INVALIDATED`. Terminal states cannot transition. Lifecycle events never modify covered buckets or other projection fields. A later calculation has a new `projectionId`.

### Replay and rebuild

`AudienceProjectionApplier(state: AudienceProjection | null, event)` is pure and deterministic: Produced applies only to null, while Expired/Invalidated apply only to the matching CURRENT projection. Reapplying an event with the same event identity and canonical content is a no-op; same identity/different content fails. Rebuild folds ordered events, performs no I/O, emits no events, and never appends, edits, or deletes a telemetry bucket.

### Producer

Telemetry Context is the sole producer of all three concrete lifecycle events. The projection builder algorithm and its scheduling are not authorized by this gate; it must supply a record satisfying this complete state schema.

### Compatibility and version evolution

Projection shape and derivation semantics remain separate via `audienceProjectionVersion` and `audienceProjectionPolicyVersion`. Unsupported versions fail explicitly. Historical records retain every contributing schema, capability, collector, and policy version and are never reinterpreted. New state or reason enum members require a new declared compatible contract.

### Dependencies

Only READY values, accepted bucket identities, rejection reason codes, and lifecycle events. Pricing, Analytics, Marketplace, AI, Evidence, storage, transport, and the projection builder are consumers or external mechanisms, not dependencies authorized here.

### Required tests

Validate all required fields, interval bounds, uniqueness, provenance, confidence/coverage, validity, and state/reason combinations; test the full transition table and every error code; prove event replay idempotency and conflict detection; fold a stream twice with identical output; prove rebuild performs no I/O and leaves input buckets byte-equivalent.

## 6. Gate conclusion

The exact READY set is the set of `IMPLEMENTATION_READY` rows in section 1. All listed schemas, error catalogs, ownership, producers, lifecycle/terminality, replay/rebuild rules, compatibility rules, dependencies, and tests are closed for that set. The PARTIAL set remains denied because its concrete schema is incomplete. Everything absent remains `IMPLEMENTATION_BLOCKED_ARCHITECTURE` by default.
