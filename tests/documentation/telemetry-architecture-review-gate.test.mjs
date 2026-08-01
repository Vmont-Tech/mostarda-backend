import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
const repositoryRoot = new URL("../../", import.meta.url);

const sourcePaths = {
  design: new URL("../../docs/superpowers/specs/2026-08-01-edge-telemetry-pricing-design.md", import.meta.url),
  telemetry: new URL("../../docs/domain/TELEMETRY.md", import.meta.url),
  contexts: new URL("../../docs/domain/BOUNDED_CONTEXTS.md", import.meta.url),
  ownership: new URL("../../docs/domain/OWNERSHIP.md", import.meta.url),
  platform: new URL("../../docs/specification/PLATFORM_SPECIFICATION.md", import.meta.url),
  events: new URL("../../docs/domain/DOMAIN_EVENTS.md", import.meta.url),
  evidence: new URL("../../docs/domain/EVIDENCE_PIPELINE.md", import.meta.url),
  pricing: new URL("../../docs/domain/PRICING_ENGINE.md", import.meta.url),
};

const boundedSection = (document, heading) => {
  const marker = `## ${heading}`;
  const start = document.indexOf(marker);
  assert.notEqual(start, -1, `missing section: ${heading}`);
  const end = document.indexOf("\n## ", start + marker.length);
  return document.slice(start, end === -1 ? document.length : end);
};

