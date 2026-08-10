# MXQ Pro 4K 5G Hardware Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a read-only Android/ADB laboratory Discovery slice that records the supplied MXQ observations and produces deterministic, evidence-aware `HardwareDiscoveryRecord` values without creating a Hardware Profile.

**Architecture:** A pure package owns record validation, normalization and hashing. An injected ADB transport exposes only an explicit read-only allow-list. A separate intake adapter preserves human-provided observations as low-trust facts. The CLI composes the adapters and writes JSON only to stdout.

**Tech Stack:** TypeScript (Node 24), Node built-in test runner, SHA-256 canonical JSON hashing, child-process ADB adapter injected behind an interface.

---

### Task 1: Define the package boundary and failing record tests

**Files:**
- Create: `packages/edge-discovery/package.json`
- Create: `packages/edge-discovery/src/record.ts`
- Create: `packages/edge-discovery/src/index.ts`
- Test: `tests/edge-discovery/record.test.ts`

- [ ] **Step 1: Write failing tests for lifecycle and immutable fact envelopes**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createDiscoveryRecord, sealDiscoveryRecord } from "../../packages/edge-discovery/src/record.ts";

test("record preserves partial observations and seals with missing requirements", () => {
  const record = createDiscoveryRecord({
    discoveryId: "disc-mxq-001",
    targetIdentity: { bindingState: "PROVISIONAL", reference: "mxq-lab-001" },
    collectorVersion: "edge-discovery-lab-v1",
    facts: [],
    missingRequirements: ["soc.model", "memory.ram.total"],
  });
  const sealed = sealDiscoveryRecord(record);
  assert.equal(sealed.lifecycleState, "SEALED");
  assert.deepEqual(sealed.missingRequirements, ["memory.ram.total", "soc.model"]);
  assert.match(sealed.recordHash, /^[a-f0-9]{64}$/);
});

