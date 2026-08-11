import {
  type DemoAsset,
  type DemoCampaign,
  type DemoEvidence,
  type DemoManifest,
  type DemoTelemetryEvent,
  canonicalJson,
  createDemoAsset,
  createDemoCampaign,
  createDemoManifest,
  sha256,
} from "./contracts.ts";

const DEMO_EVENT_TYPES = new Set([
  "edge.started",
  "manifest.synced",
  "player.started",
  "playback.started",
  "playback.completed",
  "telemetry.sent",
]);

function objectValue(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("demo payload must be an object");
  }
  return value as Record<string, unknown>;
}

function parseTelemetry(value: unknown): DemoTelemetryEvent {
  const event = objectValue(value);
  if (event.contractOrigin !== "ADAPTER" || typeof event.eventId !== "string" || typeof event.type !== "string" || !DEMO_EVENT_TYPES.has(event.type) || typeof event.edgeId !== "string" || typeof event.occurredAt !== "string" || event.environment !== "DEVELOPMENT_SIMULATION") {
    throw new Error("invalid demo telemetry event");
  }
  return event as unknown as DemoTelemetryEvent;
}

function parseEvidence(value: unknown): DemoEvidence {
  const evidence = objectValue(value);
  if (evidence.contractOrigin !== "ADAPTER" || evidence.environment !== "DEVELOPMENT_SIMULATION" || evidence.evidenceKind !== "PLAYBACK_EXECUTION_OBSERVATION" || evidence.status !== "PLAYBACK_COMPLETED" || evidence.audienceClaim !== false || typeof evidence.evidenceId !== "string" || typeof evidence.evidenceHash !== "string") {
    throw new Error("invalid demo evidence");
  }
  const unsigned = { ...evidence };
  delete unsigned.evidenceId;
  delete unsigned.evidenceHash;
  if (sha256(canonicalJson(unsigned)) !== evidence.evidenceHash) {
    throw new Error("demo evidence integrity check failed");
  }
  return evidence as unknown as DemoEvidence;
}

export class DemoCloudStore {
  readonly #campaign = createDemoCampaign();
  readonly #manifest = createDemoManifest();
  readonly #asset = createDemoAsset();
  readonly #telemetry = new Map<string, DemoTelemetryEvent>();
  readonly #evidence = new Map<string, DemoEvidence>();

  campaign(): DemoCampaign {
    return structuredClone(this.#campaign);
  }

  manifest(campaignId: string): DemoManifest | undefined {
    return campaignId === this.#manifest.campaignId
      ? structuredClone(this.#manifest)
      : undefined;
  }

  asset(assetId: string): DemoAsset | undefined {
    return assetId === this.#asset.assetId ? structuredClone(this.#asset) : undefined;
  }

  acceptTelemetry(value: unknown): void {
    const event = parseTelemetry(value);
    const previous = this.#telemetry.get(event.eventId);
    if (previous !== undefined && canonicalJson(previous) !== canonicalJson(event)) {
      throw new Error(`telemetry event conflict: ${event.eventId}`);
    }
    this.#telemetry.set(event.eventId, structuredClone(event));
  }

  acceptEvidence(value: unknown): void {
    const evidence = parseEvidence(value);
    const previous = this.#evidence.get(evidence.evidenceId);
    if (previous !== undefined && canonicalJson(previous) !== canonicalJson(evidence)) {
      throw new Error(`evidence conflict: ${evidence.evidenceId}`);
    }
    if (evidence.audienceClaim !== false) {
      throw new Error("development evidence cannot assert audience");
    }
    this.#evidence.set(evidence.evidenceId, structuredClone(evidence));
  }

  telemetryEvents(): readonly DemoTelemetryEvent[] {
    return [...this.#telemetry.values()].map((event) => structuredClone(event));
  }

  evidenceRecords(): readonly DemoEvidence[] {
    return [...this.#evidence.values()].map((evidence) => structuredClone(evidence));
  }
}
