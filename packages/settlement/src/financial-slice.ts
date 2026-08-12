import {
  calculateSplit,
  SPLIT_POLICY_VERSION,
  type SplitPolicyInput,
} from "./index.ts";

// This module is deliberately an in-memory walking skeleton. SettlementMemoryStore,
// destination account IDs, and the emitted ledger records are adapters/representations
// for this slice; they are not the production PartnerLedger implementation.

export type EvidenceStatus = "VALID" | "INVALID";
export type EvidenceAnchorStatus = "CONFIRMED" | "PENDING" | "MISSING";

export interface SettlementEvidence {
  readonly evidenceId: string;
  readonly campaignId: string;
  readonly status: EvidenceStatus;
  readonly anchorStatus: EvidenceAnchorStatus;
  readonly reverted: boolean;
}

export interface SettlementInput extends SplitPolicyInput {
  readonly campaignId: string;
  readonly grossAmount: string;
  readonly evidence: SettlementEvidence;
  readonly destinations: {
    readonly tvOwnerId: string;
    readonly spaceOwnerId: string;
    readonly sellerId: string;
    readonly sellerAcquisitionFundId: string;
    readonly influencerId: string;
    readonly influencerAcquisitionFundId: string;
    readonly mostardaId: string;
  };
}

export interface SettlementCycle {
  readonly settlementCycleId: string;
  readonly campaignId: string;
  readonly evidenceId: string;
  readonly grossAmount: string;
  readonly splitPolicyVersion: typeof SPLIT_POLICY_VERSION;
  readonly status: "CLOSED";
}

export type FinancialRightLine =
  | "TV_OWNER"
  | "SPACE_OWNER"
  | "SELLER"
  | "SELLER_ACQUISITION_FUND"
  | "INFLUENCER"
  | "INFLUENCER_ACQUISITION_FUND"
  | "MOSTARDA";

export interface FinancialRight {
  readonly financialRightId: string;
  readonly splitShareId: string;
  readonly line: FinancialRightLine;
  readonly destinationId: string;
  readonly amount: string;
  readonly evidenceId: string;
  readonly settlementCycleId: string;
  readonly splitPolicyVersion: typeof SPLIT_POLICY_VERSION;
  readonly status: "READY";
}

export interface JournalLine {
  readonly journalLineId: string;
  readonly accountId: string;
  readonly direction: "DEBIT" | "CREDIT";
  readonly amount: string;
  readonly financialRightId?: string;
}

export interface JournalTransaction {
  readonly transactionId: string;
  readonly settlementCycleId: string;
  readonly evidenceId: string;
  readonly lines: readonly JournalLine[];
  readonly debitTotal: string;
  readonly creditTotal: string;
}

export interface LedgerEntry {
  readonly ledgerEntryId: string;
  readonly financialRightId: string;
  readonly splitShareId: string;
  readonly evidenceId: string;
  readonly settlementCycleId: string;
  readonly destinationId: string;
  readonly amount: string;
  readonly journalTransactionId: string;
  readonly status: "PENDING";
}

export interface SettlementResult {
  readonly settlementCycle: SettlementCycle;
  readonly rights: readonly FinancialRight[];
  readonly journalTransaction: JournalTransaction;
  readonly ledgerEntries: readonly LedgerEntry[];
}

export class SettlementEligibilityError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SettlementEligibilityError";
  }
}

export class SettlementMemoryStore {
  private readonly cycleByEvidence = new Map<string, SettlementResult>();
  private readonly ledgerByRight = new Map<string, LedgerEntry>();

  public findByEvidence(campaignId: string, evidenceId: string): SettlementResult | undefined {
    return this.cycleByEvidence.get(`${campaignId}:${evidenceId}`);
  }

  public save(result: SettlementResult): void {
    const key = `${result.settlementCycle.campaignId}:${result.settlementCycle.evidenceId}`;
    const existing = this.cycleByEvidence.get(key);
    if (existing) {
      if (existing.settlementCycle.grossAmount !== result.settlementCycle.grossAmount) {
        throw new Error("Settlement cycle conflict: same EvidenceId has divergent gross amount.");
      }
      return;
    }
    this.cycleByEvidence.set(key, result);
    for (const entry of result.ledgerEntries) this.ledgerByRight.set(entry.splitShareId, entry);
  }

