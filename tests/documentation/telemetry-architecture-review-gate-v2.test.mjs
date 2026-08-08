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
const reviewedParent = "574ae63ab8a1aa777296749be6c454e381aeadb1";
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

const gitTree = (path) =>
  execFileSync("git", ["ls-tree", "-r", "--name-only", reviewedHead, "--", path], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

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

const interpretTelemetryRegistry = (source) => {
  const arrays = new Map([
    ["telemetryAuthorizedArtifacts", exportedStringArray(source, "telemetryAuthorizedArtifacts")],
    ["telemetryPartialArtifacts", exportedStringArray(source, "telemetryPartialArtifacts")],
  ]);
  const registrations = [];
  const loopPattern = /for \(const artifact of (telemetry(?:Authorized|Partial)Artifacts)\) \{([\s\S]*?)\n\}/g;
  for (const match of source.matchAll(loopPattern)) {
    const status = match[2].match(/status: "([^"]+)"/)?.[1];
    const provenance = match[2].match(/source: "([^"]+)"/)?.[1];
    assert.ok(status, `missing status in ${match[1]} registration loop`);
    assert.ok(provenance, `missing provenance in ${match[1]} registration loop`);
    assert.match(match[2], /registry\.set\(\s*artifact,/);
    registrations.push({ array: match[1], offset: match.index, status, provenance });
  }
  assert.deepEqual(
    registrations.map(({ array }) => array),
    ["telemetryAuthorizedArtifacts", "telemetryPartialArtifacts"],
  );

  const results = new Map();
  for (const registration of registrations) {
    for (const artifact of arrays.get(registration.array)) {
      assert.ok(!results.has(artifact), `duplicate telemetry registration: ${artifact}`);
      results.set(artifact, {
        status: registration.status,
        source: registration.provenance,
      });
    }
  }

  const lastTelemetryLoopEnd = registrations.at(-1).offset;
  const laterLiteralOverrides = [
    ...source.slice(lastTelemetryLoopEnd).matchAll(/registry\.set\(\s*"([^"]+)"/g),
  ].map((match) => match[1]);
  for (const artifact of results.keys()) {
    assert.ok(!laterLiteralOverrides.includes(artifact), `later registry override: ${artifact}`);
  }

  const fallback = source.match(
    /registry\.get\(artifact\) \?\?[\s\S]*?status: "([^"]+)"[\s\S]*?source: "([^"]+)"/,
  );
  assert.ok(fallback, "missing authorizationFor deny-by-default fallback");
  return {
    arrays,
    registrations,
    results,
    authorizationFor: (artifact) =>
      results.get(artifact) ?? { status: fallback[1], source: fallback[2] },
  };
};

const exportedDeclarations = (source) =>
  [...source.matchAll(/^export\s+(?:declare\s+)?(?:abstract\s+)?(type|interface|class|function|const|let|var|enum)\s+([A-Za-z_$][\w$]*)/gm)]
    .map(([, kind, name]) => ({ kind, name }));

test("records the immutable C3 approval and preserves V1 separately", async () => {
  const review = await readFile(reviewPath, "utf8");
  assert.match(review, /^Status: APPROVED$/m);
  assert.match(review, new RegExp(`^Reviewed head: \`${reviewedHead}\`$`, "m"));
  assert.match(review, new RegExp(`^Reviewed parent: \`${reviewedParent}\`$`, "m"));
  assert.match(review, new RegExp(`^Reviewed range: \`${reviewedBase}\\.\\.${reviewedHead}\`$`, "m"));
  assert.match(review, /TELEMETRY_ARCHITECTURE_REVIEW_GATE_V1\.md.*historical/i);

  execFileSync("git", ["cat-file", "-e", `${reviewedHead}^{commit}`], { cwd: repositoryRoot });
  execFileSync("git", ["cat-file", "-e", `${reviewedBase}^{commit}`], { cwd: repositoryRoot });
  assert.equal(
    execFileSync("git", ["rev-parse", `${reviewedHead}^`], { cwd: repositoryRoot, encoding: "utf8" }).trim(),
    reviewedParent,
  );
  execFileSync("git", ["merge-base", "--is-ancestor", reviewedBase, reviewedHead], {
    cwd: repositoryRoot,
  });
});

