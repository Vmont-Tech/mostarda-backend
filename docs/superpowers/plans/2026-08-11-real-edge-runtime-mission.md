# Real Edge Runtime Mission Implementation Plan

> **For agentic workers:** Execute this plan incrementally with tests and gates after each milestone. Do not touch `main`, the MXQ, firmware, or provisioning.

**Goal:** Replace the simulated Edge path with a persistent, local/Linux `RealEdgeRuntime` that can survive restart and offline operation while keeping the existing Cloud/Player/Telemetry/Evidence contracts.

**Architecture:** `RealEdgeRuntime` is an adapter around the existing campaign/manifest/asset HTTP surface. It owns persistent identity, local content, playback state, telemetry queue, and execution observations; it does not decide compatibility, hardware status, or provisioning. The browser Player remains the visual artifact, while a small runtime playback executor drives the same manifest and playback contracts on Linux without claiming physical display success.

**Tech Stack:** Node.js 24, TypeScript strip-only execution, JSON file persistence, existing Fastify Cloud API, Node test runner.

---

### Task 1: Repository audit and runtime contracts

**Files:**
- Create: `docs/superpowers/plans/2026-08-11-real-edge-runtime-mission.md`
- Test: `tests/edge-runtime/real-edge-runtime.test.ts`

- [ ] Record the implemented/simulated/blocked boundary in tests and plan.
- [ ] Define the runtime's injected `EdgeCloudClient`, `EdgeStorage`, identity, health and diagnostics contracts in the failing tests.
- [ ] Run the focused tests and verify they fail because `RealEdgeRuntime` is absent.

### Task 2: Persistent Edge storage

**Files:**
- Create: `packages/edge-runtime/src/storage.ts`
- Modify: `packages/edge-runtime/src/index.ts`
- Test: `tests/edge-runtime/real-edge-runtime.test.ts`

- [ ] Write tests for identity, manifest, asset metadata/content, playback state, telemetry queue and evidence surviving a new storage instance.
- [ ] Implement an atomic JSON-file store using a temporary file plus rename; no database or distributed infrastructure.
- [ ] Keep the storage root configurable and reject a missing/invalid root rather than writing to the repository.

### Task 3: Real Edge runtime

**Files:**
- Create: `packages/edge-runtime/src/runtime.ts`
- Modify: `packages/edge-runtime/src/index.ts`
- Test: `tests/edge-runtime/real-edge-runtime.test.ts`

- [ ] Add failing tests for start, sync, asset digest verification, playback, telemetry delivery, retry and health/diagnostics.
- [ ] Implement `RealEdgeRuntime` with deterministic event identity, injected clock, persistent queue and idempotent Cloud POSTs.
- [ ] Preserve offline playback after a process restart and drain queued events when Cloud returns.

### Task 4: Runtime E2E command

**Files:**
- Create: `scripts/run-real-edge-e2e.ts`
- Modify: `package.json`, `README.md`
- Test: `tests/edge-runtime/real-edge-runtime.test.ts`

- [ ] Run a real HTTP-shaped Cloud adapter with `RealEdgeRuntime`, restart the runtime while offline, and verify playback plus later telemetry synchronization.
- [ ] Add `npm run edge:e2e` without changing `npm run mostarda:e2e`.
- [ ] Document that this is a software/Linux verification, not physical MXQ validation.

### Task 5: Hardware adapter boundary

**Files:**
- Create: `packages/edge-runtime/src/hardware-adapter.ts`
- Create: `scripts/edge-runtime-diagnostics.ts`
- Modify: `package.json`
- Test: `tests/edge-runtime/hardware-adapter.test.ts`

- [ ] Implement read-only host diagnostics (OS, architecture, memory, storage, network) through an injected adapter.
- [ ] Return `UNKNOWN` on unavailable probes and never synthesize MXQ capabilities.
- [ ] Add `npm run edge:diagnostics` for the local/Linux host only.

### Task 6: Compatibility/physical gate report

**Files:**
- Create: `scripts/edge-hardware-validate.ts`
- Test: `tests/edge-runtime/hardware-adapter.test.ts`

- [ ] Reuse the existing Compatibility Engine and existing MXQ candidate artifacts.
- [ ] Produce an auditable software validation artifact that remains `UNKNOWN`/`BLOCKED` for the MXQ without physical evidence.
- [ ] Do not create or promote HardwareProfile, InstallationProfile, or provisioning.

### Task 7: Full gates and isolated PR

- [ ] Run `npm run test:all`, `npm run typecheck`, `git diff --check`, `npm run edge:e2e`, and diagnostics.
- [ ] Audit the diff against Edge Runtime, Player, Telemetry, Evidence, Hardware Validation and MXQ constraints.
- [ ] Commit milestones semantically, push a branch, and open a Draft PR. Never merge automatically.
