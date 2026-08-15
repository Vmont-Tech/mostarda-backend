import assert from "node:assert/strict";
import test from "node:test";

import {
  SettlementEligibilityError,
  type SettlementResult,
} from "../../packages/settlement/src/financial-slice.ts";
import {
  settleEvidencePersisted,
  assertSettlementReplayEquivalent,
  type PersistentSettlementInput,
  type PersistentSettlementStore,
} from "../../packages/settlement/src/persistent-settlement.ts";

const input = (): PersistentSettlementInput => ({
  campaignId: "C001",
  grossAmount: "100.0000",
  evidence: {
    evidenceId: "E001",
    campaignId: "C001",
    status: "VALID",
    anchorStatus: "CONFIRMED",
    reverted: false,
    disputed: false,
  },
  seller: {
    acquisition: true,
    activationPayment: false,
    renewal: false,
    volume: false,
  },
  influencer: {
    entry: true,
    activation: false,
    performanceEngagement: false,
    recurrenceResult: false,
  },
  destinations: {
    tvOwnerId: "TV_OWNER_001",
    spaceOwnerId: "SPACE_OWNER_001",
    sellerId: "SELLER_001",
    sellerAcquisitionFundId: "SELLER_ACQUISITION_FUND",
    influencerId: "INFLUENCER_001",
    influencerAcquisitionFundId: "INFLUENCER_ACQUISITION_FUND",
    mostardaId: "MOSTARDA",
  },
});

class MemoryPersistentStore implements PersistentSettlementStore {
  #result: SettlementResult | undefined;

  public async findByEvidence(
    campaignId: string,
    evidenceId: string,
  ): Promise<SettlementResult | undefined> {
    return this.#result?.settlementCycle.campaignId === campaignId &&
      this.#result.settlementCycle.evidenceId === evidenceId
      ? this.#result
      : undefined;
  }

  public async save(
    result: SettlementResult,
  ): Promise<SettlementResult> {
    if (this.#result !== undefined) {
      assertSettlementReplayEquivalent(this.#result, result);
      return this.#result;
    }
    this.#result = result;
    return result;
  }
}

test("materializes a valid Evidence result through a persistent store port", async () => {
  const result = await settleEvidencePersisted(input(), new MemoryPersistentStore());

  assert.equal(result.splitShares.length, 7);
  assert.equal(result.rights.length, 7);
  assert.equal(result.rights.find((right) => right.line === "MOSTARDA")?.amount, "30.0000");
  assert.equal(result.journalTransaction.debitTotal, "100.0000");
  assert.equal(result.journalTransaction.creditTotal, "100.0000");
  assert.equal(result.ledgerEntries.length, 7);
});

test("replaying the same Evidence returns the persisted result without a second materialization", async () => {
  const store = new MemoryPersistentStore();
  const first = await settleEvidencePersisted(input(), store);
  const replay = await settleEvidencePersisted(input(), store);

  assert.strictEqual(replay, first);
  assert.equal(replay.splitShares.length, 7);
  assert.equal(replay.ledgerEntries.length, 7);
});

test("invalid Evidence is rejected before the persistence port is called", async () => {
  let saveCalls = 0;
  const store: PersistentSettlementStore = {
    findByEvidence: async () => undefined,
    save: async (result) => {
      saveCalls += 1;
      return result;
    },
  };

  await assert.rejects(
    () => settleEvidencePersisted({ ...input(), evidence: { ...input().evidence, status: "INVALID" } }, store),
    (error: unknown) => error instanceof SettlementEligibilityError,
  );
  assert.equal(saveCalls, 0);
});

test("disputed Evidence is rejected before any financial materialization", async () => {
  let saveCalls = 0;
  const store: PersistentSettlementStore = {
    findByEvidence: async () => undefined,
    save: async (result) => { saveCalls += 1; return result; },
  };

  await assert.rejects(
    () => settleEvidencePersisted({ ...input(), evidence: { ...input().evidence, disputed: true } }, store),
    (error: unknown) => error instanceof SettlementEligibilityError,
  );
  assert.equal(saveCalls, 0);
});

test("persistent Settlement rejects reverted or unanchored Evidence at its boundary", async () => {
  for (const evidence of [
    { ...input().evidence, reverted: true },
    { ...input().evidence, anchorStatus: "PENDING" as const },
  ]) {
    await assert.rejects(
      () => settleEvidencePersisted({ ...input(), evidence }, {
        findByEvidence: async () => undefined,
        save: async (result) => result,
      }),
      (error: unknown) => error instanceof SettlementEligibilityError,
    );
  }
});
