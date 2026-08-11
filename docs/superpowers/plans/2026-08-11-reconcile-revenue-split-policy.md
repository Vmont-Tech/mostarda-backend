# Revenue Split Policy Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed commercial split with the versioned component-and-fund policy while preserving Settlement, Evidence, Ledger, Wallet, Withdrawal, Asaas, and the independent fund spending mechanisms.

**Architecture:** Settlement is the existing owner of split calculation. This work materializes only a pure `SplitPolicy` contract under a small `@mostarda/settlement` package; it does not create a new bounded context, persistence, API, ledger, or payment adapter. Seven immutable allocation lines are produced: TV, Space, Seller, Seller Acquisition Fund, Influencer, Influencer Acquisition Fund, and Mostarda.

**Tech Stack:** TypeScript ESM, Node test runner, integer basis points (`10000 = 100%`), Markdown normative specifications.

---

### Task 1: Add failing Settlement policy tests

**Files:**
- Create: `tests/settlement/split-policy.test.ts`
- Create: `packages/settlement/package.json`
- Create: `packages/settlement/src/index.ts` (empty export placeholder only for the initial import failure)

- [ ] **Step 1: Write the failing tests first**

Create a test helper with all eight component flags and assert the public API that the implementation must provide:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { calculateSplit, SPLIT_POLICY_VERSION } from "../../packages/settlement/src/index.ts";

const none = {
  seller: { acquisition: false, activationPayment: false, renewal: false, volume: false },
  influencer: { entry: false, activation: false, performanceEngagement: false, recurrenceResult: false },
};

test("no earned variable component credits both acquisition funds and keeps Mostarda at 30%", () => {
  const result = calculateSplit(none);
  assert.equal(result.tvOwnerBps, 2000);
  assert.equal(result.spaceOwnerBps, 2000);
  assert.equal(result.sellerBps, 0);
  assert.equal(result.sellerAcquisitionFundBps, 2000);
  assert.equal(result.influencerBps, 0);
  assert.equal(result.influencerAcquisitionFundBps, 1000);
  assert.equal(result.mostardaBps, 3000);
  assert.equal(result.totalBps, 10000);
});

test("earned components reduce only their corresponding acquisition fund", () => {
  const result = calculateSplit({
    seller: { acquisition: true, activationPayment: true, renewal: false, volume: false },
    influencer: { entry: true, activation: false, performanceEngagement: false, recurrenceResult: true },
  });
  assert.equal(result.sellerBps, 1000);
  assert.equal(result.sellerAcquisitionFundBps, 1000);
  assert.equal(result.influencerBps, 600);
  assert.equal(result.influencerAcquisitionFundBps, 400);
  assert.equal(result.mostardaBps, 3000);
  assert.equal(result.totalBps, 10000);
});

test("all eight earned components reach the component ceilings", () => {
  const result = calculateSplit({
    seller: { acquisition: true, activationPayment: true, renewal: true, volume: true },
    influencer: { entry: true, activation: true, performanceEngagement: true, recurrenceResult: true },
  });
  assert.equal(result.sellerBps, 2000);
  assert.equal(result.sellerAcquisitionFundBps, 0);
  assert.equal(result.influencerBps, 1000);
  assert.equal(result.influencerAcquisitionFundBps, 0);
  assert.equal(result.mostardaBps, 3000);
  assert.equal(result.totalBps, 10000);
});

test("the policy version is explicit and creative production is outside commercial calculation", () => {
  assert.equal(SPLIT_POLICY_VERSION, "SPLIT-PERFORMANCE-RESIDUAL-V1");
  const commercial = calculateSplit({ ...none, creativeProduction: { applicable: false } });
  const sameCommercialWithCreativeContext = calculateSplit({ ...none, creativeProduction: { applicable: true } });
  assert.deepEqual(sameCommercialWithCreativeContext, commercial);
});