  public creditRight(splitShareId: string): LedgerEntry {
    const existing = this.ledgerByRight.get(splitShareId);
    if (!existing) throw new Error(`Unknown SplitShareId: ${splitShareId}`);
    return existing;
  }

  public editLedgerEntry(_ledgerEntryId: string, _amount: string): never {
    throw new Error("PartnerLedger is append-only; historical entries cannot be edited.");
  }

  public cycles(): readonly SettlementResult[] { return [...this.cycleByEvidence.values()]; }
  public rights(): readonly FinancialRight[] { return this.cycles().flatMap((result) => result.rights); }
  public ledgerEntries(): readonly LedgerEntry[] { return [...this.ledgerByRight.values()]; }
}

type AllocationAmountKey = Exclude<keyof ReturnType<typeof calculateSplit>, "policyVersion">;

export interface LargestRemainderTarget {
  /** Canonical beneficiary/right identity used for deterministic tie-breaking. */
  readonly key: string;
  readonly basisPoints: number;
}

export interface LargestRemainderAllocation {
  readonly key: string;
  readonly amount: string;
}

const LINES: readonly (readonly [FinancialRightLine, keyof SettlementInput["destinations"], AllocationAmountKey])[] = [
  ["TV_OWNER", "tvOwnerId", "tvOwnerBps"],
  ["SPACE_OWNER", "spaceOwnerId", "spaceOwnerBps"],
  ["SELLER", "sellerId", "sellerBps"],
  ["SELLER_ACQUISITION_FUND", "sellerAcquisitionFundId", "sellerAcquisitionFundBps"],
  ["INFLUENCER", "influencerId", "influencerBps"],
  ["INFLUENCER_ACQUISITION_FUND", "influencerAcquisitionFundId", "influencerAcquisitionFundBps"],
  ["MOSTARDA", "mostardaId", "mostardaBps"],
];

export function settleEvidence(input: SettlementInput, store: SettlementMemoryStore): SettlementResult {
  validateEvidence(input);
  const grossUnits = parseMoney(input.grossAmount);
  const existing = store.findByEvidence(input.campaignId, input.evidence.evidenceId);
  if (existing) {
    if (existing.settlementCycle.grossAmount !== formatMoney(grossUnits)) {
      throw new Error("Settlement cycle conflict: same EvidenceId has divergent gross amount.");
    }
    return existing;
  }

  const allocation = calculateSplit(input);
  const cycleId = `settlement:${input.campaignId}:${input.evidence.evidenceId}:${SPLIT_POLICY_VERSION}`;
  const cycle: SettlementCycle = Object.freeze({
    settlementCycleId: cycleId,
    campaignId: input.campaignId,
    evidenceId: input.evidence.evidenceId,
    grossAmount: formatMoney(grossUnits),
    splitPolicyVersion: SPLIT_POLICY_VERSION,
    status: "CLOSED",
  });

  const amounts = allocateMoney(grossUnits, LINES.map(([line, , bpsKey]) => ({
    key: line,
    basisPoints: allocation[bpsKey],
  })));
  const rights = LINES.map(([line, destinationKey], index) => {
    const splitShareId = `${cycleId}:${line}`;
    return Object.freeze({
      financialRightId: `right:${splitShareId}`,
      splitShareId,
      line,
      destinationId: input.destinations[destinationKey],
      amount: formatMoney(amounts[index]!),
      evidenceId: input.evidence.evidenceId,
      settlementCycleId: cycleId,
      splitPolicyVersion: SPLIT_POLICY_VERSION,
      status: "READY" as const,
    });
  });
  const credits = rights.map((right, index) => Object.freeze({
    journalLineId: `journal-line:${cycleId}:credit:${index}`,
    accountId: right.destinationId,
    direction: "CREDIT" as const,
    amount: right.amount,
    financialRightId: right.financialRightId,
  }));
  const journal = Object.freeze({
    transactionId: `journal:${cycleId}`,
    settlementCycleId: cycleId,
    evidenceId: input.evidence.evidenceId,
    lines: Object.freeze([
      { journalLineId: `journal-line:${cycleId}:debit`, accountId: `CAMPAIGN:${input.campaignId}`, direction: "DEBIT" as const, amount: formatMoney(grossUnits) },
      ...credits,
    ]),
    debitTotal: formatMoney(grossUnits),
    creditTotal: formatMoney(credits.reduce((sum, line) => sum + parseMoney(line.amount), 0n)),
  });
  if (journal.debitTotal !== journal.creditTotal) throw new Error("JournalTransaction is not balanced.");
  const ledgerEntries = rights.map((right) => Object.freeze({
    ledgerEntryId: `ledger:${right.splitShareId}`,
    financialRightId: right.financialRightId,
    splitShareId: right.splitShareId,
    evidenceId: right.evidenceId,
    settlementCycleId: right.settlementCycleId,
    destinationId: right.destinationId,
    amount: right.amount,
    journalTransactionId: journal.transactionId,
    status: "PENDING" as const,
  }));
  const result = Object.freeze({ settlementCycle: cycle, rights: Object.freeze(rights), journalTransaction: journal, ledgerEntries: Object.freeze(ledgerEntries) });
  store.save(result);
  return result;
}

