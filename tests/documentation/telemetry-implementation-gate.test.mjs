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
};

const read = (name) => readFile(docs[name], "utf8");

test("DEC-063 certifies the Telemetry authority boundary", async () => {
  const registry = await read("decisionRegistry");

  assert.match(registry, /`DEC-063`/);
  assert.match(
    registry,
    /Telemetry Context.*accepted observations.*Telemetry Ledger.*AudienceProjection/is,
  );
});

test("Telemetry is the unique owner and AudienceProjection stays internal", async () => {
  const [telemetry, ownership, platform] = await Promise.all([
    read("telemetry"),
    read("ownership"),
    read("platform"),
  ]);
  const corpus = `${telemetry}\n${ownership}\n${platform}`;

  assert.match(ownership, /Telemetry Ledger[^\n]*\*\*Telemetry Context\*\*/i);
  assert.match(ownership, /AudienceProjection[^\n]*\*\*Telemetry Context\*\*/i);
  assert.doesNotMatch(ownership, /\|\s*Telemetria\s*\|\s*\*\*Edge\*\*/i);
  assert.match(corpus, /AudienceProjection.*internal.*Telemetry (?:projection|read artifact)/is);
  assert.match(corpus, /does not introduce an Audience Bounded Context/i);
});

test("Telemetry and Audience cannot materialize Evidence", async () => {
  const corpus = (
    await Promise.all([read("telemetry"), read("platform"), read("events")])
  ).join("\n");

  assert.match(corpus, /Evidence Ledger alone materializes EvidenceRecord/i);
  assert.match(corpus, /Telemetry (?:and|or) Audience.*(?:never|must not|cannot).*Evidence/is);
  assert.match(corpus, /PlaybackEvent.*PlaybackSignature.*Evidence Ledger/is);
});

test("minute buckets, batching, projection window, and QR or NFC routing are explicit", async () => {
  const [telemetry, edge, platform] = await Promise.all([
    read("telemetry"),
    read("edge"),
    read("platform"),
  ]);
  const corpus = `${telemetry}\n${edge}\n${platform}`;

  assert.match(corpus, /one-minute bucket.*immutable/is);
  assert.match(corpus, /five-minute batch/is);
  assert.match(corpus, /rolling fifteen-minute (?:observation )?window/i);
  assert.match(corpus, /only new (?:Pricing)?Quotes? may consume/i);
  assert.match(corpus, /QR.*NFC.*bypass Edge/is);
  assert.match(corpus, /Edge only renders QR/i);
  assert.match(corpus, /optional collectors.*degrade explicitly/is);
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

  assert.match(events, /each concrete event type.*one authoritative producer/is);
  assert.match(events, /EdgeTelemetryIncidentReported/is);
  assert.match(events, /TelemetryValidationIncidentReported/is);
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
});