const lineContaining = (document, needle) => {
  const line = document.split(/\r?\n/).find((candidate) => candidate.includes(needle));
  assert.ok(line, `missing bounded source line containing: ${needle}`);
  return line;
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

  execFileSync("git", ["cat-file", "-e", "757d9b0^{commit}"], { cwd: repositoryRoot });
  execFileSync("git", ["cat-file", "-e", "7029c40^{commit}"], { cwd: repositoryRoot });
  execFileSync("git", ["merge-base", "--is-ancestor", "7029c40", "757d9b0"], {
    cwd: repositoryRoot,
  });
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
    "docs/domain/EVIDENCE_PIPELINE.md",
    "docs/domain/PRICING_ENGINE.md",
    "docs/superpowers/specs/2026-08-01-edge-telemetry-pricing-design.md",
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

test("authoritative sources directly preserve all five architecture invariants", async () => {
  const sources = Object.fromEntries(
    Object.entries(sourcePaths).map(([name, path]) => {
      const relativePath = path.pathname
        .slice(repositoryRoot.pathname.length)
        .replace(/^\//, "");
      return [
        name,
        execFileSync("git", ["show", `757d9b0:${decodeURIComponent(relativePath)}`], {
          cwd: repositoryRoot,
          encoding: "utf8",
        }),
      ];
    }),
  );

  assert.match(lineContaining(sources.design, "does not introduce an Audience Bounded Context"), /internal, versioned and rebuildable Telemetry read artifact/);
  assert.match(lineContaining(sources.telemetry, "does not introduce an Audience Bounded Context"), /internal Telemetry projection/);
  assert.match(lineContaining(sources.contexts, "Telemetry Ledger append-only"), /`AudienceProjection` interna/);
  assert.match(lineContaining(sources.ownership, "| AudienceProjection |"), /\*\*Telemetry Context\*\*.*Pricing Engine, AI, Analytics, Marketplace/);
  assert.match(lineContaining(sources.platform, "não introduz Audience Bounded Context"), /Telemetry Context possui exclusivamente/);
  assert.match(lineContaining(sources.telemetry, "nenhum consumidor pode produzi-la ou alterá-la"), /internal Telemetry projection/);

  for (const name of ["telemetry", "events"]) {
    const evidenceBoundary = lineContaining(sources[name], "Edge/Playback produces authoritative playback facts");
    assert.match(evidenceBoundary, /Evidence Ledger alone materializes EvidenceRecord/);
  }
  assert.match(lineContaining(sources.evidence, "somente o Evidence Ledger materializa"), /Edge produz `PlaybackEvent`.*`EvidenceRecord`/);
  assert.match(lineContaining(sources.evidence, "| `PlaybackSignature` |"), /Edge Runtime/);

  for (const [name, needle] of [
    ["telemetry", "Only new PricingQuotes may consume"],
    ["pricing", "Only new PricingQuotes may consume"],
    ["platform", "Somente novos `PricingQuote` podem consumir"],
  ]) {
    const pricingBoundary = lineContaining(sources[name], needle);
    assert.match(pricingBoundary, /applied PricingQuotes remain unchanged/i);
    assert.match(pricingBoundary, /InventoryHolds remain unchanged/);
    assert.match(pricingBoundary, /reserved or sold Slots remain unchanged/);
    assert.match(pricingBoundary, /prices remain unchanged/);
  }
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

  const denied = [
    "TelemetryService",
    "TelemetryAPI",
    "TelemetryRepository",
    "TelemetryTopic",
    "TelemetryBroker",
    "TelemetryAdapter",
    "TelemetryIngestionService",
    "TelemetryPersistenceMapping",
    "TelemetryTransportEnvelope",
    "TelemetryDeploymentResource",
  ];
  const authorizationModule = new URL(
    "../../packages/generation/src/artifact-authorization.ts",
    import.meta.url,
  ).href;
  const script = `
    import {
      telemetryAuthorizedArtifacts,
      telemetryPartialArtifacts,
      authorizationFor,
      assertGenerationAuthorized,
    } from ${JSON.stringify(authorizationModule)};
    const names = ${JSON.stringify({ ready, partial, denied })};
    const exercise = (artifact) => {
      const authorization = authorizationFor(artifact);
      try {
        assertGenerationAuthorized(artifact);
        return { artifact, status: authorization.status, allowed: true };
      } catch (error) {
        return { artifact, status: authorization.status, allowed: false, thrownStatus: error.status };
      }
    };
    process.stdout.write(JSON.stringify({
      exportedReady: [...telemetryAuthorizedArtifacts],
      exportedPartial: [...telemetryPartialArtifacts],
      readyResults: names.ready.map(exercise),
      partialResults: names.partial.map(exercise),
      deniedResults: names.denied.map(exercise),
    }));
  `;
  const report = JSON.parse(
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "--eval", script],
      { cwd: repositoryRoot, encoding: "utf8" },
    ),
  );

  assert.deepEqual(report.exportedReady, ready);
  assert.deepEqual(report.exportedPartial, partial);
  assert.deepEqual(
    report.readyResults,
    ready.map((artifact) => ({ artifact, status: "IMPLEMENTATION_READY", allowed: true })),
  );
  assert.deepEqual(
    report.partialResults,
    partial.map((artifact) => ({
      artifact,
      status: "IMPLEMENTATION_PARTIAL",
      allowed: false,
      thrownStatus: "IMPLEMENTATION_PARTIAL",
    })),
  );
  assert.deepEqual(
    report.deniedResults,
    denied.map((artifact) => ({
      artifact,
      status: "IMPLEMENTATION_BLOCKED_ARCHITECTURE",
      allowed: false,
      thrownStatus: "IMPLEMENTATION_BLOCKED_ARCHITECTURE",
    })),
  );
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
  assert.match(files, /`git diff --name-only 7029c40\.\.757d9b0` identified only the changed-file subset/);
  assert.match(files, /unchanged governing sources were inspected separately/);
  assert.match(files, /`docs\/domain\/EVIDENCE_PIPELINE\.md` — authoritative Evidence materialization pipeline/);
  assert.match(files, /`docs\/superpowers\/specs\/2026-08-01-edge-telemetry-pricing-design\.md` — approved design baseline/);
  assert.match(commands, /`git diff --name-only 7029c40\.\.757d9b0` — PASS/);
  assert.match(commands, /identified only the changed-file subset/);
  assert.match(commands, /unchanged governing sources were separately inspected/);
  assert.doesNotMatch(commands, /identified the reviewed file set above/);
  assert.match(commands, /supporting evidence, not a substitute for direct inspection/i);
  assert.match(commands, /`npm run test:docs` — PASS/);
  assert.match(commands, /`npm run test:architecture` — PASS/);
  assert.match(commands, /`git diff --check` — PASS/);
  assert.match(commands, /^Evidence type: `structured command record`$/m);
  assert.match(commands, /^Claim boundary: `recorded result; not cryptographic proof of historical output`$/m);
  assert.match(note, /markdown trailing whitespace outside the architecture verdict/i);
  assert.match(note, /current branch passes `git diff --check`/i);
});
