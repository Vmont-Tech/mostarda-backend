# Edge Telemetry Architecture

**Status:** APPROVED BY FOUNDER — candidate for normative synchronization  
**Date:** 2026-08-01  
**Scope:** local telemetry acquisition, Telemetry Ledger, audience projections and public consumption contracts

## 1. Purpose

This design closes the transport and authority boundaries for field telemetry without coupling Telemetry to any particular consumer, without transferring pricing authority to Edge Runtime and without routing public QR or NFC interactions through the Edge.

Telemetry exists for the ecosystem. Pricing, Analytics, Marketplace, AI, Forecast, Optimization, Health, fraud detection and future authorized consumers may read its public contracts without acquiring authority over acquisition, validation, the Telemetry Ledger or its projections.

The design specializes the existing pricing rule only where Pricing consumes telemetry for newly offered inventory. It never reprices a `PricingQuote` already applied, a held Slot or a sold Slot.

## 2. Authority boundaries

### 2.1 Edge telemetry

Edge Runtime owns collection of signals produced by equipment physically attached to, embedded in or locally observable by the Edge installation. This includes operational telemetry and, when supported and authorized, anonymous local presence and reaction measurements derived from Wi-Fi and camera capabilities.

Edge Runtime does not calculate price, classify a final audience for commercial use or create Evidence. It emits signed facts with provenance, capability status, collection coverage and confidence information. Telemetry Context validates and aggregates these facts before another context may use them.

Playback produces the authoritative execution facts from which Evidence Ledger may materialize Evidence. Telemetry and Audience never generate Evidence. An `AudienceProjection` is not evidence of playback, presence, attention, identity, legal responsibility or financial eligibility.

### 2.2 QR Code and physical tag interactions

QR and tag interactions never pass through Edge Runtime.

- Edge may render a QR reference supplied by Cloud.
- A tag may be physically attached to the TV or its border.
- A person interacting with either medium communicates directly with the public Cloud/Quantum flow.
- Cloud attributes the interaction to the active Campaign and notifies the Advertiser or authorized automation according to the Campaign contract.
- Loss of Edge connectivity does not authorize Edge to resolve, redirect or fabricate QR or tag interactions.

### 2.3 Pricing

Pricing Engine remains the only authority that calculates a price. Telemetry provides a versioned and validated input snapshot; it does not publish a price and does not mutate an existing quote.

### 2.4 Telemetry and Audience ownership

Telemetry Context exclusively owns acquisition contracts, validation, accepted telemetry observations, the append-only Telemetry Ledger and `AudienceProjection` generation.

`AudienceProjection` is an internal, versioned and rebuildable Telemetry read artifact derived from the Telemetry Ledger. It does not introduce an Audience Bounded Context, does not write source facts, has no independent lifecycle authority and publishes no business judgment. Pricing, Analytics, Marketplace, AI and other authorized consumers read it only through public contracts.

Creating an Audience Bounded Context is explicitly outside scope and requires a future architectural decision supported by an independent ubiquitous language, rules, lifecycle and ownership.

## 3. Capability-complete distribution and graceful degradation

Every supported Edge distribution contains the same logical capability set required by its product profile. The runtime discovers the actual device capabilities and activates only compatible collectors.

The absence, incompatibility, denial of permission or failure of Wi-Fi hardware, router visibility or webcam must not prevent playback, scheduling, offline execution, health reporting or synchronization of other available facts.

Each optional capability reports one explicit condition:

- `AVAILABLE`: capability is present and collecting within policy;
- `UNAVAILABLE`: required hardware or platform support does not exist;
- `DISABLED`: policy, consent or configuration prohibits collection;
- `DEGRADED`: collection exists but does not meet its declared quality or coverage;
- `FAILED`: an unexpected fault prevents collection.

Missing information remains missing. No collector, Cloud service or pricing process may replace it with an invented value, zero audience or implicit healthy result.

Packaging may differ by operating system and supported device class, but these differences may not change the observable degradation semantics.

Every capability observation preserves `CapabilityVersion`, `CollectorVersion` and the active `CollectionPolicyVersion`. A change to hardware interpretation, collection algorithm, local model, normalization or policy creates a new version; it never silently changes the meaning of historical observations.

## 4. Collection, transmission and consolidation

The architecture separates four clocks that must not be conflated:

1. local measurement frequency;
2. normal Cloud transmission frequency;
3. operational period consolidation;
4. price calculation frequency.

Edge collects locally at the frequency required by each supported sensor. It closes an ordered local telemetry bucket for every civil minute in the Venue time reference. Each bucket preserves the `TVId`, `VenueId`, `EdgeInstallationId`, `DeviceId`, `PlayerInstallationId` when applicable, interval, sequence, capability coverage, aggregate measurements, confidence data and integrity reference. Campaign identity is correlated only when the public contract and data-minimization policy require it; collector identity never becomes Campaign ownership.

A closed telemetry bucket is an immutable observation. It is never edited, reopened or replaced. Correction, late completion or invalidation is represented by a new correlated fact while the original bucket remains in the Telemetry Ledger.

