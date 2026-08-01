# Compatibility Version Recertification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize the approved consumer-owned compatibility model and deterministically recertify only the six opaque Telemetry version identities that no longer depend on producer-side compatibility allowlists.

**Architecture:** Version identities remain producer-owned opaque values. Consumer-owned compatibility evaluation is specified as a separate cross-cutting contract and is not implemented by Telemetry in this slice. The existing deny-by-default generation registry and a new manual Architecture Review Gate prevent version-value construction from silently authorizing compatibility evaluation, matrices, or composite telemetry artifacts.

**Tech Stack:** Markdown normative specifications, Node.js 24, TypeScript 5.9, Node test runner, existing generation authorization registry and documentation gates.

---

## File structure

- `docs/domain/CONTRACT_COMPATIBILITY.md`: specialized normative compatibility specification.
- `docs/specification/DECISION_REGISTRY.md`: approved compatibility decision.
- `docs/specification/PLATFORM_SPECIFICATION.md`: platform-level version/compatibility invariants.
- `docs/specification/TECHNICAL_BEHAVIOR_SPECIFICATION.md`: cross-cutting observable evaluation behavior.
- `docs/domain/TELEMETRY.md`: Telemetry producer boundary and consumer-only compatibility rule.
- `docs/domain/OWNERSHIP.md`: compatibility ownership matrix.
- `docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md`: recertified version identities and transitive artifact status.
- `packages/generation/src/artifact-authorization.ts`: exact READY/PARTIAL executable manifests.
- `docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V2.md`: new immutable manual review record.
- `packages/telemetry/src/versions.ts`: six opaque version identities after authorization.
- `tests/documentation/contract-compatibility.test.mjs`: normative synchronization tests.
- `tests/documentation/telemetry-implementation-gate.test.mjs`: certification consistency.
- `tests/documentation/telemetry-architecture-review-gate-v2.test.mjs`: manual gate enforcement.
- `tests/generation/artifact-authorization.test.ts`: executable authorization consistency.
- `tests/telemetry/versions.test.ts`: opaque identity behavior and forbidden compatibility inference.

### Task C1: Synchronize the compatibility specification

**Files:**
- Create: `docs/domain/CONTRACT_COMPATIBILITY.md`
- Modify: `docs/specification/DECISION_REGISTRY.md`
- Modify: `docs/specification/PLATFORM_SPECIFICATION.md`
- Modify: `docs/specification/TECHNICAL_BEHAVIOR_SPECIFICATION.md`
- Modify: `docs/domain/TELEMETRY.md`
- Modify: `docs/domain/OWNERSHIP.md`
- Create: `tests/documentation/contract-compatibility.test.mjs`

- [ ] **Step 1: Write the failing normative test**

Require the approved decision and bounded independent assertions for producer-owned opaque versions, consumer-owned matrices, four compatibility states, two result kinds, six non-evaluation causes, deterministic first-blocking pipeline, exact entry key, immutable/atomic matrix lifecycle, explicit replay revision, `CompatibilityScopeId`, Configuration Service distribution-only authority and no Audience/new compatibility Bounded Context.

```js
test("compatibility ownership is consumer-local and closed by default", () => {
  const compatibility = read("docs/domain/CONTRACT_COMPATIBILITY.md");
  assert.match(compatibility, /Every consumer.*owner/i);
  assert.match(compatibility, /absence.*UNSUPPORTED.*ENTRY_NOT_FOUND/is);
  assert.match(compatibility, /Configuration Service.*never.*compatibility authority/is);
  assert.doesNotMatch(compatibility, /Compatibility Bounded Context.*owner/i);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/documentation/contract-compatibility.test.mjs`

Expected: FAIL because `CONTRACT_COMPATIBILITY.md` and the decision entry are absent.

- [ ] **Step 3: Synchronize without adding a Bounded Context**

Create one normative authority from the approved design. Record a new accepted decision after `DEC-063`. TBS defines observable evaluation behavior; the domain document defines ownership and vocabulary. Telemetry records exact version identities only and never evaluates consumer compatibility.

- [ ] **Step 4: Verify**

Run: `npm run test:docs && npm run test:architecture && git diff --check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs tests/documentation/contract-compatibility.test.mjs
git commit -m "docs: define consumer-owned contract compatibility"
```

### Task C2: Recertify opaque Telemetry version identities

**Files:**
- Modify: `docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md`
- Modify: `packages/generation/src/artifact-authorization.ts`
- Modify: `tests/documentation/telemetry-implementation-gate.test.mjs`
- Modify: `tests/generation/artifact-authorization.test.ts`

- [ ] **Step 1: Write failing promotion tests**

Assert the six version artifacts currently return `IMPLEMENTATION_PARTIAL` and cite the existing gate. Add document tests requiring the new certification to distinguish canonical identity construction from compatibility evaluation.

- [ ] **Step 2: Rewrite each bounded artifact certification**

For each version identity define:

- unique producer owner;
- opaque exact `VersionValue` schema;
- producer-owned syntax/canonical representation reference;
- errors only for invalid identity representation;
- no ordering/normalization/coercion;
- replay preserves exact value;
- compatibility is explicitly excluded and consumer-owned;
- tests for identity preservation and absence of compatibility inference.