function validateEvidence(input: SettlementInput): void {
  if (input.evidence.campaignId !== input.campaignId) throw new SettlementEligibilityError("Evidence campaign does not match Settlement campaign.");
  if (input.evidence.status !== "VALID") throw new SettlementEligibilityError("Evidence must be VALID before Settlement.");
  if (input.evidence.anchorStatus !== "CONFIRMED") throw new SettlementEligibilityError("Evidence must be anchored before Settlement.");
  if (input.evidence.reverted) throw new SettlementEligibilityError("Reverted Evidence cannot create financial rights.");
}

function parseMoney(value: string): bigint {
  if (!/^\d+(?:\.\d{1,4})?$/.test(value)) throw new TypeError("Gross settlement amount must use BRL with four decimal places.");
  const [whole, fractional = ""] = value.split(".");
  return BigInt(whole!) * 10_000n + BigInt(fractional.padEnd(4, "0"));
}

function formatMoney(units: bigint): string {
  return `${units / 10_000n}.${(units % 10_000n).toString().padStart(4, "0")}`;
}

/**
 * Allocates a gross BRL amount with Hamilton-Hare largest remainders.
 * Equal remainders are ordered by the canonical target key, never by input position.
 */
export function allocateGrossByLargestRemainder(
  grossAmount: string,
  targets: readonly LargestRemainderTarget[],
): readonly LargestRemainderAllocation[] {
  const amounts = allocateMoney(parseMoney(grossAmount), targets);
  return Object.freeze(targets.map((target, index) => Object.freeze({
    key: target.key,
    amount: formatMoney(amounts[index]!),
  })));
}

function allocateMoney(grossUnits: bigint, targets: readonly LargestRemainderTarget[]): bigint[] {
  if (targets.length === 0) throw new Error("At least one allocation target is required.");
  const seenKeys = new Set<string>();
  for (const target of targets) {
    if (target.key.length === 0 || seenKeys.has(target.key)) {
      throw new Error("Allocation target keys must be non-empty and unique.");
    }
    if (!Number.isInteger(target.basisPoints) || target.basisPoints < 0) {
      throw new Error("Allocation target basis points must be non-negative integers.");
    }
    seenKeys.add(target.key);
  }
  const denominator = 10_000n;
  const portions = targets.map((target, index) => {
    const numerator = grossUnits * BigInt(target.basisPoints);
    return { index, key: target.key, base: numerator / denominator, remainder: numerator % denominator };
  });
  const allocated = portions.reduce((sum, portion) => sum + portion.base, 0n);
  const remaining = grossUnits - allocated;
  const ordered = [...portions].sort((left, right) =>
    right.remainder === left.remainder
      ? left.key < right.key ? -1 : left.key > right.key ? 1 : 0
      : right.remainder > left.remainder ? 1 : -1,
  );
  const amounts = portions.map((portion) => portion.base);
  for (let index = 0n; index < remaining; index += 1n) {
    const position = ordered[Number(index % BigInt(ordered.length))]!.index;
    amounts[position] = amounts[position]! + 1n;
  }
  return amounts;
}
