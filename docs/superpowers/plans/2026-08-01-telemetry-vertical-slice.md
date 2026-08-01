# Telemetry Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a certified vertical slice from immutable Edge telemetry buckets through the Telemetry Ledger to a versioned AudienceProjection and a read-only Cloud API contract.

**Architecture:** Edge contracts and Telemetry ownership remain separate packages. Telemetry accepts immutable signed bucket envelopes into the existing append-only Event Store, then rebuilds and atomically promotes AudienceProjection through the existing projection kernel. Pricing is represented only by a consumer contract test proving it cannot write telemetry or reprice frozen quotes; QR/NFC and Evidence remain outside this slice.

**Tech Stack:** Node.js 24, TypeScript 5.9, Node test runner, Fastify 5, PostgreSQL 16, existing Event Store/outbox/inbox/projection kernel.

---

## File structure

- `docs/specification/DECISION_REGISTRY.md`: records the approved telemetry/audience decision.
- `docs/specification/PLATFORM_SPECIFICATION.md`: synchronizes normative ownership and prospective pricing.
- `docs/domain/TELEMETRY.md`: complete specialized specification and public contracts.
- `docs/domain/OWNERSHIP.md`: unique owner matrix.
- `docs/domain/DOMAIN_EVENTS.md`: public event catalog references.
- `docs/domain/PRICING_ENGINE.md`: projection-consumer boundary.
- `docs/tv-network/EDGE_RUNTIME.md`: local collection and batching boundary.
- `docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md`: mechanical readiness gate.
- `packages/telemetry/src/identities.ts`: opaque Telemetry identities.
- `packages/telemetry/src/capability.ts`: capability status and version contracts.
- `packages/telemetry/src/bucket.ts`: immutable minute bucket schema and validation.
- `packages/telemetry/src/events.ts`: versioned Telemetry public events.
- `packages/telemetry/src/errors.ts`: Telemetry-specific error catalog.
- `packages/telemetry/src/ingestion.ts`: deterministic acceptance/rejection service.
- `packages/telemetry/src/audience-projection.ts`: projection state and pure event applier.
- `packages/telemetry/src/index.ts`: public exports.
- `apps/cloud-api/src/telemetry-routes.ts`: read-only AudienceProjection endpoint.
- `migrations/0006_telemetry_ledger.sql`: Telemetry integrity and lookup indexes over authoritative events.
- `tests/telemetry/*.test.ts`: contract and domain tests.
- `tests/integration/postgres-telemetry.test.ts`: PostgreSQL vertical integration.
- `tests/architecture/telemetry-boundaries.test.mjs`: dependency and ownership checks.
- `tests/documentation/telemetry-implementation-gate.test.mjs`: deny-by-default authorization gate.

### Task 1: Synchronize the approved normative decision

**Files:**
- Modify: `docs/specification/DECISION_REGISTRY.md`
- Modify: `docs/specification/PLATFORM_SPECIFICATION.md`
- Create: `docs/domain/TELEMETRY.md`
- Modify: `docs/domain/OWNERSHIP.md`
- Modify: `docs/domain/DOMAIN_EVENTS.md`
- Modify: `docs/domain/PRICING_ENGINE.md`
- Modify: `docs/tv-network/EDGE_RUNTIME.md`
- Test: `tests/documentation/telemetry-implementation-gate.test.mjs`

- [ ] **Step 1: Write the failing documentation test**

Create assertions that require `DEC-063`, unique Telemetry ownership, `AudienceProjection` as an internal Telemetry projection, explicit Evidence prohibition, immutable minute buckets, QR/NFC bypass, the nine conceptual event contracts and independent semantic versions.

```js
test("telemetry authority is synchronized without an Audience bounded context", () => {
  const specification = read("docs/specification/PLATFORM_SPECIFICATION.md");
  const telemetry = read("docs/domain/TELEMETRY.md");
  assert.match(specification, /DEC-063|SPEC-TEL-001/);
  assert.match(telemetry, /AudienceProjection.*Telemetry Context/s);
  assert.match(telemetry, /N(?:EVER|UNCA).*Evidence/i);
  assert.doesNotMatch(telemetry, /Audience Bounded Context.*owner/i);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/documentation/telemetry-implementation-gate.test.mjs`  
