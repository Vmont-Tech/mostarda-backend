# Edge Architecture Audit Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct the current Edge architecture, identify the delta to the proposed heterogeneous Edge platform, and sequence the work without promoting ADR-010 or inventing implementation behavior.

**Architecture:** Reuse `docs/specification/ARCHITECTURE_AUDIT.md` as the global baseline. Add three factual, non-normative documents: a current-state inventory, a gap analysis, and a dependency-ordered roadmap. The package must distinguish accepted authority (`ADR-002` and the current draft Specification) from proposed material (`ADR-010` and the draft provisioning platform) and must not update normative sources.

**Tech Stack:** Markdown documentation, repository links, PowerShell validation, existing `npm run test:docs` suite.

---

### Task 1: Establish the source inventory

**Files:**
- Read: `docs/specification/ARCHITECTURE_AUDIT.md`
- Read: `docs/specification/PLATFORM_SPECIFICATION.md`
- Read: `docs/adr/ADR-002-Edge-Architecture.md`
- Read: `docs/adr/ADR-010-Edge-Hardware-and-Provisioning.md`
- Read: `docs/tv-network/TV_NETWORK_ARCHITECTURE.md`
- Read: `docs/tv-network/EDGE_RUNTIME.md`
- Read: `docs/tv-network/PROVISIONING.md`
- Read: `docs/tv-network/DEVICE_REGISTRY.md`
- Read: `docs/tv-network/INSTALLATION.md`
- Read: `docs/tv-network/HEALTH_MONITORING.md`
- Read: `docs/tv-network/UPDATE_MANAGEMENT.md`
- Read: `docs/tv-network/ROLLBACK_POLICY.md`
- Read: `docs/tv-network/HEARTBEAT_PROTOCOL.md`
- Read: `docs/tv-network/TV_LIFECYCLE.md`
- Read: `docs/specification/TRACEABILITY.md`

- [ ] Record each source's status, authority, owner statements, and explicit open decisions in working notes before writing the derived documents.
- [ ] Do not treat a Proposed or Draft document as an accepted replacement for `ADR-002` or `PLATFORM_SPECIFICATION.md`.

### Task 2: Write the factual current-state inventory

**Files:**
- Create: `docs/specification/CURRENT_ARCHITECTURE.md`

- [ ] Describe the accepted authority and document statuses.
- [ ] Inventory current Bounded Contexts, Edge-related aggregates, responsibilities, commands, events, state machines, and operational flows using links to source documents.
- [ ] Separate normative behavior currently authorized from proposed behavior and from gaps already recorded by the audit.
- [ ] Record the current Mini PC premise from accepted `ADR-002` and explicitly label heterogeneous hardware as a proposal only.
- [ ] Record TV Network, Edge Runtime, Telemetry, Device Registry, Installation, Health, Update, Rollback, Player, and offline boundaries without resolving the ownership overlaps.
- [ ] Record evidence-backed contradictions and missing contracts as observations, not solutions.

### Task 3: Map the Edge platform gaps

**Files:**
- Create: `docs/specification/EDGE_PLATFORM_GAP_ANALYSIS.md`

- [ ] Use the current-state inventory as the baseline and the draft heterogeneous platform as the target candidate.
- [ ] For each gap identify source evidence, affected boundary, implementation/production impact, dependency, and whether closure requires a domain decision, architecture decision, technical specification, or operational policy.
- [ ] Include the explicit open decisions from the draft provisioning specification: installation transition, bootloader, Secure Boot, image signing, discovery, hardware catalog, minimum capability, Web engine, storage, rollback, recovery, and versioning.
- [ ] Do not assign an implementation value to any open item.
- [ ] Distinguish duplicated documentation from actual behavioral or ownership gaps.

### Task 4: Order the work without changing decisions

**Files:**
- Create: `docs/specification/EDGE_TECHNICAL_ROADMAP.md`

- [ ] Define gates and dependencies from audit to ADR review, normative synchronization, derived specifications, and implementation.
- [ ] Mark work that is allowed now (audit and analysis) versus work blocked by ADR-010 approval or unresolved source contracts.
- [ ] Ensure the roadmap does not authorize code or contracts while `PLATFORM_SPECIFICATION.md` remains Draft and ADR-010 remains Proposed.
- [ ] Include exit criteria for each phase based on existing authority, not inferred acceptance.

### Task 5: Validate the package

**Files:**
- Test: `tests/documentation/edge-architecture-audit-package.test.mjs`

- [ ] Add tests that the three documents exist, link to the authoritative sources, preserve the Mini PC current-state premise, identify ADR-010 as Proposed, identify the Platform Specification as Draft, and contain no language that promotes the proposal to accepted implementation authority.
- [ ] Run `npm run test:docs`.
- [ ] Run `npm run typecheck`.
- [ ] Run `git diff --check`.
- [ ] Review the diff for unreferenced facts, invented decisions, and links to files that do not exist.

### Task 6: Commit the audit package

**Files:**
- Commit only the plan, three audit documents, and their documentation test.

- [ ] Use a documentation-only commit message that states the package is an audit baseline and does not accept ADR-010.
- [ ] Do not modify `PLATFORM_SPECIFICATION.md`, `TRACEABILITY.md`, `ADR-002`, or `ADR-010` in this task.
