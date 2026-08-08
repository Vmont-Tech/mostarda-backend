import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../../", import.meta.url);
const reviewPath = new URL(
  "../../docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V2.md",
  import.meta.url,
);
const reviewedHead = "40c23312a777e9cf48562bb8750042e9d922cb82";
const reviewedBase = "48f12fd1c2f3fc1578e3fd9dbe7d051490251476";

const ready = Object.freeze([
  "TelemetryBucketId",
  "AudienceProjectionId",
  "TelemetryEventId",
  "TelemetryCapabilityStatus",
  "TelemetrySchemaVersion",
  "CollectorVersion",
  "CapabilityVersion",
  "CollectionPolicyVersion",
  "AudienceProjectionVersion",
  "AudienceProjectionPolicyVersion",
]);

const partial = Object.freeze([
  "TelemetryBucket",
  "TelemetryBucketAccepted",
  "TelemetryBucketRejected",
  "AudienceProjection",
  "TelemetryCaptured",
  "TelemetryBucketClosed",
  "EdgeTelemetryCapabilityChanged",
  "EdgeTelemetryIncidentReported",
  "TelemetryValidationIncidentReported",
  "TelemetryCapabilityChanged",
  "TelemetryIncidentReported",
  "CapabilityDeclared",
  "CapabilityValidated",
  "CapabilityRejected",
  "CapabilityActivated",
  "CapabilityDegraded",
  "CapabilitySuspended",
  "CapabilityRecovered",
  "CapabilityRetired",
  "AudienceProjectionApplier",
  "AudienceProjectionProduced",
  "AudienceProjectionExpired",
  "AudienceProjectionInvalidated",
]);

const materialized = Object.freeze([
  "TelemetryBucketId",
  "AudienceProjectionId",
  "TelemetryEventId",
  "TelemetryCapabilityStatus",
]);

const authorizedNotMaterialized = Object.freeze([
  "TelemetrySchemaVersion",
  "CollectorVersion",
  "CapabilityVersion",
  "CollectionPolicyVersion",
  "AudienceProjectionVersion",
  "AudienceProjectionPolicyVersion",
]);