test("every combination of earned components preserves all limits and 100 percent", () => {
  for (let mask = 0; mask < 256; mask += 1) {
    const result = calculateSplit({
      seller: {
        acquisition: (mask & 1) !== 0,
        activationPayment: (mask & 2) !== 0,
        renewal: (mask & 4) !== 0,
        volume: (mask & 8) !== 0,
      },
      influencer: {
        entry: (mask & 16) !== 0,
        activation: (mask & 32) !== 0,
        performanceEngagement: (mask & 64) !== 0,
        recurrenceResult: (mask & 128) !== 0,
      },
    });
    assert.equal(result.tvOwnerBps, 2000);
    assert.equal(result.spaceOwnerBps, 2000);
    assert.ok(result.sellerBps >= 0 && result.sellerBps <= 2000);
    assert.ok(result.influencerBps >= 0 && result.influencerBps <= 1000);
    assert.ok(result.mostardaBps >= 3000);
    assert.equal(result.totalBps, 10000);
  }
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `node --experimental-strip-types --test tests/settlement/split-policy.test.ts`

Expected: FAIL because `calculateSplit` and `SPLIT_POLICY_VERSION` do not exist yet.

### Task 2: Implement the pure versioned SplitPolicy

**Files:**
- Modify: `packages/settlement/package.json`
- Modify: `packages/settlement/src/index.ts`

- [ ] **Step 1: Define the public contract and basis-point constants**

Use integer basis points and immutable role output:

```ts
export const SPLIT_POLICY_VERSION = "SPLIT-PERFORMANCE-RESIDUAL-V1" as const;
const TOTAL_BPS = 10_000;
const TV_OWNER_BPS = 2_000;
const SPACE_OWNER_BPS = 2_000;
const SELLER_MAX_BPS = 2_000;
const INFLUENCER_MAX_BPS = 1_000;
const MOSTARDA_MIN_BPS = 3_000;

export interface SplitPolicyInput {
  readonly creativeProduction?: { readonly applicable: boolean };
  readonly seller: {
    readonly acquisition: boolean;
    readonly activationPayment: boolean;
    readonly renewal: boolean;
    readonly volume: boolean;
  };
  readonly influencer: {
    readonly entry: boolean;
    readonly activation: boolean;
    readonly performanceEngagement: boolean;
    readonly recurrenceResult: boolean;
  };
}

export interface SplitAllocation {
  readonly policyVersion: typeof SPLIT_POLICY_VERSION;
  readonly tvOwnerBps: number;
  readonly spaceOwnerBps: number;
  readonly sellerBps: number;
  readonly sellerAcquisitionFundBps: number;
  readonly influencerBps: number;
  readonly influencerAcquisitionFundBps: number;
  readonly mostardaBps: number;
  readonly totalBps: number;
}
```

- [ ] **Step 2: Implement deterministic component calculation**

Seller components must contribute `500` each; influencer components must contribute `300`, `200`, `200`, and `300`. The unearned remainder goes to the corresponding fund. Mostarda is computed as the residual after all seven lines and must be at least `3000`.

```ts
export function calculateSplit(input: SplitPolicyInput): SplitAllocation {
  const sellerBps =
    (input.seller.acquisition ? 500 : 0) +
    (input.seller.activationPayment ? 500 : 0) +
    (input.seller.renewal ? 500 : 0) +
    (input.seller.volume ? 500 : 0);
  const influencerBps =
    (input.influencer.entry ? 300 : 0) +
    (input.influencer.activation ? 200 : 0) +
    (input.influencer.performanceEngagement ? 200 : 0) +
    (input.influencer.recurrenceResult ? 300 : 0);
  const allocation = Object.freeze({
    policyVersion: SPLIT_POLICY_VERSION,
    tvOwnerBps: TV_OWNER_BPS,
    spaceOwnerBps: SPACE_OWNER_BPS,
    sellerBps,
    sellerAcquisitionFundBps: SELLER_MAX_BPS - sellerBps,
    influencerBps,
    influencerAcquisitionFundBps: INFLUENCER_MAX_BPS - influencerBps,
    mostardaBps: TOTAL_BPS - TV_OWNER_BPS - SPACE_OWNER_BPS - SELLER_MAX_BPS - INFLUENCER_MAX_BPS,
    totalBps: TOTAL_BPS,
  });
  assertAllocation(allocation);
  return allocation;
}
```

- [ ] **Step 3: Add explicit invariant validation**

`assertAllocation` must reject any impossible output and prove fixed TV/Space, ceilings, fund conservation, Mostarda minimum, and exact total. It must not access a database or make eligibility decisions.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --experimental-strip-types --test tests/settlement/split-policy.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 5: Commit the executable policy**

```bash
git add packages/settlement/package.json packages/settlement/src/index.ts tests/settlement/split-policy.test.ts
git commit -m "feat(settlement): add component-based split policy"
```

### Task 3: Synchronize active normative documents and decision registry

**Files:**
- Modify: `docs/specification/PLATFORM_SPECIFICATION.md`
- Modify: `docs/domain/REVENUE_ARCHITECTURE.md`
- Modify: `docs/domain/SYSTEM_INVARIANTS.md`
- Modify: `docs/domain/BOUNDED_CONTEXTS.md`
- Modify: `docs/domain/AGGREGATES.md`
- Modify: `docs/domain/DOMAIN_DICTIONARY.md`
- Modify: `docs/product/PRODUCT_BIBLE.md`
- Modify: `docs/execution/TIMELINES.md`
- Modify: `docs/domain/EVIDENCE_PIPELINE.md`
- Modify: `docs/specification/DECISION_REGISTRY.md`

- [ ] **Step 1: Replace fixed split language with the component policy**

Each active normative source must say that TV/Space are fixed; Seller and Influencer are earned component totals; unearned components go to their corresponding acquisition fund; Mostarda is the residual with a minimum of 30%; and all seven lines total 100%. A/B/C remain test fixtures only.

- [ ] **Step 2: Preserve the Fund document and record the boundary**

Do not edit `DEC-049` or `INFLUENCER_DEVELOPMENT_FUND.md`. Add a decision-registry note that the new split policy allocates unearned components to fund rights but does not define fund balances, spending, governance, or campaign utilization. No old fund rule is marked superseded by inference.

- [ ] **Step 3: Register the new decision**

Add `DEC-066` as the current component-based commercial split decision and mark only the fixed split portion of `DEC-001` as superseded. Preserve historical ADRs and reports.

- [ ] **Step 4: Verify active sources no longer present the fixed split as current**

Run:

```powershell
rg -n "SPLIT-30-20-20-20-10|30% Mostarda|Vendedor.*20%|Influenciador.*10%" docs
```

Expected: no active normative source presents the old fixed split as the current commercial policy; retained matches must be historical or explicitly marked as superseded/conflict.

- [ ] **Step 5: Commit documentation reconciliation**

```bash
git add docs/specification docs/domain docs/product docs/execution
git commit -m "docs(finance): reconcile component split and acquisition funds"
```

### Task 4: Run complete verification and audit the boundary

**Files:**
- No additional files; inspect the complete diff and repository occurrences.

- [ ] **Step 1: Run all tests and typecheck**

Run: `npm run test:all`

Expected: zero failures; PostgreSQL tests may remain skipped only when `DATABASE_URL` is absent.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 2: Run focused Settlement tests**

Run: `node --experimental-strip-types --test tests/settlement/split-policy.test.ts`

Expected: all component combinations pass.

- [ ] **Step 3: Check formatting and forbidden scope**

Run: `git diff --check`

Run:

```powershell
git diff --name-only origin/main...HEAD
```

Expected: only the design/plan records, Settlement policy/tests, and listed normative finance documents are changed; no Edge, MXQ, frontend, database, Asaas, Ledger, Wallet, Withdrawal, or provisioning files appear.

- [ ] **Step 4: Audit remaining historical/conflict references**

Run:

```powershell
rg -n --hidden -g '!node_modules' -g '!.git' "SPLIT-30-20-20-20-10|30% Mostarda|Vendedor.*20%|Influenciador.*10%|DEC-049|InfluencerDevelopmentFund" .
```

Classify every remaining match as current synchronized policy, historical record, or explicitly unresolved fund boundary. No silent supersession is permitted.

- [ ] **Step 5: Final commit and report**

```bash
git status --short --branch
git log --oneline -4
```

Report branch, commits, changed files, old/new policy identifiers, test results, and every retained old occurrence with its classification. Do not merge to `main`.
