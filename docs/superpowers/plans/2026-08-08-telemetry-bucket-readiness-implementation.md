# Telemetry Bucket Readiness and Domain Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the certified `TelemetryBucket` construction and schema-compatibility contracts and implement the first deterministic Edge-to-Telemetry domain slice without implementing network transport or any PARTIAL composite.

**Architecture:** Edge remains the sole producer of immutable minute buckets. Telemetry validates and records acceptance/rejection outcomes through injected consumer-owned compatibility behavior. A local forward-only queue preserves original bytes and identities for retry. Playback never depends on telemetry success. Protobuf/HTTPS materialization is intentionally deferred to a separate transport plan after this slice passes its architecture gate.

**Tech Stack:** TypeScript 5.9, Node.js 24, existing kernel opaque identities and error descriptors, Node test runner, existing generation authorization registry.

---

## Scope and existing constraints

The current gate marks `TelemetryBucket`, `TelemetryBucketAccepted`, `TelemetryBucketRejected` and `AudienceProjection` as `IMPLEMENTATION_PARTIAL`. This plan may close and implement only the bucket construction/validation and local retry domain slice. It must not implement an HTTP server, Protobuf code generation, a broker, a repository, an AudienceProjection builder, Pricing integration, Evidence, or a new Bounded Context.

The approved compatibility profile is closed by default: Telemetry accepts exactly the opaque `TelemetrySchemaVersion` value `v1`; a missing entry is `UNSUPPORTED / ENTRY_NOT_FOUND`; matrix loading failure is `COMPATIBILITY_NOT_EVALUATED` and is retryable with the same original operation identity. All other version identities are retained but do not select schema interpretation.

The approved error behavior is forward-only: an invalid bucket is never rewritten or retried as corrected content. The Edge records an incident and continues producing later buckets. Transport retry is allowed only when no domain decision was produced, such as network failure or compatibility evaluation unavailable.

## File map

- Modify: `docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md` — record the now-closed construction and v1 consumer compatibility profile only after the gate review approves it.
- Modify: `docs/domain/TELEMETRY.md` — synchronize bucket/error/forward-only ownership language.
- Modify: `docs/domain/CONTRACT_COMPATIBILITY.md` — add the consumer-owned Telemetry schema scope without changing generic compatibility semantics.
- Create: `packages/telemetry/src/bucket-errors.ts` — immutable catalog of bucket construction and incident descriptors.
- Create: `packages/telemetry/src/bucket.ts` — immutable `TelemetryBucket` value contract and validation.
- Create: `packages/telemetry/src/telemetry-compatibility.ts` — pure consumer-owned v1 schema compatibility profile; no generic matrix or evaluator export.
- Create: `packages/telemetry/src/telemetry-outcomes.ts` — accepted/rejected/compatibility-not-evaluated outcome types.
- Create: `packages/telemetry/src/forward-only-queue.ts` — in-memory reference queue preserving original bucket bytes and identities.
- Modify: `packages/telemetry/src/index.ts` — export only the authorized domain slice.
- Create: `tests/telemetry/bucket-errors.test.ts` — catalog completeness and descriptor tests.
- Create: `tests/telemetry/bucket.test.ts` — construction, invariants, immutability and forward-only validation tests.
- Create: `tests/telemetry/telemetry-compatibility.test.ts` — v1 acceptance, missing entry rejection and matrix-unavailable result.
- Create: `tests/telemetry/telemetry-outcomes.test.ts` — acknowledgment/result invariants.
- Create: `tests/telemetry/forward-only-queue.test.ts` — queue identity/content/retry semantics.
- Create: `tests/documentation/telemetry-bucket-readiness.test.mjs` — source/manifest synchronization and no forbidden artifact test.
- Create: `docs/reviews/TELEMETRY_BUCKET_ARCHITECTURE_REVIEW_GATE_V1.md` — immutable manual gate after documentation and tests close.
- Create: `tests/documentation/telemetry-bucket-architecture-review-gate-v1.test.mjs` — enforcement of the reviewed snapshot.

### Task 1: Normative closure before code

**Files:**

