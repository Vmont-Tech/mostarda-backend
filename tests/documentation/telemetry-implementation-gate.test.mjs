import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const docs = {
  decisionRegistry: new URL(
    "../../docs/specification/DECISION_REGISTRY.md",
    import.meta.url,
  ),
  platform: new URL(
    "../../docs/specification/PLATFORM_SPECIFICATION.md",
    import.meta.url,
  ),
  telemetry: new URL("../../docs/domain/TELEMETRY.md", import.meta.url),
  ownership: new URL("../../docs/domain/OWNERSHIP.md", import.meta.url),
  events: new URL("../../docs/domain/DOMAIN_EVENTS.md", import.meta.url),
  pricing: new URL("../../docs/domain/PRICING_ENGINE.md", import.meta.url),
  edge: new URL("../../docs/tv-network/EDGE_RUNTIME.md", import.meta.url),
  capabilities: new URL("../../docs/domain/CAPABILITIES.md", import.meta.url),
  aggregates: new URL("../../docs/domain/AGGREGATES.md", import.meta.url),
  contexts: new URL("../../docs/domain/BOUNDED_CONTEXTS.md", import.meta.url),
  assets: new URL("../../docs/domain/ASSETS.md", import.meta.url),
  implementationGate: new URL(
    "../../docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md",
    import.meta.url,
  ),
};

