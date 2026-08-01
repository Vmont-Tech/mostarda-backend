import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const reviewPath = new URL(
  "../../docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V1.md",
  import.meta.url,
);
const implementationGatePath = new URL(
  "../../docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md",
  import.meta.url,
);

const boundedSection = (document, heading) => {
  const marker = `## ${heading}`;
  const start = document.indexOf(marker);
  assert.notEqual(start, -1, `missing section: ${heading}`);
  const end = document.indexOf("\n## ", start + marker.length);
  return document.slice(start, end === -1 ? document.length : end);
};

test("records the approved Telemetry architecture review verdict and immutable scope", async () => {
  const review = await readFile(reviewPath, "utf8");
  const verdict = boundedSection(review, "Verdict");

  for (const required of [
    "Status: APPROVED",
    "NO_NEW_BOUNDED_CONTEXT: PASS",
    "AUDIENCE_PROJECTION_OWNED_BY_TELEMETRY: PASS",
    "EVIDENCE_LEDGER_ONLY_MATERIALIZER: PASS",
    "PRICING_READ_ONLY_CONSUMER: PASS",
    "AUTHORIZED_ARTIFACTS_MATCH_GATE: PASS",
    "NO_BYPASS: PASS",
  ]) {
    assert.ok(verdict.split(/\r?\n/).includes(required), `missing verdict: ${required}`);
  }

  const scope = boundedSection(review, "Reviewed scope");
  assert.match(scope, /^Reviewed head: `757d9b0`$/m);
  assert.match(scope, /^Reviewed range: `7029c40\.\.757d9b0`$/m);
});

test("provides bounded reviewer evidence for every invariant", async () => {
  const review = await readFile(reviewPath, "utf8");
  const evidence = boundedSection(review, "Reviewer evidence");

  for (const subsection of [
    "### No new bounded context",
    "### AudienceProjection ownership",
    "### Evidence materialization",
    "### Pricing consumption",
    "### Artifact authorization",
  ]) {
    assert.ok(evidence.includes(subsection), `missing evidence subsection: ${subsection}`);
  }
  for (const path of [
    "docs/domain/TELEMETRY.md",
    "docs/domain/BOUNDED_CONTEXTS.md",
    "docs/domain/OWNERSHIP.md",
    "docs/specification/PLATFORM_SPECIFICATION.md",
    "docs/domain/DOMAIN_EVENTS.md",
    "docs/domain/PRICING_ENGINE.md",
    "docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md",
    "packages/generation/src/artifact-authorization.ts",
    "tests/generation/artifact-authorization.test.ts",
  ]) {
    assert.match(evidence, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(evidence, /read-only consumers/i);
  assert.match(evidence, /Edge\/Playback produces authoritative playback facts/i);
  assert.match(evidence, /prospective quotes/i);
  assert.match(evidence, /applied quotes, holds, reserved or sold slots, and prices remain unchanged/i);
  assert.match(evidence, /unknown artifacts remain denied/i);
  assert.match(evidence, /READY and PARTIAL sets remain disjoint/i);
});

test("records exact manifests and denies infrastructure authorization", async () => {
  const [review, gate] = await Promise.all([
    readFile(reviewPath, "utf8"),
    readFile(implementationGatePath, "utf8"),
  ]);
  const authorization = boundedSection(review, "Authorization audit");
  const ready = JSON.parse(gate.match(/^READY_MANIFEST: (\[[^\n]+\])$/m)?.[1] ?? "null");
  const partial = JSON.parse(gate.match(/^PARTIAL_MANIFEST: (\[[^\n]+\])$/m)?.[1] ?? "null");

  assert.equal(ready.length, 14);
  assert.equal(partial.length, 19);
  assert.equal(new Set([...ready, ...partial]).size, 33);
  assert.match(authorization, /^READY count: 14$/m);
  assert.match(authorization, /^PARTIAL count: 19$/m);
  assert.match(authorization, /^Unknown artifacts: denied$/m);
  assert.match(authorization, /^Infrastructure authorization: none$/m);
  assert.match(authorization, /^Architecture bypass: none$/m);
  assert.match(
    authorization,
    /No services, APIs, repositories, topics, or brokers are authorized\./,
  );
});

test("records reviewed files, commands, results, and the non-blocking whitespace note", async () => {
  const review = await readFile(reviewPath, "utf8");
  const files = boundedSection(review, "Reviewed files");
  const commands = boundedSection(review, "Commands and results");
  const note = boundedSection(review, "Audit note");

  assert.match(files, /The reviewer directly inspected/);
  assert.match(commands, /`git diff --name-only 7029c40\.\.757d9b0` — PASS/);
  assert.match(commands, /supporting evidence, not a substitute for direct inspection/i);
  assert.match(commands, /`npm run test:docs` — PASS/);
  assert.match(commands, /`npm run test:architecture` — PASS/);
  assert.match(commands, /`git diff --check` — PASS/);
  assert.match(note, /markdown trailing whitespace outside the architecture verdict/i);
  assert.match(note, /current branch passes `git diff --check`/i);
});