- Modify: `docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md`
- Modify: `docs/domain/TELEMETRY.md`
- Modify: `docs/domain/CONTRACT_COMPATIBILITY.md`
- Create: `tests/documentation/telemetry-bucket-readiness.test.mjs`

- [ ] **Step 1: Add RED tests for the exact closure**

Require the documents to state, without ambiguity:

- the complete bucket construction error set already enumerated in Gate V1;
- one deterministic rejection reason per rejected bucket;
- absent optional collectors represented by capability state and never fabricated;
- invalid buckets are not corrected or retried as modified content;
- exactly `v1` is supported by the Telemetry consumer profile;
- missing matrix entry is `UNSUPPORTED / ENTRY_NOT_FOUND`;
- matrix unavailability is `COMPATIBILITY_NOT_EVALUATED` and retryable with original bytes;
- no Playback interruption and no Evidence/Pricing authority.

Run:

```bash
node --test tests/documentation/telemetry-bucket-readiness.test.mjs
```

Expected: FAIL because the specialized closure text and test do not yet exist.

- [ ] **Step 2: Synchronize the normative text**

Update only the approved behavior. Do not invent a new status, Bounded Context, event producer or price rule. Keep generic compatibility authority in `CONTRACT_COMPATIBILITY.md` and add only Telemetry's consumer scope.

- [ ] **Step 3: Verify documentation synchronization**

Run:

```bash
npm run test:docs
git diff --check
```

Expected: all documentation tests pass.

- [ ] **Step 4: Commit**

```bash
git add docs tests/documentation/telemetry-bucket-readiness.test.mjs
git commit -m "docs: close telemetry bucket readiness contract"
```

### Task 2: Bucket error and incident catalog

**Files:**

- Create: `packages/telemetry/src/bucket-errors.ts`
- Create: `tests/telemetry/bucket-errors.test.ts`

- [ ] **Step 1: Write failing tests**

The tests must require immutable descriptors for these construction codes:

```text
INVALID_BUCKET_INTERVAL
INVALID_VENUE_TIME_ZONE
INVALID_SEQUENCE
DUPLICATE_CAPABILITY
INVALID_CAPABILITY_COVERAGE
MISSING_CONFIDENCE
UNEXPECTED_CONFIDENCE
UNKNOWN_MEASUREMENT_CAPABILITY
MEASUREMENT_FOR_UNAVAILABLE_CAPABILITY
NON_FINITE_MEASUREMENT
INVALID_INTEGRITY_REFERENCE
INVALID_AUTHENTICITY_PROOF
```

They must also require the incident codes:

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

Each descriptor must expose stable code, family, meaning, condition, retryable, recoverable, severity, consumer and version fields through the existing kernel `defineError` contract. No generic `ERROR_1` code is allowed.

- [ ] **Step 2: Run RED**

```bash
node --experimental-strip-types --test tests/telemetry/bucket-errors.test.ts
```

Expected: FAIL because the catalog module does not exist.

- [ ] **Step 3: Implement minimal frozen catalog**

Use `defineError` and `Object.freeze`. Export the catalog and exact lookup helpers. Do not add retry loops or transport behavior to this module.

- [ ] **Step 4: Verify GREEN**

```bash
node --experimental-strip-types --test tests/telemetry/bucket-errors.test.ts
```

