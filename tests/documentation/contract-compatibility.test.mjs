import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const paths = {
  compatibility: new URL("../../docs/domain/CONTRACT_COMPATIBILITY.md", import.meta.url),
  decisions: new URL("../../docs/specification/DECISION_REGISTRY.md", import.meta.url),
  platform: new URL("../../docs/specification/PLATFORM_SPECIFICATION.md", import.meta.url),
  tbs: new URL("../../docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md", import.meta.url),
  telemetry: new URL("../../docs/domain/TELEMETRY.md", import.meta.url),
  edge: new URL("../../docs/tv-network/EDGE_RUNTIME.md", import.meta.url),
  capabilities: new URL("../../docs/tv-network/CAPABILITY_MANAGEMENT.md", import.meta.url),
  ownership: new URL("../../docs/domain/OWNERSHIP.md", import.meta.url),
  aggregates: new URL("../../docs/domain/AGGREGATES.md", import.meta.url),
  commands: new URL("../../docs/execution/COMMANDS.md", import.meta.url),
  events: new URL("../../docs/domain/DOMAIN_EVENTS.md", import.meta.url),
};

const opaqueTokenPattern = String.raw`[A-Za-z0-9][A-Za-z0-9._:+-]*`;

const read = (name) => readFile(paths[name], "utf8");

const boundedSection = (document, heading) => {
  const marker = `## ${heading}`;
  const start = document.indexOf(marker);
  assert.notEqual(start, -1, `missing section: ${heading}`);
  const end = document.indexOf("\n## ", start + marker.length);
  return document.slice(start, end === -1 ? document.length : end);
};

const assertInOrder = (document, values) => {
  let cursor = -1;
  for (const value of values) {
    const next = document.indexOf(value, cursor + 1);
    assert.ok(next > cursor, `${value} is missing or out of order`);
    cursor = next;
  }
};

const forbiddenAuthorityClauses = [
  /\bproducer(?: contract| context| system| component| artifact owner)?[^.;\n]*(?<!cannot )(?<!never )(?<!does not )(?:declares|controls|decides|determines|owns)[^.;\n]*(?:consumer )?compatibility/i,
  /Configuration Service[^.;\n]*(?<!cannot )(?<!never )(?<!does not )(?:publishes|authors|owns|decides|determines|changes)[^.;\n]*(?:compatibility )?(?:entry|entries|decision|matrix)/i,
  /(?<!no )(?<!not a )(?<!never a )\b(?:global|platform-wide|Mostarda-wide)[^.;\n]*compatibility (?:authority|matrix)/i,
  /(?<!not a )(?<!never a )\bfifth (?:compatibility |matrix )?state[^.;\n]*COMPATIBILITY_NOT_EVALUATED/i,
];

const assertNoAffirmativeContradictions = (document) => {
  for (const clause of document.split(/(?<=[.!?])\s+|[;\r\n]+/i)) {
    for (const contradiction of forbiddenAuthorityClauses) {
      if (contradiction.test(clause)) assert.fail(`affirmative compatibility contradiction: ${clause.trim()}`);
    }
    for (const match of clause.matchAll(/\b(?:fallback|inheritance|composition)\b/gi)) {
      if (!/\b(?:scope|matrix|compatibility)\b/i.test(clause)) continue;
      const localPrefix = clause.slice(Math.max(0, match.index - 48), match.index);
      const localSuffix = clause.slice(match.index, match.index + 80);
      if (!/\b(?:no|never|without|prohibit\w*)\b/i.test(localPrefix) &&
          !/\b(?:prohibit\w*|not permitted|never allowed)\b/i.test(localSuffix)) {
        assert.fail(`affirmative compatibility contradiction: ${clause.trim()}`);
      }
    }
  }
};

const normalizeConcept = (value) => value.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
const isForbiddenCompatibilityArtifact = (value) => {
  const words = new Set(normalizeConcept(value).toLowerCase().match(/[a-z]+/g) ?? []);
  if (words.has("compatibility")) return true;
  if (!words.has("matrix")) return false;
  return ["consumer", "revision", "evaluate", "evaluation"].some((word) => words.has(word));
};