const gitShow = (path) =>
  execFileSync("git", ["show", `${reviewedHead}:${path}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

const section = (document, heading) => {
  const marker = `## ${heading}`;
  const start = document.indexOf(marker);
  assert.notEqual(start, -1, `missing section: ${heading}`);
  const end = document.indexOf("\n## ", start + marker.length);
  return document.slice(start, end === -1 ? document.length : end);
};

const lineContaining = (document, needle) => {
  const line = document.split(/\r?\n/).find((candidate) => candidate.includes(needle));
  assert.ok(line, `missing reviewed line containing: ${needle}`);
  return line;
};

const manifest = (gate, name) =>
  JSON.parse(gate.match(new RegExp(`^${name}: (\\[[^\\n]+\\])$`, "m"))?.[1] ?? "null");

const exportedStringArray = (source, name) => {
  const body = source.match(
    new RegExp(`export const ${name} = Object\\.freeze\\(\\[([\\s\\S]*?)\\] as const\\);`),
  )?.[1];
  assert.ok(body, `missing reviewed export array: ${name}`);
  return [...body.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
};

test("records the immutable C3 approval and preserves V1 separately", async () => {
  const review = await readFile(reviewPath, "utf8");
  assert.match(review, /^Status: APPROVED$/m);
  assert.match(review, new RegExp(`^Reviewed head: \`${reviewedHead}\`$`, "m"));
  assert.match(review, new RegExp(`^Reviewed range: \`${reviewedBase}\\.\\.${reviewedHead}\`$`, "m"));
  assert.match(review, /TELEMETRY_ARCHITECTURE_REVIEW_GATE_V1\.md.*historical/i);

  execFileSync("git", ["cat-file", "-e", `${reviewedHead}^{commit}`], { cwd: repositoryRoot });
  execFileSync("git", ["cat-file", "-e", `${reviewedBase}^{commit}`], { cwd: repositoryRoot });
  execFileSync("git", ["merge-base", "--is-ancestor", reviewedBase, reviewedHead], {
    cwd: repositoryRoot,
  });
});

test("validates strategic invariants from immutable reviewed sources", () => {
  const telemetry = gitShow("docs/domain/TELEMETRY.md");
  const contexts = gitShow("docs/domain/BOUNDED_CONTEXTS.md");
  const ownership = gitShow("docs/domain/OWNERSHIP.md");
  const compatibility = gitShow("docs/domain/CONTRACT_COMPATIBILITY.md");
  const evidence = gitShow("docs/domain/EVIDENCE_PIPELINE.md");
  const pricing = gitShow("docs/domain/PRICING_ENGINE.md");
  const platform = gitShow("docs/specification/PLATFORM_SPECIFICATION.md");
  const decisions = gitShow("docs/specification/DECISION_REGISTRY.md");

  assert.match(lineContaining(telemetry, "does not introduce an Audience Bounded Context"), /internal Telemetry projection/);
  assert.match(lineContaining(contexts, "Telemetry Ledger append-only"), /AudienceProjection/);
  assert.match(
    lineContaining(ownership, "| AudienceProjection |"),
    /Telemetry Context.*Pricing Engine, AI, Analytics, Marketplace.*Projeção interna/is,
  );

  assert.match(compatibility, /producer.*owns.*identity/is);
  assert.match(compatibility, /consumer.*owns.*CompatibilityMatrix/is);
  assert.match(
    compatibility,
    /Configuration Service distributes, caches, retains and serves immutable revisions only\. It cannot author entries, change effective periods, infer support or select a revision on behalf of a consumer\./,
  );
  assert.match(telemetry, /never evaluates consumer compatibility/i);

  assert.match(lineContaining(evidence, "somente o Evidence Ledger materializa"), /EvidenceRecord/);
  assert.match(lineContaining(pricing, "Only new PricingQuotes may consume"), /remain unchanged/i);
  assert.match(platform, /Evidence Ledger alone materializes EvidenceRecord/i);

  assert.match(decisions, /DEC-065/);
  assert.match(decisions, /OPAQUE_TOKEN_V1/);
  assert.match(compatibility, /\[A-Za-z0-9\]\[A-Za-z0-9\._:\+\-\]\*/);
  assert.match(compatibility, /case-sensitive/i);
  assert.match(compatibility, /lexical grammar.*not.*semantics/is);
  assert.match(compatibility, /INVALID_VERSION_IDENTITY_REPRESENTATION/);
  assert.match(compatibility, /no normalization|shall not normalize/i);
});

test("proves exact READY and PARTIAL authorization from the reviewed snapshot", () => {
  const gate = gitShow("docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md");
  const registry = gitShow("packages/generation/src/artifact-authorization.ts");
  const gateReady = manifest(gate, "READY_MANIFEST");
  const gatePartial = manifest(gate, "PARTIAL_MANIFEST");

  assert.deepEqual(gateReady, ready);
  assert.deepEqual(gatePartial, partial);
  assert.equal(gateReady.length, 10);
  assert.equal(gatePartial.length, 23);
  assert.equal(new Set([...gateReady, ...gatePartial]).size, 33);
  assert.deepEqual(
    [...gate.matchAll(/^\| `([^`]+)` \| `IMPLEMENTATION_READY` \|/gm)].map((match) => match[1]),
    ready,
  );
  assert.deepEqual(
    [...gate.matchAll(/^\| `([^`]+)` \| `IMPLEMENTATION_PARTIAL` \|/gm)].map((match) => match[1]),
    partial,
  );
  assert.deepEqual(exportedStringArray(registry, "telemetryAuthorizedArtifacts"), ready);
  assert.deepEqual(exportedStringArray(registry, "telemetryPartialArtifacts"), partial);
  assert.match(registry, /status: "IMPLEMENTATION_READY"[\s\S]*?source: "TELEMETRY_IMPLEMENTATION_GATE_V1\.md"/);
  assert.match(registry, /status: "IMPLEMENTATION_PARTIAL"[\s\S]*?source: "TELEMETRY_IMPLEMENTATION_GATE_V1\.md"/);
});

test("proves the pre-C4 package contains four materialized artifacts only", () => {
  const index = gitShow("packages/telemetry/src/index.ts");
  const identities = gitShow("packages/telemetry/src/identities.ts");
  const capability = gitShow("packages/telemetry/src/capability.ts");
  const packageJson = gitShow("packages/telemetry/package.json");
  const packageSource = `${index}\n${identities}\n${capability}\n${packageJson}`;

  assert.deepEqual(
    [...identities.matchAll(/export type (TelemetryBucketId|AudienceProjectionId|TelemetryEventId) =/g)].map((match) => match[1]),
    materialized.slice(0, 3),
  );
  assert.match(capability, /export type TelemetryCapabilityStatus/);
  assert.deepEqual([...index.matchAll(/^export \* from "([^"]+)";/gm)].map((match) => match[1]), [
    "./capability.ts",
    "./identities.ts",
  ]);

  for (const artifact of authorizedNotMaterialized) {
    assert.doesNotMatch(packageSource, new RegExp(`(?:export\\s+(?:type|class|function|const|interface)\\s+${artifact}\\b|${artifact}\\.ts)`));
  }
  for (const artifact of partial) {
    assert.doesNotMatch(packageSource, new RegExp(`export\\s+(?:type|class|function|const|interface)\\s+${artifact}\\b`));
  }
});

test("records PASS evidence and denies every bypass outside the reviewed boundary", async () => {
  const review = await readFile(reviewPath, "utf8");
  const audit = section(review, "Architecture audit results");
  for (const invariant of [
    "No new Bounded Context",
    "Producer identity ownership",
    "Consumer-local CompatibilityMatrix ownership",
    "Configuration Service distribution-only authority",
    "Telemetry compatibility exclusion",
    "Evidence ownership",
    "Pricing read-only consumption",
    "Authorization consistency",
    "Implementation boundary",
    "No bypass",
    "DEC-065 OPAQUE_TOKEN_V1 semantics",
  ]) {
    assert.match(audit, new RegExp(`\\| ${invariant.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")} \\| PASS \\|`));
  }

  assert.match(review, /READY count: 10/);
  assert.match(review, /PARTIAL count: 23/);
  assert.match(review, /Materialized before C4: 4/);
  assert.match(review, /Authorized but not materialized: 6/);
  assert.match(review, /Every PARTIAL artifact remains denied/i);
  assert.match(review, /No service, API, repository, topic, stream, broker, adapter, infrastructure, CompatibilityMatrix, or compatibility evaluator is authorized/i);
  assert.match(review, /Task C4 may implement only the six authorized version identities/i);
});