Remove `UNSUPPORTED_*` from version constructors. Unsupported processing belongs exclusively to CompatibilityEvaluation.

- [ ] **Step 3: Apply transitive closure mechanically**

Promote only the six version identities if their own sections close every gate. Re-evaluate `TelemetryBucket`, accepted/rejected events and `AudienceProjection` independently. They remain PARTIAL unless every non-version dependency and their complete schemas/errors are already closed; no promotion by association.

- [ ] **Step 4: Couple all representations**

Require exact unique equality among READY matrix rows, READY manifest and executable READY registry; do the same for PARTIAL. Require disjointness and accurate status/source.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:docs && node --experimental-strip-types --test tests/generation/artifact-authorization.test.ts && npm run typecheck && git diff --check`

```bash
git add docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md packages/generation tests
git commit -m "docs: recertify opaque telemetry versions"
```

### Architecture Review Gate C3: Manual authorization review

**Execution rule:** No version production code and no original Task 4 work may begin until this new review is committed as `APPROVED`.

**Files:**
- Create: `docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V2.md`
- Create: `tests/documentation/telemetry-architecture-review-gate-v2.test.mjs`

- [ ] **Gate 1: Review immutable authority snapshot**

Record exact reviewed head/range and load every cited authority, gate, registry and package source from that commit with `git show <head>:<path>`.

- [ ] **Gate 2: Verify strategic invariants**

Record `PASS` or `FAIL` for:

- no new Bounded Context;
- producer owns identity but not consumer compatibility;
- each consumer owns only its matrix;
- Configuration Service distributes only;
- Telemetry does not evaluate compatibility;
- Evidence and Pricing ownership remain unchanged;
- READY/PARTIAL matrix, manifests and registry match exactly;
- no composite/service/API/infrastructure bypass.

- [ ] **Gate 3: Verify implementation boundary**

Before implementation, package exports must still contain only the previously approved three IDs and capability status. Newly recertified version types are authorized but not yet materialized. Every other PARTIAL artifact is absent and denied.

- [ ] **Gate 4: Write enforcement test**

The test validates immutable reviewed sources, exact authorization sets and package surface rather than trusting report prose. Historical review V1 remains separate.

- [ ] **Gate 5: Verify and commit**

Run: `npm run test:docs && npm run test:architecture && node --experimental-strip-types --test tests/generation/artifact-authorization.test.ts && npm run typecheck && git diff --check`

```bash
git add docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V2.md tests/documentation/telemetry-architecture-review-gate-v2.test.mjs
git commit -m "docs: approve opaque version architecture gate"
```

### Task C4: Implement the recertified version identities

**Files:**
- Create: `packages/telemetry/src/versions.ts`
- Modify: `packages/telemetry/src/index.ts`
- Create: `tests/telemetry/versions.test.ts`

- [ ] **Step 1: Write failing tests**

For all six authorized version types, prove exact round-trip, rejection of empty/padded identities through kernel `createOpaqueId`, pairwise type distinction, runtime export allowlist, generation authorization and compile-time absence of compatibility matrices/evaluators/decisions/results/causes.

- [ ] **Step 2: Verify RED**

Run: `node --experimental-strip-types --test tests/telemetry/versions.test.ts`

Expected: FAIL because `versions.ts` does not exist.

- [ ] **Step 3: Implement only opaque identities**

Delegate construction to kernel `createOpaqueId`. Do not parse SemVer, order values, normalize strings, query a matrix or export compatibility behavior.

- [ ] **Step 4: Verify**

Run: `node --experimental-strip-types --test tests/telemetry/*.test.ts && npm run typecheck && npm run test:architecture && npm test && git diff --check`

Expected: all tests pass; only database-dependent tests may skip without `DATABASE_URL`.

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry tests/telemetry/versions.test.ts
git commit -m "feat: add opaque telemetry version identities"
```

### Task C5: Reassess the original Task 4 boundary

**Files:**
- Modify: `docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md`
- Modify: `docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V2.md`
- Create: `docs/reports/TELEMETRY_VERSION_RECERTIFICATION_REPORT_V1.md`

- [ ] **Step 1: Run complete verification**

Run: `npm run test:all && npm run typecheck && git diff --check`

- [ ] **Step 2: Verify implemented surface against authorization**

Every implemented telemetry artifact must be READY. Every PARTIAL artifact must remain absent. Confirm no version constructor performs compatibility evaluation.

- [ ] **Step 3: Decide original Task 4 eligibility mechanically**

`TelemetryBucket` may proceed only if its current gate status is READY after independent closure. If still PARTIAL, report exact remaining blockers and stop; do not implement it.

- [ ] **Step 4: Write and commit the report**

```bash
git add docs
git commit -m "docs: report telemetry version recertification"
```

- [ ] **Step 5: Request final review**

Run `requesting-code-review` across Tasks C1-C5. Resolve every specification and quality finding before returning to the original Telemetry plan.