const assertAllowedArtifactConcept = (value) => {
  assert.equal(
    isForbiddenCompatibilityArtifact(value),
    false,
    `forbidden compatibility matrix/evaluation artifact: ${value}`,
  );
};

const assertNoCompatibilityArtifacts = (catalog) => {
  for (const line of catalog.split(/\r?\n/)) {
    if (/^#{1,6}\s/.test(line)) {
      assertAllowedArtifactConcept(line.replace(/^#{1,6}\s+/, ""));
    }
    if (/^\|/.test(line) || /^[-*]\s/.test(line)) {
      for (const token of line.matchAll(/`([^`]+)`/g)) {
        assertAllowedArtifactConcept(token[1]);
      }
    }
  }
};

test("domain compatibility authority defines consumer-local vocabulary and closed decisions", async () => {
  const document = await read("compatibility");
  const ownership = boundedSection(document, "Consumer authority and scope");
  assert.match(ownership, /Every consumer exclusively owns its immutable `CompatibilityMatrix`/);
  assert.match(ownership, /There is no global compatibility matrix/);
  assert.match(ownership, /Configuration Service distributes[^.]*only/);
  assert.match(ownership, /`CompatibilityScopeId`/);
  assert.match(ownership, /no scope inheritance[^.]*no (?:global or )?default fallback/i);
  assert.match(ownership, /two textual representations[^.]*cannot identify the same scope[^.]*same scope contract/i);

  const identity = boundedSection(document, "Producer-owned version identity");
  assert.match(identity, /opaque identity/);
  assert.match(identity, /producer[^.]*defines `VersionSyntax`/);
  assert.match(identity, /exact canonical value/);
  assert.match(identity, /no normalization, coercion, ordering or implicit semantic interpretation/i);

  const entries = boundedSection(document, "Entry identity and decisions");
  assertInOrder(entries, ["ConsumerId", "CompatibilityScopeId", "ProducerContext", "ArtifactType", "VersionKind", "VersionValue"]);
  assert.match(entries, /at most one entry[^.]*complete six-field key/i);
  for (const state of ["SUPPORTED", "DEPRECATED", "EXPERIMENTAL", "UNSUPPORTED"]) assert.match(entries, new RegExp(`\\b${state}\\b`));
  assert.match(entries, /absent[^.]*`UNSUPPORTED \/ ENTRY_NOT_FOUND`/i);
  assert.match(entries, /closed by default/i);

  const result = boundedSection(document, "Evaluation result vocabulary");
  assert.match(result, /`DECISION_PRODUCED`/);
  assert.match(result, /`COMPATIBILITY_NOT_EVALUATED`/);
  assert.match(result, /never a fifth compatibility state/i);
  for (const cause of ["COMPATIBILITY_SCOPE_NOT_RESOLVED", "MATRIX_NOT_FOUND", "MATRIX_UNAVAILABLE", "MATRIX_CORRUPTED", "MATRIX_VERSION_UNRESOLVABLE", "MATRIX_NOT_EFFECTIVE"]) assert.match(result, new RegExp(`\\b${cause}\\b`));

  const lifecycle = boundedSection(document, "Lifecycle, time and audit");
  assert.match(lifecycle, /immutable matrix revisions/i);
  assert.match(lifecycle, /Changing any entry, scope, effective interval or compatibility state requires a new immutable revision/i);
  assert.match(lifecycle, /non-overlapping effective intervals/i);
  assert.match(lifecycle, /activation is atomic/i);
  assert.match(lifecycle, /(?:Superseding|Retiring)[^.]*never deletes historical content/i);
  assert.match(lifecycle, /Real-time[^.]*current effective revision/i);
  assert.match(lifecycle, /replay[^.]*explicitly identified historical revision/i);
  assert.match(lifecycle, /same operation identity/i);
  assert.match(lifecycle, /explicit `ResultKind`/);
  assert.match(lifecycle, /common required fields[^.]*operation identity[^.]*consumer identity[^.]*evaluation instant[^.]*correlation[^.]*causation[^.]*stage[^.]*`ResultKind`/i);
  assert.match(lifecycle, /`CompatibilityScopeId`, scope-contract revision[^.]*only after scope resolution/i);
  assert.match(lifecycle, /matrix revision[^.]*only after matrix discovery and retrieval/i);
  assert.match(lifecycle, /complete six-field entry key[^.]*only after scope resolution/i);
  assert.match(lifecycle, /unavailable fields are structurally absent/i);
  assert.match(lifecycle, /no sentinel or default value/i);
});

test("DEC-065 defines OPAQUE_TOKEN_V1 as representation without version semantics", async () => {
  const [compatibility, platform, tbs, decisions] = await Promise.all([
    read("compatibility"), read("platform"), read("tbs"), read("decisions"),
  ]);
  for (const document of [compatibility, platform, tbs]) {
    assert.match(document, /`OPAQUE_TOKEN_V1`/);
    assert.ok(document.includes(opaqueTokenPattern));
    assert.match(document, /binary exact case-sensitive/i);
    assert.match(document, /`v2`[^.]*`V2`[^.]*different/i);
    assert.match(document, /`INVALID_VERSION_IDENTITY_REPRESENTATION`[^.]*if and only if[^.]*lexical grammar fails/i);
    assert.match(document, /no (?:existence, latest, compatibility, or SemVer|existence\/latest\/compatibility\/SemVer) check/i);
    assert.match(document, /no normalization or coercion/i);
    assert.match(document, /transport maximum length[^.]*not[^.]*lexical version semantics/i);
  }
  assert.match(decisions, /^\| `DEC-065` \|[^\n]*OPAQUE_TOKEN_V1[^\n]*ACCEPTED \|$/m);
});

test("each version producer declares OPAQUE_TOKEN_V1 for its owned identities", async () => {
  const [telemetry, edge, capabilities] = await Promise.all([
    read("telemetry"), read("edge"), read("capabilities"),
  ]);
  for (const artifact of [
    "TelemetrySchemaVersion",
    "CollectionPolicyVersion",
    "AudienceProjectionVersion",
    "AudienceProjectionPolicyVersion",
  ]) assert.match(telemetry, new RegExp(`\\b${artifact}\\b[^\\n]*VersionSyntax[^\\n]*OPAQUE_TOKEN_V1`));
  assert.match(edge, /\bCollectorVersion\b[^\n]*VersionSyntax[^\n]*OPAQUE_TOKEN_V1/);
  assert.match(capabilities, /\bCapabilityVersion\b[^\n]*VersionSyntax[^\n]*OPAQUE_TOKEN_V1/);
});

test("TBS independently defines deterministic observable evaluation behavior", async () => {
  const tbs = await read("tbs");
  const section = boundedSection(tbs, "19. Contract compatibility evaluation");
  assertInOrder(section, ["COMPATIBILITY_SCOPE_NOT_RESOLVED", "MATRIX_NOT_FOUND", "MATRIX_UNAVAILABLE", "MATRIX_CORRUPTED", "MATRIX_VERSION_UNRESOLVABLE", "MATRIX_NOT_EFFECTIVE"]);
  assert.match(section, /first blocking condition/i);
  assert.match(section, /later stages are not evaluated/);
  assert.match(section, /valid and effective matrix[^.]*absent[^.]*`UNSUPPORTED \/ ENTRY_NOT_FOUND`/is);
  assert.match(section, /real-time[^.]*current effective revision/i);
  assert.match(section, /replay[^.]*explicitly identified historical revision/i);
  assert.match(section, /retry[^.]*same operation identity/i);
  assert.match(section, /explicit `ResultKind`/);
  assert.match(section, /`DEPRECATED`[^.]*identical functional result[^.]*operational[^.]*observability/i);
  assert.match(section, /`EXPERIMENTAL`[^.]*explicit authorization/i);
  assert.match(section, /output[^.]*marked experimental/i);
  assert.match(section, /cannot replace official (?:results|output)[^.]*consumer-specific normative authority/i);
  assert.match(section, /common required fields[^.]*stage[^.]*`ResultKind`/i);
  assert.match(section, /`COMPATIBILITY_SCOPE_NOT_RESOLVED`[^.]*scope[^.]*structurally absent/i);
  assert.match(section, /`MATRIX_NOT_FOUND`[^.]*matrix revision[^.]*structurally absent/i);
  assert.match(section, /sentinel or default/i);
  assert.ok(tbs.indexOf("## 19. Contract compatibility evaluation") < tbs.indexOf("## 20. Não objetivos"));
  assert.equal(tbs.trimEnd().slice(tbs.trimEnd().lastIndexOf("## ")).startsWith("## 20. Não objetivos"), true);
});

test("platform, ownership, telemetry, and decision registry independently preserve authority boundaries", async () => {
  const [platform, ownership, telemetry, decisions] = await Promise.all([read("platform"), read("ownership"), read("telemetry"), read("decisions")]);
  const platformSection = boundedSection(platform, "SPEC-COMP-001 — Consumer-owned contract compatibility (`DEC-064`)");
  assert.match(platformSection, /each consumer[^.]*owns/i);
  assert.match(platformSection, /Configuration Service[^.]*distributes only/i);
  assert.match(platformSection, /does not introduce[^.]*Bounded Context/i);

  const ownershipSection = boundedSection(ownership, "Consumer compatibility authority");
  assert.match(ownershipSection, /each consumer[^.]*exclusive authority/i);
  assert.match(ownershipSection, /Pricing[^.]*Analytics[^.]*Marketplace[^.]*AI/i);
  assert.match(ownershipSection, /cannot publish or alter another consumer/i);
  assert.match(ownershipSection, /Configuration Service distributes consumer-authored revisions only/);
  assert.match(ownershipSection, /never chooses, never changes and never infers a compatibility decision/);

  const telemetrySection = boundedSection(telemetry, "Compatibility boundary");
  assert.match(telemetrySection, /records[^.]*exact[^.]*version/i);
  assert.match(telemetrySection, /never evaluates consumer compatibility/i);
  assert.match(telemetrySection, /does not own[^.]*CompatibilityMatrix/i);

  assert.match(decisions, /^\| `DEC-064` \|[^\n]*consumer[^\n]*CompatibilityMatrix[^\n]*ACCEPTED \|$/mi);
  assert.equal((decisions.match(/\| `DEC-064` \|/g) ?? []).length, 1);
});

test("authoritative documents reject compatibility ownership contradictions", async () => {
  const authorityNames = ["compatibility", "decisions", "platform", "tbs", "telemetry", "ownership"];
  const documents = await Promise.all(authorityNames.map(read));
  for (const document of documents) assertNoAffirmativeContradictions(document);
  const combined = documents.join("\n");
  assert.doesNotMatch(combined, /Compatibility Bounded Context/i);

  assert.throws(
    () => assertNoAffirmativeContradictions("Configuration Service cannot fail and owns the compatibility matrix."),
    /affirmative compatibility contradiction/,
  );
  assert.throws(
    () => assertNoAffirmativeContradictions("The producer controls consumer compatibility."),
    /affirmative compatibility contradiction/,
  );
});

test("compatibility authority positively prohibits and catalogs contain no new implementation artifacts", async () => {
  const compatibility = await read("compatibility");
  assert.match(compatibility, /creates no Bounded Context, aggregate, command or event/i);

  const catalogs = await Promise.all([read("aggregates"), read("commands"), read("events")]);
  for (const catalog of catalogs) assertNoCompatibilityArtifacts(catalog);

  for (const disguised of [
    "| `PublishConsumerMatrixCommand` | owner |",
    "## MatrixRevisionAggregate",
    "| `EvaluateMatrixEvent` | producer |",
  ]) {
    assert.throws(() => assertNoCompatibilityArtifacts(disguised), /matrix|evaluation/i);
  }

  for (const unrelated of [
    "| `ModelEvaluationCompleted` | AI |",
    "## RiskEvaluation",
    "| `TransformationMatrix` | Analytics |",
  ]) {
    assert.doesNotThrow(() => assertNoCompatibilityArtifacts(unrelated));
  }
});
