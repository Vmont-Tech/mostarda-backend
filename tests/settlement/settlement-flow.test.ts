import test from "node:test";
import assert from "node:assert/strict";

import {
  allocateGrossByLargestRemainder,
  SettlementEligibilityError,
  SettlementMemoryStore,
  settleEvidence,
  type SettlementEvidence,
  type SettlementInput,
} from "../../packages/settlement/src/financial-slice.ts";

test("breaks equal Hamilton-Hare remainders by stable identity, not input order", () => {
  const targets = [
    { key: "RIGHT-B", basisPoints: 3333 },
    { key: "RIGHT-A", basisPoints: 3333 },
    { key: "RIGHT-C", basisPoints: 3334 },
  ];
  const forward = allocateGrossByLargestRemainder("1.0002", targets);
  const reversed = allocateGrossByLargestRemainder("1.0002", [...targets].reverse());
  const amountsByKey = (allocation: readonly { key: string; amount: string }[]) =>
    new Map(allocation.map(({ key, amount }) => [key, amount]));

  assert.deepEqual(amountsByKey(forward), amountsByKey(reversed));
  assert.deepEqual(amountsByKey(forward), new Map([
    ["RIGHT-A", "0.3334"],
    ["RIGHT-B", "0.3333"],
    ["RIGHT-C", "0.3335"],
  ]));
});

test("rejects a public allocation whose basis points do not cover exactly 100%", () => {
  const target = { key: "ONLY", basisPoints: 9_999 };
  assert.throws(
    () => allocateGrossByLargestRemainder("1.0000", [target]),
    /exactly 10000 basis points/,
  );
  assert.throws(
    () => allocateGrossByLargestRemainder("1.0000", [{ key: "ONLY", basisPoints: 10_001 }]),
    /exactly 10000 basis points/,
  );
  assert.throws(
    () => allocateGrossByLargestRemainder("1.0000", [{ key: "NEGATIVE", basisPoints: -1 }, { key: "REST", basisPoints: 10_001 }]),
    /non-negative integers/,
  );
});

