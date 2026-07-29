import assert from "node:assert/strict";
import test from "node:test";

import {
  createConfidence,
  isResponsibleParty,
  RESPONSIBILITY_CATEGORIES,
  RESPONSIBLE_PARTIES,
  SEVERITIES,
} from "../../packages/governance/src/index.ts";

test("ResponsibleParty exposes only the five normative values", () => {
  assert.deepEqual(RESPONSIBLE_PARTIES, [
    "ADVERTISER",
    "EDGE_PARTNER",
    "MOSTARDA",
    "INTEGRATED_THIRD_PARTY",
    "NONE",
  ]);
  assert.equal(isResponsibleParty("UNKNOWN"), false);
});

test("ResponsibilityCategory excludes UNKNOWN", () => {
  assert.deepEqual(RESPONSIBILITY_CATEGORIES, [
    "PLATFORM_BUG",
    "OPERATIONAL_FAILURE",
    "PARTNER_FAILURE",
    "THIRD_PARTY_FAILURE",
    "USER_MISUSE",
    "FORCE_MAJEURE",
  ]);
  assert.equal(
    (RESPONSIBILITY_CATEGORIES as readonly string[]).includes("UNKNOWN"),
    false,
  );
});

test("Severity preserves cause-independent impact values", () => {
  assert.deepEqual(SEVERITIES, ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
});

test("Confidence preserves the exact decimal representation produced", () => {
  const confidence = createConfidence("0.997");

  assert.equal(confidence, "0.997");
  assert.equal(createConfidence("0.00"), "0.00");
  assert.equal(createConfidence("1.00"), "1.00");
});

test("Confidence rejects out-of-range, categorical and non-decimal values", () => {
  for (const invalid of ["-0.01", "1.01", "HIGH", "0", "1", ".50", " 0.50"]) {
    assert.throws(() => createConfidence(invalid), /decimal.*0\.00.*1\.00/i);
  }
});