Expected: FAIL because `docs/domain/TELEMETRY.md` and `DEC-063` do not exist.

- [ ] **Step 3: Synchronize the normative documents**

Record `DEC-063` with these exact semantics: Telemetry owns immutable accepted observations, Telemetry Ledger and AudienceProjection; one-minute buckets are normally sent in five-minute batches; the projection uses a rolling fifteen-minute window; only new quotes may consume it; QR/NFC bypass Edge; optional collectors degrade explicitly; Evidence Ledger alone materializes Evidence from Playback facts.

- [ ] **Step 4: Run documentation and architecture checks**

Run: `npm run test:docs && npm run test:architecture && git diff --check`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs tests/documentation/telemetry-implementation-gate.test.mjs
git commit -m "docs: certify telemetry audience boundaries"
```

### Task 2: Certify concrete Telemetry contracts before generation

**Files:**
- Create: `docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md`
- Modify: `packages/generation/src/artifact-authorization.ts`
- Modify: `tests/generation/artifact-authorization.test.ts`
- Modify: `tests/documentation/telemetry-implementation-gate.test.mjs`

- [ ] **Step 1: Write failing deny-by-default tests**

```ts
assert.equal(authorizationFor("TelemetryBucket").status, "IMPLEMENTATION_BLOCKED_ARCHITECTURE");
assert.equal(authorizationFor("AudienceProjection").status, "IMPLEMENTATION_BLOCKED_ARCHITECTURE");
```

- [ ] **Step 2: Materialize the gate document**

For every artifact list its owner, schema v1 fields, error codes, lifecycle/terminality, replay behavior, compatibility and tests. Mark READY only: Telemetry identities, capability observation, TelemetryBucket, the concrete accepted/rejected events and AudienceProjection state/applier. Keep ingestion adapters and public API blocked until their contract tests exist.

- [ ] **Step 3: Promote only mechanically certified artifacts**

Add the READY names to the generation registry with source `TELEMETRY_IMPLEMENTATION_GATE_V1.md`; keep unknown artifacts denied.

- [ ] **Step 4: Run gates**

Run: `npm run test:docs && npm run test:architecture && npm run test -- tests/generation/artifact-authorization.test.ts`  
Expected: PASS with no unrelated promotion.

- [ ] **Step 5: Commit**

```bash
git add docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md packages/generation tests
git commit -m "docs: authorize certified telemetry artifacts"
```

### Architecture Review Gate — mandatory manual approval

**Execution rule:** This is a blocking manual gate. Task 3 and every later task remain prohibited until the review record is completed, committed and explicitly marked `APPROVED`. Passing automated tests alone cannot satisfy or bypass this gate.

**Files:**
- Create: `docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V1.md`
- Test: `tests/documentation/telemetry-architecture-review-gate.test.mjs`

- [ ] **Gate 1: Verify no Bounded Context was introduced**

Inspect the Bounded Context catalog, Platform Specification, `TELEMETRY.md` and the staged diff. Record objective references proving that no `Audience`, `Telemetry Audience` or equivalent new Bounded Context exists.

- [ ] **Gate 2: Verify unique AudienceProjection ownership**

Record that `AudienceProjection` is an internal, rebuildable read artifact produced exclusively by Telemetry Context from the Telemetry Ledger. Confirm that Pricing, Analytics, Marketplace and AI receive read-only public contracts and cannot produce, promote, expire or invalidate it.

- [ ] **Gate 3: Verify Evidence authority**

Record that Edge/Playback produces `PlaybackEvent` and `PlaybackSignature`, while Evidence Ledger remains the only materializer and validator of `EvidenceRecord`. Confirm that TelemetryBucket, Telemetry Ledger and AudienceProjection cannot create Evidence or financial eligibility.

- [ ] **Gate 4: Verify Pricing remains a consumer**

Record that Pricing consumes only an authorized AudienceProjection snapshot, calculates only prospective quotes and cannot accept/reject telemetry buckets, mutate the Telemetry Ledger or alter applied/held/sold prices.

- [ ] **Gate 5: Verify every promoted artifact against the implementation gate**

For each READY artifact in `artifact-authorization.ts`, cite the exact section of `TELEMETRY_IMPLEMENTATION_GATE_V1.md` that closes owner, schema, errors, lifecycle, replay, versioning and compatibility. Any artifact lacking one item must remain PARTIAL/BLOCKED.

- [ ] **Gate 6: Write the failing enforcement test**

```js
test("implementation cannot start before the manual architecture gate is approved", () => {
  const review = read("docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V1.md");
  assert.match(review, /Status:\s*APPROVED/);
  for (const invariant of [
    "NO_NEW_BOUNDED_CONTEXT",
    "AUDIENCE_PROJECTION_OWNED_BY_TELEMETRY",
    "EVIDENCE_LEDGER_ONLY_MATERIALIZER",
    "PRICING_READ_ONLY_CONSUMER",
    "AUTHORIZED_ARTIFACTS_MATCH_GATE",
  ]) assert.match(review, new RegExp(`${invariant}:\\s*PASS`));
});
```

- [ ] **Gate 7: Perform the manual review and record evidence**

The reviewer must list reviewed commits, reviewed files, each invariant as `PASS` or `FAIL`, evidence paths and the final status. Any `FAIL`, missing evidence or unresolved contradiction produces `REJECTED` and blocks Task 3.

- [ ] **Gate 8: Run all pre-implementation gates**

Run: `npm run test:docs && npm run test:architecture && git diff --check`  
Expected: PASS and review status `APPROVED`.

- [ ] **Gate 9: Commit the signed review record**

```bash
git add docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V1.md tests/documentation/telemetry-architecture-review-gate.test.mjs
git commit -m "docs: approve telemetry architecture review gate"
```

### Task 3: Implement identities and capability observations

**Files:**
- Create: `packages/telemetry/package.json`
- Create: `packages/telemetry/src/identities.ts`
- Create: `packages/telemetry/src/capability.ts`
- Create: `packages/telemetry/src/index.ts`
- Create: `tests/telemetry/capability.test.ts`

- [ ] **Step 1: Write failing tests**

Test distinct opaque values for `TVId`, `VenueId`, `DeviceId`, `EdgeInstallationId`, `PlayerInstallationId`; exact statuses `AVAILABLE|UNAVAILABLE|DISABLED|DEGRADED|FAILED`; and mandatory nonempty capability, collector and policy versions.

- [ ] **Step 2: Verify failure**

Run: `node --experimental-strip-types --test tests/telemetry/capability.test.ts`  
Expected: FAIL with module not found.

- [ ] **Step 3: Implement the minimal contracts**

Use the kernel opaque identity validator and immutable factory results. Reject padded/empty versions and prohibit measurements for `UNAVAILABLE` or `DISABLED` observations.

- [ ] **Step 4: Verify and typecheck**

Run: `node --experimental-strip-types --test tests/telemetry/capability.test.ts && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry tests/telemetry/capability.test.ts
git commit -m "feat: add telemetry capability contracts"
```

### Task 4: Implement immutable minute buckets and integrity contracts

**Files:**
- Create: `packages/telemetry/src/bucket.ts`
- Create: `packages/telemetry/src/errors.ts`
- Modify: `packages/telemetry/src/index.ts`
- Create: `tests/telemetry/bucket.test.ts`

- [ ] **Step 1: Write failing bucket tests**

Cover exact civil-minute boundaries, immutable identity/sequence, dense JSON-safe aggregate measurements, explicit capability coverage, distinct `payloadHash`, `eventHash`, optional `previousSequenceHash`, canonicalization versions and signature. Reject mutable dates, ambiguous `hash`, missing intervals, negative sequence and Campaign ownership fields.

- [ ] **Step 2: Verify failure**

Run: `node --experimental-strip-types --test tests/telemetry/bucket.test.ts`  
Expected: FAIL because bucket contracts are absent.

- [ ] **Step 3: Implement minimal validation and freezing**

Return a structured clone frozen at every object/array boundary. Define catalogued errors `TEL_BUCKET_INVALID_INTERVAL`, `TEL_BUCKET_INVALID_SEQUENCE`, `TEL_BUCKET_INVALID_IDENTITY`, `TEL_BUCKET_INVALID_INTEGRITY`, `TEL_BUCKET_INVALID_CAPABILITY` and `TEL_BUCKET_NON_CANONICAL_PAYLOAD` using the TBS error envelope.

- [ ] **Step 4: Verify**

Run: `node --experimental-strip-types --test tests/telemetry/bucket.test.ts && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry tests/telemetry/bucket.test.ts
git commit -m "feat: define immutable telemetry buckets"
```

### Task 5: Implement public event schemas and deterministic ingestion

**Files:**
- Create: `packages/telemetry/src/events.ts`
- Create: `packages/telemetry/src/ingestion.ts`
- Modify: `packages/telemetry/src/index.ts`
- Create: `tests/telemetry/events.test.ts`
- Create: `tests/telemetry/ingestion.test.ts`

- [ ] **Step 1: Write failing schema tests**

Require schema v1 and unique producers for `TelemetryBucketClosed`, `TelemetryBucketAccepted`, `TelemetryBucketRejected`, `AudienceProjectionProduced`, `AudienceProjectionExpired`, `AudienceProjectionInvalidated`, `TelemetryCapabilityChanged`, `EdgeTelemetryIncidentReported` and `TelemetryValidationIncidentReported`. Do not implement a producer-ambiguous `TelemetryIncidentReported` concrete event.

- [ ] **Step 2: Write failing ingestion tests**

Verify valid append, same identity/content duplicate returning original acceptance, same identity/divergent content rejection, gap rejection without partial append, unsupported future schema rejection and no mutation of caller input.

- [ ] **Step 3: Implement event factories and ingestion service**

The service accepts injected signature/integrity validators and the existing `EventStore`. It appends one authoritative accepted/rejected decision and uses ExpectedRevision; it never calculates audience or price.

- [ ] **Step 4: Verify**

Run: `node --experimental-strip-types --test tests/telemetry/events.test.ts tests/telemetry/ingestion.test.ts && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry tests/telemetry
git commit -m "feat: ingest versioned telemetry buckets"
```

### Task 6: Implement AudienceProjection as a pure Telemetry read artifact

**Files:**
- Create: `packages/telemetry/src/audience-projection.ts`
- Modify: `packages/telemetry/src/index.ts`
- Create: `tests/telemetry/audience-projection.test.ts`

- [ ] **Step 1: Write failing projection tests**

Test a rolling fifteen-minute window, refresh from five-minute accepted batches, missing/rejected coverage, semantic version preservation, expiry, invalidation, low-confidence unusability, deterministic rebuild and no Evidence/price fields.

- [ ] **Step 2: Verify failure**

Run: `node --experimental-strip-types --test tests/telemetry/audience-projection.test.ts`  
Expected: FAIL because the projection is absent.

- [ ] **Step 3: Implement the pure applier**

The state contains projection identity/version, policy version, TV/Venue references, covered bucket identities, window, coverage, opaque domain-defined confidence value plus metric version, status `CURRENT|EXPIRED|INVALIDATED`, generated time and checkpoint. The applier accepts only Telemetry-owned accepted/expired/invalidated events.

- [ ] **Step 4: Verify rebuild and atomic promotion**

Use the kernel `rebuildProjection` and `InMemoryProjectionStore` in tests. Verify an invalid candidate never replaces current state.

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry tests/telemetry/audience-projection.test.ts
git commit -m "feat: build versioned audience projection"
```