test("sealed records are immutable snapshots", () => {
  const record = createDiscoveryRecord({
    discoveryId: "disc-mxq-002",
    targetIdentity: { bindingState: "PROVISIONAL", reference: "mxq-lab-001" },
    collectorVersion: "edge-discovery-lab-v1",
    facts: [],
    missingRequirements: [],
  });
  const sealed = sealDiscoveryRecord(record);
  assert.throws(() => sealed.facts.push({} as never), /immutable/i);
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the package is missing**

Run: `node --experimental-strip-types --test tests/edge-discovery/record.test.ts`

Expected: FAIL with a module-not-found or missing-export error.

- [ ] **Step 3: Implement the minimal record model**

Implement `Fact`, `Evidence`, `DiscoveryRecord`, `createDiscoveryRecord` and `sealDiscoveryRecord`. Sort facts and missing requirements by canonical key, freeze nested structures, and hash a canonical JSON projection excluding `recordHash` and `sealedAt`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --experimental-strip-types --test tests/edge-discovery/record.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/edge-discovery tests/edge-discovery/record.test.ts
git commit -m "feat: add discovery record contract"
```

### Task 2: Add deterministic normalization and laboratory intake

**Files:**
- Create: `packages/edge-discovery/src/normalization.ts`
- Create: `packages/edge-discovery/src/intake.ts`
- Test: `tests/edge-discovery/intake.test.ts`

- [ ] **Step 1: Write failing tests for the supplied MXQ observations**

The test shall assert that the intake preserves `MXQ Pro 4K 5G`, `R329Q_V8.1`, `Nex30`, Android `13.0`, kernel `3.10.104`, build `TV BOX eng.akrd2.20240222.161226`, and the displayed `256 GB`/`1024 GB` values. It shall assert that the capacity facts have `trustClass: "DECLARED"`, `evidence.integrityState: "UNVERIFIED"`, and `validationState: "UNVERIFIED"`, while missing physical proof is listed explicitly.

- [ ] **Step 2: Run the focused test and verify the expected missing-module failure**

Run: `node --experimental-strip-types --test tests/edge-discovery/intake.test.ts`

Expected: FAIL because the intake module does not exist.

- [ ] **Step 3: Implement intake and normalization**

Normalize byte quantities only as a representation; keep the original display string and never mark the capacity as measured. Store probable RK3228A/RK3229 and ARM 32-bit as `SYSTEM_REPORTED`/`UNVERIFIED` observations with an explicit `inference` marker. Add missing requirements for SoC, physical RAM/storage, GPU/VPU, codecs, display, network probes, boot, partitions, recovery, secure boot and identity capabilities.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --experimental-strip-types --test tests/edge-discovery/intake.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/edge-discovery/src/normalization.ts packages/edge-discovery/src/intake.ts tests/edge-discovery/intake.test.ts
git commit -m "feat: preserve mxq discovery intake"
```

### Task 3: Add the read-only Android/ADB collector

**Files:**
- Create: `packages/edge-discovery/src/android-adb-collector.ts`
- Test: `tests/edge-discovery/android-adb-collector.test.ts`

- [ ] **Step 1: Write failing tests for command allow-list and missing observations**

Test a fake transport that records commands. Assert that collection requests only read-only commands (`getprop`, `cat`, `grep`, `df`, `dumpsys`, `wm`) and rejects `mount`, `dd`, `parted`, `reboot`, `su`, `pm install`, and any shell command not in the allow-list. Assert that a failed optional command produces a typed missing observation instead of a fabricated capability.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --experimental-strip-types --test tests/edge-discovery/android-adb-collector.test.ts`

Expected: FAIL because the collector module does not exist.

- [ ] **Step 3: Implement the injected collector**

Define `AdbTransport.exec(command)` and `collectAndroidFacts(transport, context)`. Keep the command list as constants, never interpolate untrusted input, capture raw stdout/stderr/exit status, and convert unavailable commands to `COLLECTOR_UNAVAILABLE`, `SOURCE_UNREADABLE` or `REQUIRED_FACT_MISSING` observations. Do not calculate compatibility.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --experimental-strip-types --test tests/edge-discovery/android-adb-collector.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/edge-discovery/src/android-adb-collector.ts tests/edge-discovery/android-adb-collector.test.ts
git commit -m "feat: add read-only android discovery collector"
```

### Task 4: Add the lab CLI and integration coverage

**Files:**
- Modify: `packages/edge-discovery/src/index.ts`
- Create: `scripts/edge-discovery.ts`
- Test: `tests/edge-discovery/discovery-integration.test.ts`

- [ ] **Step 1: Write a failing integration test**

Compose intake plus a deterministic fake ADB transport and assert the output is `SEALED`, contains both supplied and collected facts, lists unresolved physical requirements, has a stable 64-character hash, and has no compatibility classification or Hardware Profile field.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --experimental-strip-types --test tests/edge-discovery/discovery-integration.test.ts`

Expected: FAIL because the public composition and CLI do not exist.

- [ ] **Step 3: Implement the CLI**

The CLI accepts only a device serial already selected by the operator, invokes `adb -s <serial> shell <allow-listed-command>` through the transport, merges intake and collected facts, seals the record and prints JSON. It must exit nonzero if ADB is unavailable, while still preserving a typed failure result when called as a library.

- [ ] **Step 4: Run focused and full tests**

Run: `node --experimental-strip-types --test tests/edge-discovery/*.test.ts` and then `npm run test:all`.

Expected: all focused tests pass; full suite remains green with only the existing two PostgreSQL skips.

- [ ] **Step 5: Commit**

```bash
git add packages/edge-discovery/src/index.ts scripts/edge-discovery.ts tests/edge-discovery/discovery-integration.test.ts
git commit -m "feat: compose mxq discovery laboratory flow"
```

### Task 5: Verify and publish the experimental slice

**Files:**
- Modify: `README.md` only if the CLI usage needs a project-level pointer.

- [ ] **Step 1: Run typecheck and all tests**

Run: `npm run typecheck` and `npm run test:all`.

- [ ] **Step 2: Verify the write-safety guard**

Run a test that enumerates the collector command constants and confirms no command contains `dd`, `mount`, `parted`, `mkfs`, `reboot`, `fastboot`, `pm install`, or partition-write flags.

- [ ] **Step 3: Inspect the generated intake record**

Run the library against the supplied fixture/fake transport and confirm the two displayed capacities remain unverified, the probable SoC remains unresolved, and no classification is present.

- [ ] **Step 4: Commit the completed slice**

```bash
git add .
git commit -m "feat: complete mxq hardware discovery slice"
```
