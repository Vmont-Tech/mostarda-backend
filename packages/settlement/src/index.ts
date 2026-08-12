export const SPLIT_POLICY_VERSION = "SPLIT-PERFORMANCE-RESIDUAL-V1" as const;

const TOTAL_BPS = 10_000;
const TV_OWNER_BPS = 2_000;
const SPACE_OWNER_BPS = 2_000;
const SELLER_MAX_BPS = 2_000;
const INFLUENCER_MAX_BPS = 1_000;
const MOSTARDA_MIN_BPS = 3_000;

export const SELLER_COMPONENTS = Object.freeze([
  Object.freeze({ id: "acquisition", bps: 500 }),
  Object.freeze({ id: "activationPayment", bps: 500 }),
  Object.freeze({ id: "renewal", bps: 500 }),
  Object.freeze({ id: "volume", bps: 500 }),
] as const);

export const INFLUENCER_COMPONENTS = Object.freeze([
  Object.freeze({ id: "entry", bps: 300 }),
  Object.freeze({ id: "activation", bps: 200 }),
  Object.freeze({ id: "performanceEngagement", bps: 200 }),
  Object.freeze({ id: "recurrenceResult", bps: 300 }),
] as const);

export interface SplitPolicyInput {
  readonly seller: {
    readonly acquisition: boolean;
    readonly activationPayment: boolean;
    readonly renewal: boolean;
    readonly volume: boolean;
  };
  readonly influencer: {
    readonly entry: boolean;
    readonly activation: boolean;
    readonly performanceEngagement: boolean;
    readonly recurrenceResult: boolean;
  };
}

export interface SplitAllocation {
  readonly policyVersion: typeof SPLIT_POLICY_VERSION;
  readonly tvOwnerBps: number;
  readonly spaceOwnerBps: number;
  readonly sellerBps: number;
  readonly sellerAcquisitionFundBps: number;
  readonly influencerBps: number;
  readonly influencerAcquisitionFundBps: number;
  readonly mostardaBps: number;
  readonly totalBps: number;
}

export function calculateSplit(input: SplitPolicyInput): SplitAllocation {
  validateInput(input);

  const sellerBps =
    (input.seller.acquisition ? 500 : 0) +
    (input.seller.activationPayment ? 500 : 0) +
    (input.seller.renewal ? 500 : 0) +
    (input.seller.volume ? 500 : 0);
  const influencerBps =
    (input.influencer.entry ? 300 : 0) +
    (input.influencer.activation ? 200 : 0) +
    (input.influencer.performanceEngagement ? 200 : 0) +
    (input.influencer.recurrenceResult ? 300 : 0);

  const allocation: SplitAllocation = Object.freeze({
    policyVersion: SPLIT_POLICY_VERSION,
    tvOwnerBps: TV_OWNER_BPS,
    spaceOwnerBps: SPACE_OWNER_BPS,
    sellerBps,
    sellerAcquisitionFundBps: SELLER_MAX_BPS - sellerBps,
    influencerBps,
    influencerAcquisitionFundBps: INFLUENCER_MAX_BPS - influencerBps,
    mostardaBps:
      TOTAL_BPS -
      TV_OWNER_BPS -
      SPACE_OWNER_BPS -
      SELLER_MAX_BPS -
      INFLUENCER_MAX_BPS,
    totalBps: TOTAL_BPS,
  });

  assertAllocation(allocation);
  return allocation;
}

function validateInput(input: SplitPolicyInput): void {
  if (input === null || typeof input !== "object") {
    throw new TypeError("SplitPolicy input must be an object.");
  }

  const seller = input.seller;
  const influencer = input.influencer;
  const sellerKeys = ["acquisition", "activationPayment", "renewal", "volume"] as const;
  const influencerKeys = ["entry", "activation", "performanceEngagement", "recurrenceResult"] as const;

  if (seller === null || typeof seller !== "object") {
    throw new TypeError("Seller component state is required.");
  }
  if (influencer === null || typeof influencer !== "object") {
    throw new TypeError("Influencer component state is required.");
  }

  for (const key of sellerKeys) {
    assertBoolean(`seller.${key}`, seller[key]);
  }
  for (const key of influencerKeys) {
    assertBoolean(`influencer.${key}`, influencer[key]);
  }
}

function assertBoolean(name: string, value: unknown): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(`${name} must be boolean.`);
  }
}

function assertAllocation(allocation: SplitAllocation): void {
  if (allocation.tvOwnerBps !== TV_OWNER_BPS) {
    throw new Error("TV Owner share must remain fixed at 20%.");
  }
  if (allocation.spaceOwnerBps !== SPACE_OWNER_BPS) {
    throw new Error("Space Owner share must remain fixed at 20%.");
  }
  if (allocation.sellerBps < 0 || allocation.sellerBps > SELLER_MAX_BPS) {
    throw new Error("Seller share exceeds its 20% ceiling.");
  }
  if (allocation.sellerBps + allocation.sellerAcquisitionFundBps !== SELLER_MAX_BPS) {
    throw new Error("Seller and Seller Acquisition Fund must total 20%.");
  }
  if (allocation.influencerBps < 0 || allocation.influencerBps > INFLUENCER_MAX_BPS) {
    throw new Error("Influencer share exceeds its 10% ceiling.");
  }
  if (
    allocation.influencerBps + allocation.influencerAcquisitionFundBps !==
    INFLUENCER_MAX_BPS
  ) {
    throw new Error("Influencer and Influencer Acquisition Fund must total 10%.");
  }
  if (allocation.mostardaBps < MOSTARDA_MIN_BPS) {
    throw new Error("Mostarda share cannot be below 30%.");
  }
  const total =
    allocation.tvOwnerBps +
    allocation.spaceOwnerBps +
    allocation.sellerBps +
    allocation.sellerAcquisitionFundBps +
    allocation.influencerBps +
    allocation.influencerAcquisitionFundBps +
    allocation.mostardaBps;
  if (total !== TOTAL_BPS || allocation.totalBps !== TOTAL_BPS) {
    throw new Error("Split allocation must total exactly 100%.");
  }
}