### Task 7: Add PostgreSQL Telemetry storage support

**Files:**
- Create: `migrations/0006_telemetry_ledger.sql`
- Create: `tests/persistence/telemetry-schema.test.ts`
- Create: `tests/integration/postgres-telemetry.test.ts`

- [ ] **Step 1: Write failing migration tests**

Require indexes for producer/event type, TV, Edge installation, observed minute and accepted bucket identity without creating a mutable telemetry table that duplicates the Event Store.

- [ ] **Step 2: Write the migration**

Add upgrade-safe generated/expression indexes or a dedicated immutable lookup relation referencing authoritative event identity. Prohibit update/delete through database privileges or triggers consistent with the existing append-only migration strategy.

- [ ] **Step 3: Run persistence tests**

Run: `node --experimental-strip-types --test tests/persistence/telemetry-schema.test.ts`  
Expected: PASS.

- [ ] **Step 4: Run Docker integration tests**

Run: `docker compose up -d postgres && npm run db:migrate && npm run test:integration`  
Expected: all PostgreSQL tests PASS, including duplicate and divergent bucket behavior.

- [ ] **Step 5: Commit**

```bash
git add migrations tests/persistence tests/integration/postgres-telemetry.test.ts
git commit -m "feat: persist telemetry ledger indexes"
```