test("mechanically preserves the invalidated historical V1 record", () => {
  const historical = gitShow("docs/reviews/TELEMETRY_ARCHITECTURE_REVIEW_GATE_V1.md");
  assert.match(historical, /^# Telemetry Architecture Review Gate V1$/m);
  assert.match(historical, /^Status: INVALIDATED_BY_AUTHORIZATION_CHANGE$/m);
  assert.match(historical, /^Required next gate: Task C3 manual Architecture Review Gate$/m);
  assert.match(historical, /^Prior reviewed authorization: READY 4 \/ PARTIAL 29$/m);
  assert.match(historical, /^Current unreviewed authorization: READY 10 \/ PARTIAL 23$/m);
  assert.doesNotMatch(historical, /^Status: APPROVED$/m);
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

  assert.match(compatibility, /There is no global compatibility matrix/i);
  assert.doesNotMatch(compatibility, /global compatibility matrix (?:is|shall be) (?:owned|authoritative|effective)/i);
  assert.doesNotMatch(contexts, /^\|\s*(?:Audience|Compatibility)(?:\s+[^|]*)?\s*\|/mi);
  assert.doesNotMatch(telemetry, /Telemetry (?:owns|evaluates|decides) (?:a |the )?(?:consumer )?CompatibilityMatrix/i);
  assert.doesNotMatch(ownership, /\|\s*CompatibilityMatrix\s*\|\s*\*\*Telemetry/i);
  assert.doesNotMatch(
    compatibility,
    /Configuration Service (?:authors|owns|decides|infers|selects) (?:consumer )?compatibility/i,
  );
});

test("proves each of the six producer-owned version syntax declarations", () => {
  const telemetry = gitShow("docs/domain/TELEMETRY.md");
  const edgeRuntime = gitShow("docs/tv-network/EDGE_RUNTIME.md");
  const capabilityManagement = gitShow("docs/tv-network/CAPABILITY_MANAGEMENT.md");

  for (const artifact of [
    "TelemetrySchemaVersion",
    "CollectionPolicyVersion",
    "AudienceProjectionVersion",
    "AudienceProjectionPolicyVersion",
  ]) {
    assert.match(
      lineContaining(telemetry, `\`${artifact}\``),
      /VersionSyntax = OPAQUE_TOKEN_V1/,
      `${artifact} must declare its syntax in the immutable Telemetry authority`,
    );
  }
  assert.match(
    lineContaining(edgeRuntime, "`CollectorVersion`"),
    /owner Edge Runtime.*VersionSyntax = OPAQUE_TOKEN_V1/i,
  );
  assert.match(
    lineContaining(capabilityManagement, "`CapabilityVersion`"),
    /TV Network capability owner.*VersionSyntax = OPAQUE_TOKEN_V1/i,
  );
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

  const interpreted = interpretTelemetryRegistry(registry);
  assert.deepEqual(interpreted.arrays.get("telemetryAuthorizedArtifacts"), gateReady);
  assert.deepEqual(interpreted.arrays.get("telemetryPartialArtifacts"), gatePartial);
  assert.deepEqual(
    interpreted.registrations.map(({ array, status, provenance }) => ({ array, status, provenance })),
    [
      {
        array: "telemetryAuthorizedArtifacts",
        status: "IMPLEMENTATION_READY",
        provenance: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
      },
      {
        array: "telemetryPartialArtifacts",
        status: "IMPLEMENTATION_PARTIAL",
        provenance: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
      },
    ],
  );
  for (const artifact of [...gateReady, ...gatePartial]) {
    const expectedStatus = gateReady.includes(artifact)
      ? "IMPLEMENTATION_READY"
      : "IMPLEMENTATION_PARTIAL";
    assert.deepEqual(interpreted.authorizationFor(artifact), {
      status: expectedStatus,
      source: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
    });
  }
  assert.deepEqual(interpreted.authorizationFor("TelemetryUnregisteredArtifact"), {
    status: "IMPLEMENTATION_BLOCKED_ARCHITECTURE",
    source: "CGS-A-1 deny-by-default",
  });

  const mutated = registry.replace(
    'status: "IMPLEMENTATION_PARTIAL",',
    'status: "IMPLEMENTATION_READY",',
  );
  const mutatedInterpretation = interpretTelemetryRegistry(mutated);
  assert.throws(() =>
    assert.deepEqual(
      [...mutatedInterpretation.results.entries()],
      [...interpreted.results.entries()],
    ),
  );
});

test("proves the pre-C4 package contains four materialized artifacts only", () => {
  const packageTree = gitTree("packages/telemetry");
  assert.deepEqual(packageTree, [
    "packages/telemetry/package.json",
    "packages/telemetry/src/capability.ts",
    "packages/telemetry/src/identities.ts",
    "packages/telemetry/src/index.ts",
  ]);
  const sources = Object.fromEntries(packageTree.map((path) => [path, gitShow(path)]));
  const index = sources["packages/telemetry/src/index.ts"];
  const identities = sources["packages/telemetry/src/identities.ts"];
  const capability = sources["packages/telemetry/src/capability.ts"];
  const packageSource = Object.values(sources).join("\n");

  const publicDeclarations = packageTree
    .filter((path) => path.endsWith(".ts") && !path.endsWith("/index.ts"))
    .flatMap((path) => exportedDeclarations(sources[path]))
    .sort((left, right) => left.name.localeCompare(right.name));
  assert.deepEqual(publicDeclarations, [
    { kind: "type", name: "AudienceProjectionId" },
    { kind: "const", name: "TELEMETRY_CAPABILITY_STATUSES" },
    { kind: "type", name: "TelemetryBucketId" },
    { kind: "type", name: "TelemetryCapabilityStatus" },
    { kind: "type", name: "TelemetryEventId" },
    { kind: "function", name: "createAudienceProjectionId" },
    { kind: "function", name: "createTelemetryBucketId" },
    { kind: "function", name: "createTelemetryEventId" },
    { kind: "function", name: "isTelemetryCapabilityStatus" },
  ].sort((left, right) => left.name.localeCompare(right.name)));

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

test("mechanically denies service, API, infrastructure and compatibility bypasses", () => {
  const packageTree = gitTree("packages/telemetry");
  const packageSource = packageTree.map(gitShow).join("\n");
  const registry = gitShow("packages/generation/src/artifact-authorization.ts");
  const registryReady = exportedStringArray(registry, "telemetryAuthorizedArtifacts");
  const registryPartial = exportedStringArray(registry, "telemetryPartialArtifacts");
  const bypasses = [
    "TelemetryService",
    "TelemetryAPI",
    "TelemetryRepository",
    "TelemetryTopic",
    "TelemetryStream",
    "TelemetryBroker",
    "TelemetryAdapter",
    "TelemetryInfrastructure",
    "CompatibilityMatrix",
    "CompatibilityEvaluator",
  ];

  assert.match(registry, /status: "IMPLEMENTATION_BLOCKED_ARCHITECTURE"/);
  for (const artifact of bypasses) {
    assert.ok(!registryReady.includes(artifact), `${artifact} must not be READY`);
    assert.ok(!registryPartial.includes(artifact), `${artifact} must remain absent and denied by default`);
    assert.doesNotMatch(
      packageSource,
      new RegExp(`export\\s+(?:type|class|function|const|interface)\\s+${artifact}\\b`),
      `${artifact} must not exist in the immutable package tree`,
    );
  }
  for (const path of packageTree) {
    assert.doesNotMatch(path, /(?:service|api|repository|topic|stream|broker|adapter|infrastructure|compatibility)/i);
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
  assert.match(review, /entire `packages\/telemetry` tree/i);
  assert.match(review, /each of the 23 PARTIAL entries was mechanically interpreted/i);
  assert.match(review, /EDGE_RUNTIME\.md.*CAPABILITY_MANAGEMENT\.md/is);
  assert.match(review, /positive and negative contradiction checks/i);
  assert.match(review, /generic exported declaration/i);
  assert.match(review, /mutation fixture.*PARTIAL.*READY/is);
  assert.match(review, /historical V1.*git show.*INVALIDATED/is);
});
