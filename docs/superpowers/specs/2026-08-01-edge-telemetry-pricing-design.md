# Edge Telemetry and Dynamic Pricing Design

**Status:** APPROVED BY FOUNDER — candidate for normative synchronization  
**Date:** 2026-08-01  
**Scope:** local telemetry acquisition, Cloud ingestion, audience snapshots and prospective dynamic pricing  

## 1. Purpose

This design closes the transport and authority boundaries for field telemetry without transferring pricing authority to Edge Runtime and without routing public QR or NFC interactions through the Edge.

It specializes the existing pricing rule for newly offered inventory. It never reprices a `PricingQuote` already applied, a held Slot or a sold Slot.

## 2. Authority boundaries

### 2.1 Edge telemetry

Edge Runtime owns collection of signals produced by equipment physically attached to, embedded in or locally observable by the Edge installation. This includes operational telemetry and, when supported and authorized, anonymous local presence and reaction measurements derived from Wi-Fi and camera capabilities.

Edge Runtime does not calculate price, classify a final audience for commercial use or create Evidence. It emits signed facts with provenance, capability status, collection coverage and confidence information. Cloud validates and aggregates these facts before another context may use them.

### 2.2 QR Code and physical tag interactions

QR and tag interactions never pass through Edge Runtime.

- Edge may render a QR reference supplied by Cloud.
- A tag may be physically attached to the TV or its border.
- A person interacting with either medium communicates directly with the public Cloud/Quantum flow.
- Cloud attributes the interaction to the active Campaign and notifies the Advertiser or authorized automation according to the Campaign contract.
- Loss of Edge connectivity does not authorize Edge to resolve, redirect or fabricate QR or tag interactions.

### 2.3 Pricing

Pricing Engine remains the only authority that calculates a price. Telemetry provides a versioned and validated input snapshot; it does not publish a price and does not mutate an existing quote.

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

## 4. Collection, transmission and consolidation

The architecture separates four clocks that must not be conflated:

1. local measurement frequency;
2. normal Cloud transmission frequency;
3. operational period consolidation;
4. price calculation frequency.

Edge collects locally at the frequency required by each supported sensor. It closes an ordered local telemetry bucket for every civil minute in the Venue time reference. Each bucket preserves the TV/installation identity, interval, sequence, capability coverage, aggregate measurements, confidence data and integrity reference.

During normal connectivity, Edge sends one compact batch every five minutes containing the five one-minute buckets that have not yet been acknowledged. Batching does not erase the minute boundaries. A retry resends the same bucket identities and contents; Cloud deduplicates them and never counts them twice.

An incident that affects playback, device integrity, sensor trust, local storage or connectivity bypasses the normal batch interval and is reported immediately when communication is possible. Offline operation stores ordered buckets and incidents locally and synchronizes them later without changing their original observed times.

At the end of each effective six-hour civil period defined by `DEC-062`, Edge sends a consolidation index referencing the accepted bucket and incident identities. It does not duplicate the complete payload. The end-of-day close references the period consolidations in the same manner.

## 5. Logical communication channel

Every Edge installation has one stable logical identity, credentials, ordered sequence and independently recoverable communication session. This is a logical channel over shared infrastructure, not a dedicated server, queue cluster or physical connection per TV.

Isolation must allow a noisy, offline or compromised TV stream to be paused without blocking unrelated TVs. Authentication, authorization and routing are scoped to the installation identity. Replacement of hardware does not transfer the previous private credential.

The concrete broker, wire protocol and serialization format belong to the Code Generation Specification and deployment profile, provided they preserve these observable semantics.

## 6. Integrity and confidentiality

A hash is an integrity reference and is never treated as encrypted telemetry that can later be decrypted.

The telemetry payload is transmitted through an authenticated and confidential channel. Each bucket carries a stable canonical integrity reference and an Edge signature or equivalent device-bound authenticity proof. Cloud validates identity, signature, sequence, interval and payload integrity before accepting the bucket.

Raw camera imagery is not a pricing input and is not transmitted by default. Local vision, when supported and authorized, emits only minimized aggregate results allowed by the active policy. Personal identification is outside this design.

## 7. Cloud validation and audience snapshot

Cloud ingestion validates and stores accepted telemetry facts before producing an audience snapshot. The snapshot is a projection, not an Edge assertion and not Evidence of playback.

A current audience snapshot uses a rolling fifteen-minute observation window and may be refreshed after each accepted five-minute batch. It preserves:

- the covered minute buckets;
- missing or rejected intervals;
- contributing capabilities;
- provenance and policy versions;
- confidence and coverage;
- the calculation instant;
- the validity interval.

Late data may improve a later snapshot or historical Analytics. It never retroactively changes a quote already applied or a Slot already held or sold.

When coverage, confidence, consistency or capability requirements are not satisfied, the live audience factor is unavailable. The system uses the last still-valid reliable snapshot when policy permits; otherwise it falls back to the structural/base calculation without inventing audience data. Unreliable data cannot increase price.

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

## 10. Observable acceptance criteria

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

## 11. Deliberately deferred technical parameters

The design does not choose broker product, serialization, compression, database, retention duration, local queue capacity, camera model, Wi-Fi adapter, sampling rate inside a minute or numeric price-factor bounds. Those choices belong to certified technical contracts, configuration and the Vertical Slice, and may not change the behavior defined above.