test("Telemetry implementation gate mechanically closes every READY artifact", async () => {
  const gate = await read("implementationGate");
  const requiredHeadings = [
    "Unique owner",
    "Conceptual schema v1",
    "Error codes",
    "Lifecycle and terminality",
    "Replay and rebuild",
    "Producer",
    "Compatibility and version evolution",
    "Dependencies",
    "Required tests",
  ];
  const ready = JSON.parse(gate.match(/^READY_MANIFEST: (\[[^\n]+\])$/m)?.[1] ?? "null");
  assert.ok(Array.isArray(ready));
  const artifactStarts = [...gate.matchAll(/^## Artifact: ([^\n]+)$/gm)];
  for (const artifact of ready) {
    const current = artifactStarts.find((match) => match[1] === artifact);
    const next = artifactStarts.find((match) => (match.index ?? 0) > (current?.index ?? Infinity));
    const nonReady = gate.indexOf("\n## Non-READY", current?.index);
    const end = next?.index ?? (nonReady >= 0 ? nonReady : gate.length);
    const section = current ? gate.slice((current.index ?? 0) + current[0].length, end) : undefined;
    assert.ok(section, `missing bounded certification section for ${artifact}`);
    assert.match(section, /Status: `IMPLEMENTATION_READY`/);
    for (const heading of requiredHeadings) {
      const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.match(
        section,
        new RegExp(`^### ${escaped}\\n(?=\\S)`, "m"),
        `${artifact}: ${heading} must be non-empty`,
      );
    }
  }
  assert.doesNotMatch(gate, /\b(?:TBD|TODO|placeholder)\b/i);
  assert.doesNotMatch(gate, /AudienceProjectionApplier[^\n]*IMPLEMENTATION_READY/);
});

test("Telemetry gate explicitly excludes infrastructure and uncertified contracts", async () => {
  const gate = await read("implementationGate");
  for (const excluded of [
    "adapters",
    "ingestion services",
    "API",
    "repositories",
    "topics",
    "brokers",
  ]) {
    assert.match(gate, new RegExp(`not authorized[^\\n]*${excluded}`, "i"));
  }
  assert.match(gate, /TelemetryCaptured[^\n]*IMPLEMENTATION_PARTIAL/);
  assert.match(gate, /TelemetryBucketClosed[^\n]*IMPLEMENTATION_PARTIAL/);
});

test("PARTIAL composites retain independent blockers after version identity recertification", async () => {
  const gate = await read("implementationGate");
  const blockers = new Map([
    ["TelemetryBucket", ["complete construction error contract"]],
    ["TelemetryBucketAccepted", ["TelemetryBucket"]],
    ["TelemetryBucketRejected", ["complete rejection compatibility evaluation contract"]],
    ["AudienceProjection", ["projection builder", "complete compatibility evaluation contract"]],
  ]);

  for (const [artifact, dependencies] of blockers) {
    const start = gate.indexOf(`## Artifact: ${artifact}\n`);
    assert.notEqual(start, -1, `missing ${artifact} section`);
    const dependenciesStart = gate.indexOf("### Dependencies\n", start);
    const dependenciesEnd = gate.indexOf("\n### Required tests", dependenciesStart);
    const section = gate.slice(dependenciesStart, dependenciesEnd);
    assert.doesNotMatch(section, /\bREADY\b/, `${artifact} has stale READY dependency claim`);
    assert.match(section, /blocked/i);
    for (const dependency of dependencies) {
      assert.match(section, new RegExp(`\\b${dependency}\\b`), `${artifact} must name ${dependency}`);
    }
  }
});

test("six READY version identities exclude compatibility evaluation", async () => {
  const gate = await read("implementationGate");
  const versions = [
    "TelemetrySchemaVersion",
    "CollectorVersion",
    "CapabilityVersion",
    "CollectionPolicyVersion",
    "AudienceProjectionVersion",
    "AudienceProjectionPolicyVersion",
  ];
  for (const artifact of versions) {
    const start = gate.indexOf(`## Artifact: ${artifact}\n`);
    assert.notEqual(start, -1);
    const end = gate.indexOf("\n## Artifact:", start + 1);
    const section = gate.slice(start, end === -1 ? gate.length : end);
    assert.match(section, /Status: `IMPLEMENTATION_READY`/);
    assert.match(section, /VersionValue/);
    assert.match(section, /producer-defined `VersionSyntax` and canonical representation/i);
    assert.match(section, /invalid identity representation/i);
    assert.doesNotMatch(section, /`UNSUPPORTED_[A-Z_]+`/);
    assert.match(section, /no normalization, coercion, or ordering/i);
    assert.match(section, /preserves? the exact/i);
    assert.match(section, /compatibility evaluation is excluded.*consumer-owned/is);
  }
});

const read = (name) => readFile(docs[name], "utf8");

test("DEC-063 certifies the complete Telemetry authority boundary", async () => {
  const [registry, platform] = await Promise.all([
    read("decisionRegistry"),
    read("platform"),
  ]);
  const decision = registry
    .split(/\r?\n/)
    .find((line) => line.includes("`DEC-063`"));

  assert.ok(decision, "DEC-063 must exist in the decision registry");
  assert.match(decision, /Telemetry Context.*accepted observations.*Telemetry Ledger.*AudienceProjection/i);
  assert.match(decision, /immutable civil-minute buckets/i);
  assert.match(decision, /five-minute batch/i);
  assert.match(decision, /rolling fifteen-minute/i);
  assert.match(decision, /only new (?:Pricing)?Quotes? may consume/i);
  assert.match(decision, /QR.*NFC.*bypass Edge/i);
  assert.match(decision, /optional collectors.*degrade explicitly/i);
  assert.match(decision, /Evidence Ledger alone materializes EvidenceRecord/i);
  assert.match(platform, /### SPEC-TEL-001[^\n]*`DEC-063`/i);
  assert.match(platform, /`DEC-063` governa esta sincronização:[^\n]*Telemetry Context/i);
});

test("Telemetry is the unique owner and AudienceProjection stays internal", async () => {
  const [telemetry, ownership, platform] = await Promise.all([
    read("telemetry"),
    read("ownership"),
    read("platform"),
  ]);
  assert.match(ownership, /Telemetry Ledger[^\n]*\*\*Telemetry Context\*\*/i);
  assert.match(ownership, /AudienceProjection[^\n]*\*\*Telemetry Context\*\*/i);
  assert.doesNotMatch(ownership, /\|\s*Telemetria\s*\|\s*\*\*Edge\*\*/i);
  assert.match(telemetry, /AudienceProjection[^\n]*internal Telemetry projection/i);
  assert.match(telemetry, /does not introduce an Audience Bounded Context/i);
  assert.match(platform, /AudienceProjection[^\n]*internal Telemetry projection/i);
  assert.match(platform, /não introduz Audience Bounded Context/i);
});

test("Telemetry and Audience cannot materialize Evidence", async () => {
  const [telemetry, platform, events] = await Promise.all([
    read("telemetry"),
    read("platform"),
    read("events"),
  ]);

  for (const document of [telemetry, platform, events]) {
    assert.match(document, /Evidence Ledger alone materializes EvidenceRecord/i);
    assert.match(document, /Edge\/Playback produces authoritative playback facts[^\n]*PlaybackEvent[^\n]*PlaybackSignature/i);
  }
  assert.match(telemetry, /Telemetry and Audience cannot materialize Evidence/i);
  assert.match(platform, /Telemetry e Audience nunca criam Evidence/i);
  assert.match(events, /Telemetry e AudienceProjection nunca produzem Evidence/i);
});

test("accepted telemetry never changes an existing commercial commitment", async () => {
  const documents = await Promise.all([
    read("telemetry"),
    read("platform"),
    read("pricing"),
  ]);
  for (const document of documents) {
    assert.match(document, /applied (?:Pricing)?Quotes? remain unchanged/i);
    assert.match(document, /InventoryHolds? remain unchanged/i);
    assert.match(document, /reserved or sold Slots remain unchanged/i);
    assert.match(document, /prices remain unchanged/i);
  }
});

test("optional Wi-Fi and camera collectors report degradation without stopping playback", async () => {
  const telemetry = await read("telemetry");
  const edge = await read("edge");
  for (const document of [telemetry, edge]) {
    assert.match(document, /Wi-Fi and camera absence or failure is explicitly reported/i);
    assert.match(document, /playback continues/i);
    assert.match(
      document,
      /`AVAILABLE`[^\n]*`UNAVAILABLE`[^\n]*`DISABLED`[^\n]*`DEGRADED`[^\n]*`FAILED`/i,
    );
  }
});

test("minute buckets, batching, projection window, and QR or NFC routing are explicit", async () => {
  const [telemetry, edge, platform] = await Promise.all([
    read("telemetry"),
    read("edge"),
    read("platform"),
  ]);
  assert.match(telemetry, /one-minute bucket[^\n]*immutable/i);
  assert.match(telemetry, /five-minute batch/i);
  assert.match(telemetry, /rolling fifteen-minute observation window/i);
  assert.match(telemetry, /only new PricingQuotes may consume/i);
  assert.match(telemetry, /QR and NFC bypass Edge/i);
  assert.match(telemetry, /Edge only renders QR/i);
  assert.match(telemetry, /optional collectors degrade explicitly/i);
  assert.match(edge, /one-minute bucket[^\n]*immutable/i);
  assert.match(edge, /five-minute batch/i);
  assert.match(edge, /QR and NFC bypass Edge/i);
  assert.match(edge, /Edge only renders QR/i);
  assert.match(platform, /Buckets imutáveis de um minuto[^\n]*batches de cinco minutos/i);
  assert.match(platform, /janela móvel de quinze minutos/i);
  assert.match(platform, /Somente novos `PricingQuote` podem consumir/i);
  assert.match(platform, /QR and NFC bypass Edge/i);
});

test("the nine telemetry event families have unambiguous producers", async () => {
  const events = await read("events");
  const requiredEvents = [
    "TelemetryCaptured",
    "TelemetryBucketClosed",
    "TelemetryBucketAccepted",
    "TelemetryBucketRejected",
    "AudienceProjectionProduced",
    "AudienceProjectionExpired",
    "AudienceProjectionInvalidated",
    "TelemetryCapabilityChanged",
    "TelemetryIncidentReported",
  ];

  for (const event of requiredEvents) {
    assert.match(events, new RegExp(`\\b${event}\\b`));
  }

  assert.match(events, /each concrete event type[^\n]*one authoritative producer/i);
  assert.match(events, /`EdgeTelemetryIncidentReported`[^\n]*Edge Runtime/i);
  assert.match(events, /`TelemetryValidationIncidentReported`[^\n]*Telemetry Context/i);
  assert.match(events, /`EdgeTelemetryCapabilityChanged`[^\n]*Edge Runtime/i);
  assert.doesNotMatch(events, /\bTvCapabilityChanged\b/);
  for (const event of [
    "CapabilityDeclared",
    "CapabilityValidated",
    "CapabilityRejected",
    "CapabilityActivated",
    "CapabilityDegraded",
    "CapabilitySuspended",
    "CapabilityRecovered",
    "CapabilityRetired",
  ]) {
    assert.match(
      events,
      new RegExp(`TelemetryCapabilityChanged[^\\n]*${event}`, "is"),
    );
  }
  assert.doesNotMatch(
    events,
    /`TelemetryIncidentReported`[^\n]*(?:Edge Runtime\s*(?:\/|or|e)\s*Telemetry Context|Edge\s*(?:\/|or|e)\s*Telemetry)/i,
  );
});

test("telemetry semantic versions remain independent", async () => {
  const telemetry = await read("telemetry");
  const versions = [
    "TelemetrySchemaVersion",
    "CollectorVersion",
    "CapabilityVersion",
    "CollectionPolicyVersion",
    "AudienceProjectionVersion",
    "AudienceProjectionPolicyVersion",
    "PricingPolicyVersion",
  ];

  for (const version of versions) {
    assert.match(telemetry, new RegExp(`\\b${version}\\b`));
  }

  assert.match(telemetry, /versions are independent/i);
  assert.match(telemetry, /must never be collapsed into a generic `version`/i);
  assert.doesNotMatch(telemetry, /independent e versions are independent entre si/i);
});

test("active domain catalogs are synchronized to DEC-063", async () => {
  const [capabilities, aggregates, contexts, assets] = await Promise.all([
    read("capabilities"),
    read("aggregates"),
    read("contexts"),
    read("assets"),
  ]);
  const obsoleteEvents = /PresenceUpdated|DwellTimeUpdated|OccupancyChanged|HeatMapGenerated|PeakHourDetected|MovementPatternUpdated|TelemetryBatchSubmitted|TelemetryGapDetected/;

  for (const document of [capabilities, aggregates, contexts, assets]) {
    assert.match(document, /`DEC-063`/);
  }
  assert.match(capabilities, /TelemetryCaptured[^\n]*TelemetryBucketClosed/i);
  assert.doesNotMatch(capabilities, obsoleteEvents);
  assert.doesNotMatch(capabilities, /Health Monitoring de audiência/i);
  assert.match(aggregates, /## Telemetry Ledger Aggregate — contexto Telemetry/i);
  assert.match(aggregates, /\*\*Root:\*\* `TelemetryLedger`; owner exclusivo: Telemetry Context/i);
  assert.match(aggregates, /AudienceProjection[^\n]*Telemetry Context/i);
  assert.doesNotMatch(aggregates, obsoleteEvents);
  assert.doesNotMatch(aggregates, /TelemetrySeries Aggregate/i);
  assert.doesNotMatch(aggregates, /TVCapability Aggregate — contexto Edge Runtime/i);
  assert.match(aggregates, /TVCapability Aggregate — contexto TV Network/i);
  assert.match(contexts, /accepted observations[^\n]*Telemetry Ledger[^\n]*AudienceProjection/i);
  assert.doesNotMatch(contexts, /saúde em tempo real \(Telemetry\)/i);
  assert.match(contexts, /Heartbeat[^\n]*TV Network|Device Health[^\n]*TV Network/i);
  assert.match(assets, /Telemetry Ledger[^\n]*Telemetry Context/i);
  assert.match(assets, /AudienceProjection[^\n]*Telemetry Context/i);
  assert.doesNotMatch(assets, /Confidence Score[^\n]*\| Edge \| Edge \| durável/i);
  assert.doesNotMatch(assets, /Current Occupancy[^\n]*\| Telemetry \| Cloud \| durável/i);
});
