import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const manifest = (source, name) => {
  const match = source.match(new RegExp(`^${name}: (\\[[^\\n]+\\])$`, "m"));
  assert.ok(match, `${name} must exist`);
  return JSON.parse(match[1]);
};

test("version recertification report records the exact post-C4 authorization boundary", () => {
  const gate = read("docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md");
  const report = read("docs/reports/TELEMETRY_VERSION_RECERTIFICATION_REPORT_V1.md");
  const ready = manifest(gate, "READY_MANIFEST");
  const partial = manifest(gate, "PARTIAL_MANIFEST");

  assert.match(report, /AUDITED_IMPLEMENTATION_HEAD: d5d2f295b07a275a6fb4a0597abadebdfc4283a9/);
  assert.match(report, /READY_COUNT: 10/);
  assert.match(report, /PARTIAL_COUNT: 23/);
  assert.match(report, /MATERIALIZED_READY_COUNT: 10/);
  assert.match(report, /ABSENT_PARTIAL_COUNT: 23/);

  for (const artifact of ready) {
    assert.match(report, new RegExp(`\\| \\\`${artifact}\\\` \\| MATERIALIZED \\|`));
  }
  for (const artifact of partial) {
    assert.match(report, new RegExp(`\\| \\\`${artifact}\\\` \\| ABSENT \\|`));
  }
});

test("report denies original Telemetry Task 4 without changing the certified gate", () => {
  const gate = read("docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md");
  const report = read("docs/reports/TELEMETRY_VERSION_RECERTIFICATION_REPORT_V1.md");

  assert.match(gate, /## Artifact: TelemetryBucket\s+Status: `IMPLEMENTATION_PARTIAL`/);
  assert.match(report, /TELEMETRY_BUCKET_STATUS: IMPLEMENTATION_PARTIAL/);
  assert.match(report, /ORIGINAL_TASK_4_ELIGIBILITY: DENIED/);
  assert.match(report, /NEXT_AUTHORIZED_BOUNDARY: NONE/);
  assert.match(report, /complete construction error contract/i);
  assert.match(report, /consumer-owned compatibility evaluation/i);
  assert.match(report, /No original Task 4 code was implemented/i);
});

test("report proves version constructors remain identity-only", () => {
  const versions = read("packages/telemetry/src/versions.ts");
  const report = read("docs/reports/TELEMETRY_VERSION_RECERTIFICATION_REPORT_V1.md");

  assert.doesNotMatch(versions, /Compatibility(Matrix|Decision|Evaluation|Result|Cause)/);
  assert.doesNotMatch(versions, /SUPPORTED|DEPRECATED|EXPERIMENTAL|UNSUPPORTED/);
  assert.match(report, /VERSION_CONSTRUCTOR_COMPATIBILITY_EVALUATION: ABSENT/);
  assert.match(report, /OPAQUE_TOKEN_V1/);
  assert.match(report, /INVALID_VERSION_IDENTITY_REPRESENTATION/);
});