### Task 8: Expose a read-only AudienceProjection Cloud contract

**Files:**
- Create: `apps/cloud-api/src/telemetry-routes.ts`
- Modify: `apps/cloud-api/src/server.ts`
- Create: `tests/api/audience-projection-api.test.ts`

- [ ] **Step 1: Write failing API tests**

Require `GET /v1/tvs/:tvId/audience-projection` to return projection/version/policy/window/coverage/confidence metric/status/staleness and `404` when absent. Verify no POST/PUT/PATCH/DELETE route exists for consumers.

- [ ] **Step 2: Implement injected read dependency**

Register routes with an `AudienceProjectionReader` supplied through `ServerOptions`. The API does not rebuild, accept buckets, calculate price or expose raw camera data.

- [ ] **Step 3: Verify API and typecheck**

Run: `node --experimental-strip-types --test tests/api/audience-projection-api.test.ts && npm run typecheck`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/cloud-api tests/api/audience-projection-api.test.ts
git commit -m "feat: expose audience projection read API"
```

### Task 9: Enforce cross-context boundaries

**Files:**
- Create: `tests/architecture/telemetry-boundaries.test.mjs`
- Create: `tests/telemetry/consumer-boundaries.test.ts`

- [ ] **Step 1: Write dependency boundary tests**

Assert Telemetry imports kernel/persistence contracts only; does not import Pricing, Evidence, Campaign, Marketplace, AI or Fastify; and no consumer package imports Telemetry internals.

- [ ] **Step 2: Write behavioral boundary tests**

Prove Telemetry events contain no `EvidenceRecord`, `PricingQuote`, final price or legal audience claim; prove QR/NFC contracts are absent from Edge ingestion; prove only the read contract exposes AudienceProjection.

- [ ] **Step 3: Run architecture suite**

Run: `npm run test:architecture && node --experimental-strip-types --test tests/telemetry/consumer-boundaries.test.ts`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/architecture/telemetry-boundaries.test.mjs tests/telemetry/consumer-boundaries.test.ts
git commit -m "test: enforce telemetry context boundaries"
```