const partialInput = (): SettlementInput => ({
  campaignId: "C001",
  grossAmount: "100.0000",
  evidence: {
    evidenceId: "E001",
    campaignId: "C001",
    status: "VALID",
    anchorStatus: "CONFIRMED",
    reverted: false,
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

const run = (overrides: Partial<SettlementInput> = {}) =>
  settleEvidence({ ...partialInput(), ...overrides }, new SettlementMemoryStore());

test("settles valid E001 into seven rights, a balanced journal, and ledger entries", () => {
  const result = run();

  assert.equal(result.settlementCycle.campaignId, "C001");
  assert.equal(result.settlementCycle.evidenceId, "E001");
  assert.equal(result.settlementCycle.grossAmount, "100.0000");
  assert.equal(result.rights.length, 7);
  assert.deepEqual(
    result.rights.map((right) => [right.line, right.amount]),
    [
      ["TV_OWNER", "20.0000"],
      ["SPACE_OWNER", "20.0000"],
      ["SELLER", "5.0000"],
      ["SELLER_ACQUISITION_FUND", "15.0000"],
      ["INFLUENCER", "3.0000"],
      ["INFLUENCER_ACQUISITION_FUND", "7.0000"],
      ["MOSTARDA", "30.0000"],
    ],
  );
  assert.equal(result.journalTransaction.debitTotal, "100.0000");
  assert.equal(result.journalTransaction.creditTotal, "100.0000");
  assert.equal(result.journalTransaction.lines.length, 8);
  assert.equal(result.ledgerEntries.length, 7);
});

test("rejects evidence that is invalid, unanchored, or reverted", () => {
  const cases: SettlementEvidence[] = [
    { ...partialInput().evidence, status: "INVALID" },
    { ...partialInput().evidence, anchorStatus: "PENDING" },
    { ...partialInput().evidence, reverted: true },
  ];

  for (const evidence of cases) {
    assert.throws(
      () => run({ evidence }),
      (error: unknown) => error instanceof SettlementEligibilityError,
    );
  }
});

test("rejects negative gross and preserves four decimal precision", () => {
  assert.throws(() => run({ grossAmount: "-0.0001" }), /Gross settlement amount/);
  assert.throws(() => run({ grossAmount: "100.00001" }), /four decimal places/);
  assert.throws(() => run({ grossAmount: "100000000000000.0000" }), /DECIMAL\(18,4\)/);
  assert.equal(run({ grossAmount: "99999999999999.9999" }).settlementCycle.grossAmount, "99999999999999.9999");
  assert.equal(run({ grossAmount: "100.1234" }).settlementCycle.grossAmount, "100.1234");
});

test("preserves evidence, cycle, policy version and component destinations on every right", () => {
  const result = run();

  for (const right of result.rights) {
    assert.equal(right.evidenceId, "E001");
    assert.equal(right.settlementCycleId, result.settlementCycle.settlementCycleId);
    assert.equal(right.splitPolicyVersion, "SPLIT-PERFORMANCE-RESIDUAL-V1");
    assert.ok(right.destinationId.length > 0);
  }
});

test("reprocessing an evidence and a split share is idempotent", () => {
  const store = new SettlementMemoryStore();
  const first = settleEvidence(partialInput(), store);
  const second = settleEvidence(partialInput(), store);

  assert.equal(second.settlementCycle.settlementCycleId, first.settlementCycle.settlementCycleId);
  assert.equal(store.cycles().length, 1);
  assert.equal(store.rights().length, 7);
  assert.equal(store.ledgerEntries().length, 7);

  const duplicateRight = store.creditRight(first.rights[0]!.splitShareId);
  assert.equal(duplicateRight.ledgerEntryId, first.ledgerEntries[0]!.ledgerEntryId);
  assert.equal(store.ledgerEntries().length, 7);
});

test("rejects a divergent reprocessing of the same Evidence identity", () => {
  const store = new SettlementMemoryStore();
  settleEvidence(partialInput(), store);
  assert.throws(
    () => settleEvidence({ ...partialInput(), grossAmount: "101.0000" }, store),
    /divergent gross amount/,
  );
});

test("allocates a fractional gross remainder by deterministic largest remainder order", () => {
  const result = run({ grossAmount: "100.0001" });
  const amount = (line: string) => result.rights.find((right) => right.line === line)!.amount;

  assert.equal(amount("TV_OWNER"), "20.0000");
  assert.equal(amount("SPACE_OWNER"), "20.0000");
  assert.equal(amount("SELLER"), "5.0000");
  assert.equal(amount("SELLER_ACQUISITION_FUND"), "15.0000");
  assert.equal(amount("INFLUENCER"), "3.0000");
  assert.equal(amount("INFLUENCER_ACQUISITION_FUND"), "7.0000");
  assert.equal(amount("MOSTARDA"), "30.0001");
  assert.equal(result.journalTransaction.debitTotal, "100.0001");
  assert.equal(result.journalTransaction.creditTotal, "100.0001");
});

test("journal is balanced and ledger remains append-only", () => {
  const store = new SettlementMemoryStore();
  const result = settleEvidence(partialInput(), store);
  const before = store.ledgerEntries();
  assert.equal(result.journalTransaction.debitTotal, result.journalTransaction.creditTotal);

  assert.throws(() => store.editLedgerEntry(before[0]!.ledgerEntryId, "1.0000"), /append-only/);
  assert.deepEqual(store.ledgerEntries(), before);
});

test("allocation invariants hold for every component combination", () => {
  for (let mask = 0; mask < 256; mask += 1) {
    const result = run({
      seller: {
        acquisition: (mask & 1) !== 0,
        activationPayment: (mask & 2) !== 0,
        renewal: (mask & 4) !== 0,
        volume: (mask & 8) !== 0,
      },
      influencer: {
        entry: (mask & 16) !== 0,
        activation: (mask & 32) !== 0,
        performanceEngagement: (mask & 64) !== 0,
        recurrenceResult: (mask & 128) !== 0,
      },
    });
    const amount = (line: string) => result.rights.find((right) => right.line === line)!.amount;
    assert.equal(amount("TV_OWNER"), "20.0000");
    assert.equal(amount("SPACE_OWNER"), "20.0000");
    assert.equal(addMoney(amount("SELLER"), amount("SELLER_ACQUISITION_FUND")), "20.0000");
    assert.equal(addMoney(amount("INFLUENCER"), amount("INFLUENCER_ACQUISITION_FUND")), "10.0000");
    assert.equal(amount("MOSTARDA"), "30.0000");
    assert.equal(result.journalTransaction.debitTotal, "100.0000");
  }
});

function addMoney(left: string, right: string): string {
  const units = (value: string) => BigInt(value.replace(".", ""));
  const total = units(left) + units(right);
  return `${total / 10_000n}.${(total % 10_000n).toString().padStart(4, "0")}`;
}