During normal connectivity, Edge sends one compact batch every five minutes containing the five one-minute buckets that have not yet been acknowledged. Batching does not erase the minute boundaries. A retry resends the same bucket identities and contents; Cloud deduplicates them and never counts them twice.

An incident that affects playback, device integrity, sensor trust, local storage or connectivity bypasses the normal batch interval and is reported immediately when communication is possible. Offline operation stores ordered buckets and incidents locally and synchronizes them later without changing their original observed times.

At the end of each effective six-hour civil period defined by `DEC-062`, Edge sends a consolidation index referencing the accepted bucket and incident identities. It does not duplicate the complete payload. The end-of-day close references the period consolidations in the same manner.

## 5. Logical communication channel

Every Edge installation has one stable logical identity, credentials, ordered sequence and independently recoverable communication session. `TVId`, `VenueId`, `DeviceId`, `EdgeInstallationId`, `PlayerInstallationId`, `CampaignId` and publisher/producer identity remain distinct and are correlated only by explicit references. This is a logical channel over shared infrastructure, not a dedicated server, queue cluster or physical connection per TV.

Isolation must allow a noisy, offline or compromised TV stream to be paused without blocking unrelated TVs. Authentication, authorization and routing are scoped to the installation identity. Replacement of hardware does not transfer the previous private credential.

The concrete broker, wire protocol and serialization format belong to the Code Generation Specification and deployment profile, provided they preserve these observable semantics.

## 6. Integrity and confidentiality

A hash is an integrity reference and is never treated as encrypted telemetry that can later be decrypted. Each use declares its purpose and canonicalization version. Contracts distinguish at least payload integrity, event/envelope integrity and sequence-chain integrity; a single ambiguous `hash` field is prohibited.

The telemetry payload is transmitted through an authenticated and confidential channel. Each bucket carries a `PayloadHash`, an `EventHash` or equivalent envelope hash, a `PreviousSequenceHash` when chain validation applies, the corresponding canonicalization versions and an Edge signature or equivalent device-bound authenticity proof. Telemetry Context validates identity, signature, sequence, interval and payload integrity before accepting the bucket.

Raw camera imagery is not a pricing input and is not transmitted by default. Local vision, when supported and authorized, emits only minimized aggregate results allowed by the active policy. Personal identification is outside this design.

## 7. Telemetry validation, ledger and AudienceProjection

Telemetry Context validates and stores accepted telemetry facts in an append-only Telemetry Ledger before producing `AudienceProjection`. The projection is not an Edge assertion and not Evidence of playback.

An `AudienceProjection` is an operational hypothesis derived from validated telemetry. It never represents a legally auditable fact, guaranteed audience, identified person or proof that a particular Creative was observed. Consumers must preserve this qualification when presenting or applying the projection.

A current audience snapshot uses a rolling fifteen-minute observation window and may be refreshed after each accepted five-minute batch. It preserves:

- the covered minute buckets;
- missing or rejected intervals;
- contributing capabilities;
- provenance and policy versions;
- `TelemetrySchemaVersion`, `AudienceProjectionVersion`, contributing `CapabilityVersion` and `CollectorVersion` values;
- confidence and coverage;
- the calculation instant;
- the validity interval.

Late data may improve a later snapshot or historical Analytics. It never retroactively changes a quote already applied or a Slot already held or sold.

When coverage, confidence, consistency or capability requirements are not satisfied, the live audience factor is unavailable. The system uses the last still-valid reliable snapshot when policy permits; otherwise it falls back to the structural/base calculation without inventing audience data. Unreliable data cannot increase price.

`ConfidenceMetric` is a domain-defined, versioned measurement whose scale, calculation, minimum coverage and interpretation are declared by `AudienceProjectionPolicyVersion`. No consumer may assume percentage, probability or a fixed range unless that policy explicitly defines it. A change of metric semantics creates a new policy/projection version and never reinterprets historical projections.

## 8. Two pricing speeds

Pricing has two independent mechanisms:

### 8.1 Structural/base calibration

Onboarding declarations create only a provisional, cohort-normalized base. Historical and audited observations may later justify a formal, prospective and versioned recalibration. This mechanism changes the structural basis slowly and never rewrites historical quotes.

### 8.2 Prospective momentary factor

For inventory that has not yet been held or sold, Pricing Engine may use the latest valid audience snapshot together with current offer, demand and occupancy. The policy must identify every factor, input revision, bound and confidence requirement used by the calculation.

The momentary factor applies only to a newly requested `PricingQuote`. It never changes:

- an applied quote;
- a quote frozen with an `InventoryHold`;
- a reserved or sold Slot;
- an earlier Campaign charge;
- historical Evidence or Settlement.

## 9. Failure behavior

- Missing optional hardware produces explicit `UNAVAILABLE`, not a runtime failure.
- Permission or policy prohibition produces `DISABLED`, not zero measurements.
- Sensor degradation produces `DEGRADED` with coverage/confidence, not a fabricated value.
- Invalid signature, reused identity or conflicting payload rejects the bucket and opens a security/operational incident.
- A sequence gap pauses only the affected telemetry stream until reconciliation; playback continues when otherwise healthy.
- Cloud unavailability leaves buckets queued locally and does not authorize local pricing.
- Pricing unavailability leaves inventory without a new quote; it does not reuse an expired quote silently.
- Public QR/tag interactions remain independent from telemetry batching and Edge availability.