Expected: all catalog tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry/src/bucket-errors.ts tests/telemetry/bucket-errors.test.ts
git commit -m "feat: add telemetry bucket error catalog"
```

### Task 3: Telemetry schema compatibility profile

**Files:**

- Create: `packages/telemetry/src/telemetry-compatibility.ts`
- Create: `packages/telemetry/src/telemetry-outcomes.ts`
- Create: `tests/telemetry/telemetry-compatibility.test.ts`
- Create: `tests/telemetry/telemetry-outcomes.test.ts`

- [ ] **Step 1: Write failing tests**

Require a pure function that receives the opaque `TelemetrySchemaVersion` identity and an evaluation availability flag and returns exactly:

```text
SUPPORTED
UNSUPPORTED / ENTRY_NOT_FOUND
COMPATIBILITY_NOT_EVALUATED / MATRIX_UNAVAILABLE
```

The tests must prove:

- only exact `v1` is supported;
- `V1`, `v2`, empty and malformed identities never become supported;
- no ordering, normalization or SemVer interpretation occurs;
- matrix unavailability is not classified as unsupported;
- compatibility outcome has no side effect and does not export generic matrix/evaluator artifacts;
- accepted, duplicate, rejected, conflict and not-evaluated outcomes preserve the original bucket identity.

- [ ] **Step 2: Run RED**

```bash
node --experimental-strip-types --test tests/telemetry/telemetry-compatibility.test.ts tests/telemetry/telemetry-outcomes.test.ts
```

Expected: FAIL because the profile and outcome modules do not exist.

- [ ] **Step 3: Implement pure profile and outcome types**

Keep the compatibility decision local to Telemetry's consumer boundary. Do not export `CompatibilityMatrix`, a generic evaluator, causes catalog, or any cross-context compatibility mechanism. The profile must compare the opaque value exactly and return immutable results.

- [ ] **Step 4: Verify GREEN**

```bash
node --experimental-strip-types --test tests/telemetry/telemetry-compatibility.test.ts tests/telemetry/telemetry-outcomes.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry/src/telemetry-compatibility.ts packages/telemetry/src/telemetry-outcomes.ts tests/telemetry/telemetry-compatibility.test.ts tests/telemetry/telemetry-outcomes.test.ts
git commit -m "feat: add telemetry schema compatibility profile"
```

### Task 4: Immutable TelemetryBucket contract

**Files:**

- Create: `packages/telemetry/src/bucket.ts`
- Create: `tests/telemetry/bucket.test.ts`

- [ ] **Step 1: Write failing tests**

Cover every Gate V1 invariant: one civil-minute half-open interval, `observedAt === intervalEnd`, IANA venue zone, non-negative safe sequence, ordered unique capabilities, coverage `0..1000`, confidence required only for `AVAILABLE`/`DEGRADED`, measurement capability membership, no measurement for `UNAVAILABLE`/`DISABLED`/`FAILED`, finite measurements, independent versions, three distinct hash purposes, valid authenticity proof, missing optional IDs, missing-versus-zero, deep immutability and exact byte/content identity.

The tests must prove construction never mutates input and failure returns the catalogued code. They must not test automatic correction or a retry of modified content.

- [ ] **Step 2: Run RED**

```bash
node --experimental-strip-types --test tests/telemetry/bucket.test.ts
```

Expected: FAIL because the bucket contract does not exist.

- [ ] **Step 3: Implement minimal immutable value**

Create a `TelemetryBucket` readonly value with a factory that validates the complete schema, clones input data, freezes nested collections and exposes canonical content without mutating it. Reuse ready identity/version constructors and the catalog descriptors. Do not add persistence, network, pricing, Evidence or projection behavior.

- [ ] **Step 4: Verify GREEN**

```bash
node --experimental-strip-types --test tests/telemetry/bucket.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry/src/bucket.ts tests/telemetry/bucket.test.ts
git commit -m "feat: add immutable telemetry bucket"
```

### Task 5: Forward-only local queue

**Files:**

- Create: `packages/telemetry/src/forward-only-queue.ts`
- Create: `tests/telemetry/forward-only-queue.test.ts`

- [ ] **Step 1: Write failing tests**

Prove that enqueue stores original immutable bytes and identities; final `ACCEPTED` and `DUPLICATE` remove an item; `REJECTED` and `CONFLICT` produce a terminal incident without rewriting or retrying; `COMPATIBILITY_NOT_EVALUATED` and network failure retain the exact original item; FIFO sequence is preserved; same identity with changed content is a conflict; no operation mutates playback state.

- [ ] **Step 2: Run RED**

```bash
node --experimental-strip-types --test tests/telemetry/forward-only-queue.test.ts
```

- [ ] **Step 3: Implement an in-memory reference queue**

Keep queue behavior independent from HTTP, Protobuf, timers and storage providers. The queue accepts immutable records, returns deterministic outcomes and exposes no method that edits a pending payload.

- [ ] **Step 4: Verify GREEN**

```bash
node --experimental-strip-types --test tests/telemetry/forward-only-queue.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry/src/forward-only-queue.ts tests/telemetry/forward-only-queue.test.ts
git commit -m "feat: add forward-only telemetry queue"
```

### Task 6: Package surface and readiness gate

**Files:**

- Modify: `packages/telemetry/src/index.ts`
- Create: `docs/reviews/TELEMETRY_BUCKET_ARCHITECTURE_REVIEW_GATE_V1.md`
- Create: `tests/documentation/telemetry-bucket-architecture-review-gate-v1.test.mjs`
- Modify: `docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md`

- [ ] **Step 1: Write failing surface and gate tests**

Require exact exports for the approved bucket slice and deny `AudienceProjection`, `TelemetryBucketAccepted`, `TelemetryBucketRejected`, HTTP, Protobuf, broker, repository, Pricing, Evidence and generic compatibility artifacts until separately authorized.

- [ ] **Step 2: Run RED**

```bash
npm run test:docs
npm run test:architecture
node --experimental-strip-types --test tests/generation/artifact-authorization.test.ts
```

Expected: FAIL because the new package surface and immutable gate record do not exist.

- [ ] **Step 3: Export only the approved slice and record the gate**

Export bucket errors, bucket value, Telemetry-specific compatibility profile, outcomes and queue. Record the exact reviewed commit SHA, tests, package tree and remaining blocked composites. Do not promote or materialize a composite by association.

- [ ] **Step 4: Verify GREEN**

```bash
npm run test:all
npm run typecheck
git diff --check
```

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry/src/index.ts docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md docs/reviews/TELEMETRY_BUCKET_ARCHITECTURE_REVIEW_GATE_V1.md tests/documentation/telemetry-bucket-architecture-review-gate-v1.test.mjs
git commit -m "docs: certify telemetry bucket domain slice"
```