### Task 10: Certify the vertical slice

**Files:**
- Modify: `docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md`
- Create: `docs/reports/TELEMETRY_VERTICAL_SLICE_REPORT_V1.md`
- Modify: `packages/generation/src/artifact-authorization.ts`
- Modify: `tests/generation/artifact-authorization.test.ts`

- [ ] **Step 1: Run the complete verification suite**

Run: `npm run test:all && npm run typecheck && npm run test:integration && git diff --check`  
Expected: all configured tests PASS; no skipped database test when `DATABASE_URL` is provided by Docker.

- [ ] **Step 2: Re-evaluate the mechanical gate**

Promote ingestion service, public event schemas and read API only when every listed gate and test is present. Preserve PARTIAL/BLOCKED status for any missing contract; do not promote by association.

- [ ] **Step 3: Write the evidence-backed report**

Record implemented artifacts, commands run, test counts, migrations, API route, known production parameters still configurable and explicit exclusions: Pricing calculation, raw camera transport, QR/NFC handling, Evidence generation and a new Audience Bounded Context.

- [ ] **Step 4: Commit**

```bash
git add docs packages/generation tests/generation
git commit -m "docs: certify telemetry vertical slice"
```

- [ ] **Step 5: Request review before integration**

Compare branch history with `main`, verify the worktree is clean, and run the `requesting-code-review` and `verification-before-completion` skills. Merge only after the certified report matches actual test evidence.
