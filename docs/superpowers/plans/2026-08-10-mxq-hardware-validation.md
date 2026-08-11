# MXQ Hardware Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an immutable, reproducible HardwareValidationRecord for the MXQ candidate without mutating or promoting the HardwareProfile.

**Architecture:** The validator consumes only the sealed Discovery Record and CANDIDATE HardwareProfile, validates their hashes, invokes the existing Compatibility Engine to enumerate unresolved requirements, and records non-invasive validation methods and findings. The validation artifact is an audit trail; it is not a HardwareProfile, InstallationProfile, provisioning operation, or authorization.

**Tech Stack:** TypeScript ESM, Node `crypto`, existing edge-discovery, edge-compatibility, and edge-hardware-profile packages, Node test runner.

---

### Task 1: Define the validation contract and failing tests

**Files:**
- Create: `packages/edge-hardware-validation/src/validation.ts`
- Create: `packages/edge-hardware-validation/src/index.ts`
- Create: `packages/edge-hardware-validation/package.json`
- Test: `tests/edge-hardware-validation/mxq-validation.test.ts`

- [x] **Step 1: Write failing tests** for sealed-input/hash checks, candidate-only lifecycle, incomplete validation without a physical method, preserved provenance, deterministic output, and rejection of tampered inputs.
- [x] **Step 2: Run the focused test** and confirm it fails because the validation package does not exist.

### Task 2: Implement the minimal validation factory

**Files:**
- Modify: `packages/edge-hardware-validation/src/validation.ts`
- Modify: `packages/edge-hardware-validation/src/index.ts`

- [x] **Step 1: Implement input verification** for Discovery schema/lifecycle/evidenceRoot/recordHash and candidate profile hash, lifecycle, identity, authorization, and discovery reference.
- [x] **Step 2: Implement findings** from the Compatibility Engine requirements, preserving existing fact IDs and evidence references while leaving unvalidated capabilities UNKNOWN/UNRESOLVED.
- [x] **Step 3: Implement deterministic canonical hashing** and immutable result construction, including explicit non-invasive method status and blocked promotion.
- [x] **Step 4: Run focused tests and refactor without changing behavior.

### Task 3: Generate and verify the MXQ validation artifact

**Files:**
- Create: `artifacts/edge-hardware-validation/mxq-pro-4k-5g/hardware-validation-2026-08-10.json`
- Create: `scripts/generate-mxq-hardware-validation.mjs`
- Modify: `tests/edge-hardware-validation/mxq-validation.test.ts`

- [x] **Step 1: Generate the artifact** from the committed Discovery and candidate profile using a fixed validation instant.
- [x] **Step 2: Add a byte-for-byte artifact reproduction test.
- [x] **Step 3: Independently verify the validation hash and source hashes.

### Task 4: Run all gates and publish an isolated PR

- [x] **Step 1:** Run `npm run test:all`.
- [x] **Step 2:** Run `npm run typecheck`.
- [x] **Step 3:** Run `git diff --check` and inspect the complete diff.
- [x] **Step 4:** Commit the slice, push `feat/mxq-hardware-validation`, and open a draft PR without merging.