### Task 7: Final vertical-slice verification

**Files:**

- Modify: `docs/reports/TELEMETRY_BUCKET_READINESS_REPORT_V1.md`
- Create: `tests/documentation/telemetry-bucket-readiness-report.test.mjs`

- [ ] **Step 1: Run complete verification with PostgreSQL available**

```bash
$env:DATABASE_URL="postgresql://mostarda:mostarda-local-only@localhost:55432/mostarda"
npm run db:migrate
npm run test:all
npm run typecheck
git diff --check
```

Expected: all tests pass, with PostgreSQL integration tests executed rather than skipped.

- [ ] **Step 2: Verify authorization mechanically**

Every implemented artifact must be `IMPLEMENTATION_READY`. `TelemetryBucketAccepted`, `TelemetryBucketRejected`, `AudienceProjection`, transport, infrastructure and all remaining PARTIAL artifacts must remain absent.

- [ ] **Step 3: Write the readiness report**

Record exact commit SHA, tests, package tree, implemented artifacts, blocked artifacts and the next boundary: Protobuf/HTTPS transport only after this slice is approved.

- [ ] **Step 4: Commit**

```bash
git add docs/reports/TELEMETRY_BUCKET_READINESS_REPORT_V1.md tests/documentation/telemetry-bucket-readiness-report.test.mjs
git commit -m "docs: certify telemetry bucket readiness"
```

## Plan self-review

- All approved design sections are mapped: transport boundary, buckets, statuses, incidents, forward-only retry, shift reconciliation, integrity, privacy, visual projection and compatibility.
- Network transport and Protobuf field-number materialization are explicitly deferred to a separate plan; no hidden transport behavior is required by this slice.
- No step uses TODO, TBD or unspecified implementation behavior.
- Every task has exact files, RED/GREEN commands and a commit boundary.
- No task creates a new Bounded Context, changes Evidence ownership, makes Pricing authoritative or promotes a PARTIAL composite by association.
- The readiness report is not allowed to claim `TelemetryBucketAccepted` or `TelemetryBucketRejected` are implemented by association; they remain blocked until their own contracts are closed.
