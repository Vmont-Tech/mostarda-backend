import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const paths = {
  compatibility: new URL("../../docs/domain/CONTRACT_COMPATIBILITY.md", import.meta.url),
  decisions: new URL("../../docs/specification/DECISION_REGISTRY.md", import.meta.url),
  platform: new URL("../../docs/specification/PLATFORM_SPECIFICATION.md", import.meta.url),
  tbs: new URL("../../docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md", import.meta.url),
  telemetry: new URL("../../docs/domain/TELEMETRY.md", import.meta.url),
  ownership: new URL("../../docs/domain/OWNERSHIP.md", import.meta.url),
  aggregates: new URL("../../docs/domain/AGGREGATES.md", import.meta.url),
  commands: new URL("../../docs/execution/COMMANDS.md", import.meta.url),
  events: new URL("../../docs/domain/DOMAIN_EVENTS.md", import.meta.url),
};

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

const contradictions = [
  /\bproducer(?: contract| context| system| component| artifact owner)?\s+(?:declares|controls|decides|determines|owns)[^.\n]*(?:consumer )?compatibility/i,
  /\bproducer(?: contract| context| system| component| artifact owner)?\s+(?:declares|controls|owns)[^.\n]*compatibility[^.\n]*(?:declaration|decision|support)/i,
  /Configuration Service[^.\n]*(?:publishes|authors|owns|decides|determines|changes)[^.\n]*(?:compatibility )?(?:entry|entries|decision|matrix)/i,
  /(?:global|platform-wide|Mostarda-wide)[^.\n]*compatibility (?:authority|matrix)/i,
  /(?:implicit )?(?:fallback|inheritance|composition)[^.\n]*(?:scope|matrix)|(?:scope|matrix)[^.\n]*(?:implicit )?(?:fallback|inheritance|composition)/i,
  /fifth (?:compatibility |matrix )?state[^.\n]*COMPATIBILITY_NOT_EVALUATED/i,
];

const isExplicitlyNegated = (sentence) =>
  /\b(?:no|not|never|cannot|does not|do not|prohibited|prohibits|without)\b/i.test(sentence);

const assertNoAffirmativeContradictions = (document) => {
  for (const sentence of document.split(/(?<=[.!?])\s+|[;\r\n]+/)) {
    for (const contradiction of contradictions) {
      const match = contradiction.exec(sentence);
      if (match && !isExplicitlyNegated(sentence)) {
        assert.fail(`affirmative compatibility contradiction: ${sentence.trim()}`);
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
});

test("TBS independently defines deterministic observable evaluation behavior", async () => {
  const section = boundedSection(await read("tbs"), "Contract compatibility evaluation");
  assertInOrder(section, ["COMPATIBILITY_SCOPE_NOT_RESOLVED", "MATRIX_NOT_FOUND", "MATRIX_UNAVAILABLE", "MATRIX_CORRUPTED", "MATRIX_VERSION_UNRESOLVABLE", "MATRIX_NOT_EFFECTIVE"]);
  assert.match(section, /first blocking condition/i);
  assert.match(section, /Later stages are not evaluated/i);
  assert.match(section, /valid and effective matrix[^.]*absent[^.]*`UNSUPPORTED \/ ENTRY_NOT_FOUND`/is);
  assert.match(section, /real-time[^.]*current effective revision/i);
  assert.match(section, /replay[^.]*explicitly identified historical revision/i);
  assert.match(section, /retry[^.]*same operation identity/i);
  assert.match(section, /explicit `ResultKind`/);
  assert.match(section, /`DEPRECATED`[^.]*identical functional result[^.]*operational[^.]*observability/i);
  assert.match(section, /`EXPERIMENTAL`[^.]*explicit authorization/i);
  assert.match(section, /output[^.]*marked experimental/i);
  assert.match(section, /cannot replace official (?:results|output)[^.]*consumer-specific normative authority/i);
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
});

test("compatibility authority positively prohibits and catalogs contain no new implementation artifacts", async () => {
  const compatibility = await read("compatibility");
  assert.match(compatibility, /creates no Bounded Context, aggregate, command or event/i);

  const catalogs = await Promise.all([read("aggregates"), read("commands"), read("events")]);
  for (const catalog of catalogs) {
    assert.doesNotMatch(catalog, /`(?:Contract)?Compatibility[A-Za-z]*(?:Aggregate|Command|Event)`/);
    assert.doesNotMatch(catalog, /`(?:Create|Update|Publish|Evaluate|Resolve)[A-Za-z]*Compatibility[A-Za-z]*`/);
    assert.doesNotMatch(catalog, /\|[^\n]*(?:CompatibilityMatrix|CompatibilityEvaluation)[^\n]*\|/i);
  }
});