## 10. Public event contracts

The following event families form the conceptual public contract. Concrete schemas, payload types and compatibility declarations must be certified before code generation. Naming a contract here does not transfer ownership or authorize another context to mutate Telemetry state.

| Event | Producer | Meaning | Principal consumers |
| --- | --- | --- | --- |
| `TelemetryCaptured` | Edge Runtime collector | A local measurement was captured under identified capability, collector and policy versions | Telemetry ingestion |
| `TelemetryBucketClosed` | Edge Runtime | An immutable civil-minute bucket was closed with sequence and integrity references | Telemetry ingestion |
| `TelemetryBucketAccepted` | Telemetry Context | A bucket passed identity, integrity, schema, ordering and policy validation and was appended to the Telemetry Ledger | projection builders, operations |
| `TelemetryBucketRejected` | Telemetry Context | A submitted bucket was rejected for a catalogued reason; it was not appended as an accepted observation | Edge reconciliation, security, operations |
| `AudienceProjectionProduced` | Telemetry Context | A new versioned operational audience hypothesis was built from identified accepted observations | Pricing, Analytics, Marketplace, AI |
| `AudienceProjectionExpired` | Telemetry Context | A projection exceeded its declared validity and may no longer be used as current | all projection consumers |
| `AudienceProjectionInvalidated` | Telemetry Context | A projection became unusable because its source observations or policy were invalidated; historical record remains | all projection consumers, audit |
| `TelemetryCapabilityChanged` | Edge Runtime/TV capability owner, according to the source transition | The observed availability or supported version of a collector capability changed | Telemetry, TV Network, operations |
| `TelemetryIncidentReported` | Edge Runtime or Telemetry Context, according to incident origin | A collection, integrity, storage, sequencing or transport incident occurred | TV Network, security, operations, Notifications |

Each public event has one authoritative producer for each concrete event type. If Edge and Telemetry must report different incident facts, their concrete event names and schemas must remain distinct rather than sharing a producer-ambiguous event.

Public contracts preserve stable event identity, producer identity, causation, correlation, observed and recorded times, schema version, policy versions, ordering key, canonical hashes and compatibility metadata. Duplicate delivery never duplicates effect.

## 11. Versioning and compatibility governance

The following versions are independent and must never be collapsed into a generic `version`:

- `TelemetrySchemaVersion`: meaning and shape of telemetry measurements and buckets;
- `CollectorVersion`: implementation/algorithm that produced a measurement;
- `CapabilityVersion`: declared behavior and support contract of a capability;
- `CollectionPolicyVersion`: authorization, minimization and collection rules;
- `AudienceProjectionVersion`: projection schema and derivation contract;
- `AudienceProjectionPolicyVersion`: confidence, coverage, validity and derivation semantics;
- `PricingPolicyVersion`: use of authorized projection inputs in a price calculation.

A version changes whenever an observable meaning, accepted input, output schema, derivation rule, confidence interpretation or compatibility promise changes. Corrections never mutate a published version. They publish a successor and preserve the predecessor for replay, audit and historical interpretation.

Edge and Cloud negotiate only declared compatible versions. An unsupported future schema is rejected explicitly and never partially interpreted. Upcasting, when authorized, occurs inside the owner of the receiving contract and preserves the original immutable envelope. Rebuilding `AudienceProjection` records the projection and policy versions used and never rewrites the Telemetry Ledger.

## 12. Observable acceptance criteria

1. Two deliveries of the same minute bucket produce one accepted measurement effect.
2. Five-minute batching preserves five independently identifiable minute intervals.
3. A playback incident is reportable without waiting for the next telemetry batch.
4. A period close references accepted bucket identities without duplicating their payload.
5. A device without webcam and Wi-Fi telemetry still plays authorized content and reports both capabilities as unavailable.
6. A QR scan reaches the public Cloud/Quantum flow without an Edge request.
7. A tag interaction reaches the public Cloud/Quantum flow without an Edge request.
8. A rejected or low-confidence audience snapshot cannot increase a newly quoted price.
9. A newly accepted telemetry batch cannot alter a quote already applied or held.
10. Offline buckets retain their original observed intervals after later synchronization.
11. Rebuilding `AudienceProjection` does not append, edit or delete accepted telemetry buckets.
12. No Pricing, Analytics, Marketplace or AI consumer can publish an AudienceProjection or mark a bucket accepted.
13. Every accepted bucket and produced projection identifies all semantic versions needed to interpret it historically.
14. Telemetry and Audience inputs alone cannot produce an EvidenceRecord.

## 13. Deliberately deferred technical parameters

The design does not choose broker product, serialization, compression, database, retention duration, local queue capacity, camera model, Wi-Fi adapter, sampling rate inside a minute or numeric price-factor bounds. Those choices belong to certified technical contracts, configuration and the Vertical Slice, and may not change the behavior defined above.
