declare const confidenceBrand: unique symbol;

export const RESPONSIBLE_PARTIES = Object.freeze([
  "ADVERTISER",
  "EDGE_PARTNER",
  "MOSTARDA",
  "INTEGRATED_THIRD_PARTY",
  "NONE",
] as const);

export type ResponsibleParty = (typeof RESPONSIBLE_PARTIES)[number];

export const RESPONSIBILITY_CATEGORIES = Object.freeze([
  "PLATFORM_BUG",
  "OPERATIONAL_FAILURE",
  "PARTNER_FAILURE",
  "THIRD_PARTY_FAILURE",
  "USER_MISUSE",
  "FORCE_MAJEURE",
] as const);

export type ResponsibilityCategory =
  (typeof RESPONSIBILITY_CATEGORIES)[number];

export const SEVERITIES = Object.freeze([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const);

export type Severity = (typeof SEVERITIES)[number];
export type Confidence = string & {
  readonly [confidenceBrand]: "Confidence";
};

export function isResponsibleParty(value: string): value is ResponsibleParty {
  return (RESPONSIBLE_PARTIES as readonly string[]).includes(value);
}

export function isResponsibilityCategory(
  value: string,
): value is ResponsibilityCategory {
  return (RESPONSIBILITY_CATEGORIES as readonly string[]).includes(value);
}

export function isSeverity(value: string): value is Severity {
  return (SEVERITIES as readonly string[]).includes(value);
}

export function createConfidence(value: string): Confidence {
  if (!/^(?:0\.\d+|1\.0+)$/.test(value)) {
    throw new TypeError(
      "Confidence must be a decimal representation between 0.00 and 1.00.",
    );
  }

  return value as Confidence;
}
