# Financial Normative Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize the approved Financial Platform founder decisions into every normative and derived architecture document, close the corresponding OPEN/SYNC items, and certify whether the synchronized domain is implementation-authorized.

**Architecture:** `PLATFORM_SPECIFICATION.md` remains the primary authority. Specialized Financial documents define accounting behavior and public domain contracts; aggregate, execution, governance, traceability, and decision documents derive from those authorities without creating alternate names or owners. The approved model uses `Payment` for payment lifecycle, `PaymentLedger` for recognized monetary facts, `CampaignBudget` for campaign funds, `PartnerLedger` for partner entries and partner recovery, and dedicated Commands for advertiser and integrated-third-party recovery within `PaymentLedger`.

**Tech Stack:** Markdown normative specifications, Git, ripgrep-based consistency checks.

---

### Task 1: Freeze the approved financial decisions

**Files:**
- Create: `docs/financial/FINANCIAL_DECISION_REGISTER.md`

- [ ] **Step 1:** Record the approved Option B decisions and the four mandatory corrections as an immutable decision register.
- [ ] **Step 2:** Define BRL `DECIMAL(18,4)`, Half-Even individual quantization, Hamilton-Hare split allocation, double-entry transactions, chart of accounts, recognition moments, recovery routing, Insurance Fund behavior, and fiscal policy failure semantics.
- [ ] **Step 3:** Prohibit alternate owners, implicit fallbacks, accounting effects at `PaymentReceived`, and direct responsibility judgments by Financial.
- [ ] **Step 4:** Run `rg -n "ou ACT_|/ CampaignBudget|FAILED_TAX_POLICY_MISSING|PaymentReceived.*DR|PaymentReceived.*lançamento" docs/financial/FINANCIAL_DECISION_REGISTER.md`.
- [ ] **Step 5:** Run `git diff --check`.

### Task 2: Synchronize the primary Specification and financial specializations

**Files:**
- Modify: `docs/specification/PLATFORM_SPECIFICATION.md`
- Modify: `docs/financial/FINANCIAL_ARCHITECTURE.md`
- Modify: `docs/financial/FINANCIAL_INVARIANTS.md`
- Modify: `docs/financial/LEDGER.md`
- Modify: `docs/financial/PAYMENT_FLOW.md`
- Modify: `docs/financial/PAYMENT_POLICY.md`
- Modify: `docs/financial/CAMPAIGN_BUDGET.md`
- Modify: `docs/financial/PARTNER_WALLET.md`
- Modify: `docs/financial/WITHDRAWAL_POLICY.md`

- [ ] **Step 1:** Close OPEN-006/009/016/017/018/019/020/025 only for the behavior explicitly approved.
- [ ] **Step 2:** Preserve the payment chain `PaymentReceived → PaymentCompensated → PaymentLedgerEntryPosted → CampaignBudgetIncreased`.
- [ ] **Step 3:** Specify append-only double-entry postings, recovery routing, Insurance Fund serialization, fiscal blocking, and late Evidence handling.
- [ ] **Step 4:** Ensure Campaign uses `PAUSED` plus `BUDGET_DEPLETED`, never a new state.
- [ ] **Step 5:** Run targeted searches for stale OPEN references and prohibited behavior.
- [ ] **Step 6:** Run `git diff --check`.

### Task 3: Synchronize aggregate and execution contracts

**Files:**
- Modify: `docs/domain/AGGREGATES.md`
- Modify: `docs/domain/DOMAIN_EVENTS.md`
- Modify: `docs/domain/DOMAIN_DICTIONARY.md`
- Modify: `docs/domain/OWNERSHIP.md`
- Modify: `docs/execution/COMMANDS.md`
- Modify: `docs/execution/EVENTS.md`
- Modify: `docs/execution/SAGAS.md`
- Modify: `docs/execution/STATE_MACHINES.md`
- Modify: `docs/execution/TIMELINES.md`
- Modify: `docs/financial/FINANCIAL_COMMANDS.md`
- Modify: `docs/financial/FINANCIAL_EVENTS.md`

- [ ] **Step 1:** Add `Payment` explicitly to the Financial aggregate catalog.
- [ ] **Step 2:** Define one owner and one producer for each new or specialized recovery, tax-payment, reconciliation, payout-hold, and refund contract.
- [ ] **Step 3:** Preserve existing canonical Events where they already express the approved fact (`FinancialPolicyChanged`, `WithdrawalFailed`, `FinancialReconciliationCompleted`).
- [ ] **Step 4:** Define `WithdrawalFailed(reason=MISSING_TAX_POLICY, disposition=RETRYABLE)` without creating a new state.
- [ ] **Step 5:** Update Sagas and timelines for payment, Settlement materialization, Evidence reversal, Governance decision, recovery, and fiscal payout.
- [ ] **Step 6:** Run owner/producer uniqueness searches and `git diff --check`.

### Task 4: Synchronize Governance identity and cross-context consequences

**Files:**
- Modify: `docs/governance/GOVERNANCE_DISPUTE_MANAGEMENT.md`
- Modify: `docs/governance/GOVERNANCE_EVENTS.md`
- Modify: `docs/governance/GOVERNANCE_INVARIANTS.md`
- Modify: `docs/domain/VALUE_OBJECTS.md`

- [ ] **Step 1:** Add the conditional `responsibleSubjectId` contract to `ResponsibilityDecisionPublished`.
- [ ] **Step 2:** Preserve the five-value `ResponsibleParty` taxonomy and prohibit subject IDs for `MOSTARDA` and `NONE`.
- [ ] **Step 3:** State that Governance authorizes but never executes financial effects.
- [ ] **Step 4:** Run taxonomy, nullability, and payload consistency searches.

### Task 5: Update governance, traceability, and closure status

**Files:**
- Modify: `docs/specification/DECISION_REGISTRY.md`
- Modify: `docs/specification/TRACEABILITY.md`
- Modify: `docs/specification/CONSISTENCY_RULES.md` only if precedence needs an explicit new reference
- Create: `docs/specification/FINANCIAL_NORMATIVE_SYNCHRONIZATION_AUDIT_V1.md`

- [ ] **Step 1:** Register the financial decisions, supersessions, canonical contract names, and closed OPENs.
- [ ] **Step 2:** Trace every approved decision to Specification, specialized documents, Aggregate, Command, Event, Saga, State Machine, and invariant.
- [ ] **Step 3:** Audit ownership, producer uniqueness, lifecycle, accounting conservation, eventual consistency, replay, idempotency, and cross-context authority.
- [ ] **Step 4:** Classify any residual issue using Domain/Architecture/Production/Documentation gates.
- [ ] **Step 5:** State implementation authorization only when supported by the audit evidence.

### Task 6: Verify, commit, and integrate

**Files:**
- Verify all modified documentation.

- [ ] **Step 1:** Run `git diff --check`.
- [ ] **Step 2:** Run global searches for stale owner ambiguity, prohibited Events/states, closed OPEN references, duplicate producers, and unresolved aliases.
- [ ] **Step 3:** Review `git diff --stat` and `git diff` against this plan.
- [ ] **Step 4:** Commit the synchronization on `agent/domain-freeze-review`.
- [ ] **Step 5:** Merge the certified branch into `main` as explicitly authorized by the user.
- [ ] **Step 6:** Repeat verification on `main` and report the resulting commit.
