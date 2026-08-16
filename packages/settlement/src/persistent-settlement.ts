import {
  SettlementMemoryStore,
  SettlementEligibilityError,
  assertSettlementReplayEquivalent,
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
export { assertSettlementReplayEquivalent } from "./financial-slice.ts";

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
