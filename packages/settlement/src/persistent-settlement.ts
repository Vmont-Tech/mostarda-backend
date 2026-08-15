import {
  SettlementMemoryStore,
  SettlementEligibilityError,
  settleEvidence,
  type SettlementEvidence,
  type SettlementInput,
  type SettlementResult,
} from "./financial-slice.ts";

/**
 * Persistent Settlement accepts the Evidence boundary's dispute assertion.
 * The Evidence bounded context remains the source of truth; this adapter does
 * not create a second Evidence state machine.
 */
export type PersistentSettlementInput = Omit<SettlementInput, "evidence"> & {
  /** `true` is the Evidence owner's DISPUTED assertion at this boundary. */
  readonly evidence: SettlementEvidence & { readonly disputed: boolean };
};

/** Persistence port owned by the Settlement materialization boundary. */
export interface PersistentSettlementStore {
  findByEvidence(campaignId: string, evidenceId: string): Promise<SettlementResult | undefined>;
  save(result: SettlementResult): Promise<SettlementResult>;
}

export type { SettlementResult } from "./financial-slice.ts";

/**
 * Executes the deterministic Settlement slice through a persistence port.
 * The in-memory adapter remains available for fast unit tests; PostgreSQL is
 * supplied by a separate adapter and does not change SplitPolicy semantics.
 */
export async function settleEvidencePersisted(
  input: PersistentSettlementInput,
  store: PersistentSettlementStore,
): Promise<SettlementResult> {
  if (input.evidence.disputed) {
    throw new SettlementEligibilityError("Disputed Evidence cannot create financial rights.");
  }
  const memory = new SettlementMemoryStore();
  const result = settleEvidence(input, memory);
  const existing = await store.findByEvidence(input.campaignId, input.evidence.evidenceId);
  if (existing !== undefined) {
    assertSettlementReplayEquivalent(existing, result);
    return existing;
  }
  return store.save(result);
}

export function assertSettlementReplayEquivalent(
  existing: SettlementResult,
  candidate: SettlementResult,
): void {
  compareField("grossAmount", existing.settlementCycle.grossAmount, candidate.settlementCycle.grossAmount);
  compareField("splitPolicyVersion", existing.settlementCycle.splitPolicyVersion, candidate.settlementCycle.splitPolicyVersion);
  compareField("settlementCycleId", existing.settlementCycle.settlementCycleId, candidate.settlementCycle.settlementCycleId);
  compareField("campaignId", existing.settlementCycle.campaignId, candidate.settlementCycle.campaignId);
  compareField("evidenceId", existing.settlementCycle.evidenceId, candidate.settlementCycle.evidenceId);
  compareField("status", existing.settlementCycle.status, candidate.settlementCycle.status);

  compareCollection("rights", existing.rights, candidate.rights, (right) => right.splitShareId, [
    "financialRightId", "splitShareId", "line", "destinationId", "amount",
    "evidenceId", "settlementCycleId", "splitPolicyVersion", "status",
  ]);
  compareField("journalTransactionId", existing.journalTransaction.transactionId, candidate.journalTransaction.transactionId);
  compareField("journalSettlementCycleId", existing.journalTransaction.settlementCycleId, candidate.journalTransaction.settlementCycleId);
  compareField("journalEvidenceId", existing.journalTransaction.evidenceId, candidate.journalTransaction.evidenceId);
  compareField("journalDebitTotal", existing.journalTransaction.debitTotal, candidate.journalTransaction.debitTotal);
  compareField("journalCreditTotal", existing.journalTransaction.creditTotal, candidate.journalTransaction.creditTotal);
  compareCollection("journalLines", existing.journalTransaction.lines, candidate.journalTransaction.lines, (line) => line.journalLineId, [
    "journalLineId", "accountId", "direction", "amount", "financialRightId",
  ]);
  for (let index = 0; index < existing.journalTransaction.lines.length; index += 1) {
    compareField(
      `journalLines[${index}].journalLineId`,
      existing.journalTransaction.lines[index]?.journalLineId,
      candidate.journalTransaction.lines[index]?.journalLineId,
    );
  }
  compareCollection("ledgerEntries", existing.ledgerEntries, candidate.ledgerEntries, (entry) => entry.splitShareId, [
    "ledgerEntryId", "financialRightId", "splitShareId", "evidenceId",
    "settlementCycleId", "destinationId", "amount", "journalTransactionId", "status",
  ]);
}

function compareCollection<T extends object>(
  name: string,
  existing: readonly T[],
  candidate: readonly T[],
  key: (value: T) => string,
  fields: readonly string[],
): void {
  if (existing.length !== candidate.length) {
    throw new Error(`Settlement replay conflict: divergent ${name} cardinality.`);
  }
  const existingByKey = new Map(existing.map((value) => [key(value), value]));
  const candidateByKey = new Map(candidate.map((value) => [key(value), value]));
  if (existingByKey.size !== existing.length || candidateByKey.size !== candidate.length) {
    throw new Error(`Settlement replay conflict: duplicate ${name} identity.`);
  }
  for (const value of candidate) {
    const previous = existingByKey.get(key(value));
    if (previous === undefined) {
      throw new Error(`Settlement replay conflict: divergent ${name} identity.`);
    }
    for (const field of fields) {
      compareField(
        `${name}.${field}`,
        (previous as Record<string, unknown>)[field],
        (value as Record<string, unknown>)[field],
      );
    }
  }
}

function compareField(name: string, existing: unknown, candidate: unknown): void {
  if (existing !== candidate) {
    throw new Error(`Settlement replay conflict: divergent ${name}.`);
  }
}
