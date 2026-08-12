import {
  SettlementMemoryStore,
  settleEvidence,
  type SettlementInput,
  type SettlementResult,
} from "./financial-slice.ts";

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
  input: SettlementInput,
  store: PersistentSettlementStore,
): Promise<SettlementResult> {
  const memory = new SettlementMemoryStore();
  const result = settleEvidence(input, memory);
  const existing = await store.findByEvidence(input.campaignId, input.evidence.evidenceId);
  if (existing !== undefined) {
    if (existing.settlementCycle.grossAmount !== result.settlementCycle.grossAmount) {
      throw new Error("Settlement cycle conflict: same EvidenceId has divergent gross amount.");
    }
    return existing;
  }
  return store.save(result);
}
