# MXQ Hardware Profile Candidate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive one immutable `HardwareProfile` in `CANDIDATE` state exclusively from the sealed MXQ `HardwareDiscoveryRecord`, without authorizing installation or provisioning.

**Architecture:** Add a small profile package that validates the sealed discovery schema and record integrity, preserves every source Fact and evidence reference, maps only explicitly observed values to known fields, represents all other capabilities as `UNKNOWN`/`UNRESOLVED`, and computes a reproducible profile fingerprint/hash. The generated artifact remains `PROVISIONAL`, unsigned for operational use, and has no InstallationProfile association.

**Tech Stack:** TypeScript, Node `crypto`, existing edge-discovery canonical hash functions, Node test runner, JSON artifact.

---

### Task 1: Define failing candidate-profile behavior

**Files:**
- Create: `packages/edge-hardware-profile/package.json`
- Create: `packages/edge-hardware-profile/src/profile.ts`
- Create: `packages/edge-hardware-profile/src/index.ts`
- Test: `tests/edge-hardware-profile/mxq-candidate.test.ts`

- [ ] **Step 1: Write tests for derivation, provenance, unknowns, immutability, and rejection.**
- [ ] **Step 2: Run the focused test and confirm it fails because the profile factory does not exist.**
- [ ] **Step 3: Implement the minimal typed profile schema and factory.**
- [ ] **Step 4: Run the focused tests and confirm they pass.**

### Task 2: Add the reproducible MXQ candidate artifact

**Files:**
- Create: `artifacts/edge-hardware-profiles/mxq-pro-4k-5g/hardware-profile-candidate-2026-08-10.json`
- Modify: `tests/edge-hardware-profile/mxq-candidate.test.ts`

- [ ] **Step 1: Generate the artifact only from the existing sealed Discovery JSON.**
- [ ] **Step 2: Add byte/reconstruction assertions for profile hash, fingerprint, Discovery hash, and lifecycle.**
- [ ] **Step 3: Run focused profile and artifact tests.**

### Task 3: Run repository gates and audit scope

**Files:**
- No additional source files.

- [ ] **Step 1: Run `npm run test:all`.**
- [ ] **Step 2: Run `npm run typecheck`.**
- [ ] **Step 3: Run `git diff --check`.**
- [ ] **Step 4: Verify no InstallationProfile, provisioning operation, MXQ mutation, or main change was introduced.**
- [ ] **Step 5: Commit the candidate slice and prepare a non-merged PR.**
