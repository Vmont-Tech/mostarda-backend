import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateSplit,
  SPLIT_POLICY_VERSION,
  type SplitPolicyInput,
} from "../../packages/settlement/src/index.ts";

const allSeller = {
  acquisition: true,
  activationPayment: true,
  renewal: true,
  volume: true,
} as const;

const allInfluencer = {
  entry: true,
  activation: true,
  performanceEngagement: true,
  recurrenceResult: true,
} as const;

const noVariableComponents: SplitPolicyInput = {
  seller: {
    acquisition: false,
    activationPayment: false,
    renewal: false,
    volume: false,
  },
  influencer: {
    entry: false,
    activation: false,
    performanceEngagement: false,
    recurrenceResult: false,
  },
};

test("no earned component credits both acquisition funds and keeps Mostarda at 30%", () => {
  const result = calculateSplit(noVariableComponents);

  assert.deepEqual(result, {
    policyVersion: SPLIT_POLICY_VERSION,
    tvOwnerBps: 2_000,
    spaceOwnerBps: 2_000,
    sellerBps: 0,
    sellerAcquisitionFundBps: 2_000,
    influencerBps: 0,
    influencerAcquisitionFundBps: 1_000,
    mostardaBps: 3_000,
    totalBps: 10_000,
  });
});

test("earned components reduce only their corresponding acquisition fund", () => {
  const result = calculateSplit({
    seller: {
      acquisition: true,
      activationPayment: true,
      renewal: false,
      volume: false,
    },
    influencer: {
      entry: true,
      activation: false,
      performanceEngagement: false,
      recurrenceResult: true,
    },
  });

  assert.equal(result.sellerBps, 1_000);
  assert.equal(result.sellerAcquisitionFundBps, 1_000);
  assert.equal(result.influencerBps, 600);
  assert.equal(result.influencerAcquisitionFundBps, 400);
  assert.equal(result.mostardaBps, 3_000);
  assert.equal(result.totalBps, 10_000);
});

test("the definitive partial example allocates 10% Seller and 4% Influencer", () => {
  const result = calculateSplit({
    seller: {
      acquisition: true,
      activationPayment: true,
      renewal: false,
      volume: false,
    },
    influencer: {
      entry: false,
      activation: true,
      performanceEngagement: true,
      recurrenceResult: false,
    },
  });

  assert.equal(result.sellerBps, 1_000);
  assert.equal(result.sellerAcquisitionFundBps, 1_000);
  assert.equal(result.influencerBps, 400);
  assert.equal(result.influencerAcquisitionFundBps, 600);
  assert.equal(result.mostardaBps, 3_000);
  assert.equal(result.totalBps, 10_000);
});

test("all earned components reach the seller and influencer ceilings", () => {
  const result = calculateSplit({ seller: allSeller, influencer: allInfluencer });

  assert.equal(result.sellerBps, 2_000);
  assert.equal(result.sellerAcquisitionFundBps, 0);
  assert.equal(result.influencerBps, 1_000);
  assert.equal(result.influencerAcquisitionFundBps, 0);
  assert.equal(result.mostardaBps, 3_000);
  assert.equal(result.totalBps, 10_000);
});

test("each unearned seller component goes only to Seller Acquisition Fund", () => {
  const components = [
    "acquisition",
    "activationPayment",
    "renewal",
    "volume",
  ] as const;

  for (const missing of components) {
    const seller = { ...allSeller, [missing]: false };
    const result = calculateSplit({ seller, influencer: allInfluencer });
    assert.equal(result.sellerBps, 1_500);
    assert.equal(result.sellerAcquisitionFundBps, 500);
    assert.equal(result.influencerAcquisitionFundBps, 0);
  }
});

test("each unearned influencer component goes only to Influencer Acquisition Fund", () => {
  const components = [
    ["entry", 300],
    ["activation", 200],
    ["performanceEngagement", 200],
    ["recurrenceResult", 300],
  ] as const;

  for (const [missing, amount] of components) {
    const influencer = { ...allInfluencer, [missing]: false };
    const result = calculateSplit({ seller: allSeller, influencer });
    assert.equal(result.sellerAcquisitionFundBps, 0);
    assert.equal(result.influencerBps, 1_000 - amount);
    assert.equal(result.influencerAcquisitionFundBps, amount);
  }
});

test("the policy never changes fixed owners or Mostarda", () => {
  for (let mask = 0; mask < 256; mask += 1) {
    const result = calculateSplit({
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

    assert.equal(result.tvOwnerBps, 2_000);
    assert.equal(result.spaceOwnerBps, 2_000);
    assert.ok(result.sellerBps >= 0 && result.sellerBps <= 2_000);
    assert.ok(result.influencerBps >= 0 && result.influencerBps <= 1_000);
    assert.equal(result.mostardaBps, 3_000);
    assert.equal(result.totalBps, 10_000);
  }
});

test("fund allocation is stateless and has no cumulative balance cap", () => {
  for (let campaign = 0; campaign < 1_000; campaign += 1) {
    const result = calculateSplit(noVariableComponents);
    assert.equal(result.sellerAcquisitionFundBps, 2_000);
    assert.equal(result.influencerAcquisitionFundBps, 1_000);
  }
});

test("creative production context does not reduce commercial influencer allocation", () => {
  const withoutCreative = calculateSplit({
    ...noVariableComponents,
    creativeProduction: { applicable: false },
  });
  const withCreative = calculateSplit({
    ...noVariableComponents,
    creativeProduction: { applicable: true },
  });

  assert.deepEqual(withCreative, withoutCreative);
  assert.equal(withCreative.influencerBps, 0);
  assert.equal(withCreative.influencerAcquisitionFundBps, 1_000);
});
