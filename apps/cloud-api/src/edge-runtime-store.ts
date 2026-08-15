import {
  EDGE_CLOUD_CONTRACT_VERSION,
  type EdgeAsset,
  type EdgeEvidence,
  type EdgeManifest,
  type EdgeTelemetryEvent,
  canonicalEdgeJson,
  sha256,
} from "../../../packages/edge-runtime/src/cloud-contracts.ts";

export interface EdgeRuntimeStore {
  manifest(campaignId: string): EdgeManifest | undefined;
  asset(assetId: string): EdgeAsset | undefined;
  acceptTelemetry(value: unknown): void;
  acceptEvidence(value: unknown): void;
  telemetryEvents(): readonly EdgeTelemetryEvent[];
  evidenceRecords(): readonly EdgeEvidence[];
}

export class InMemoryEdgeRuntimeStore implements EdgeRuntimeStore {
  readonly #manifest: EdgeManifest;
  readonly #asset: EdgeAsset;
  readonly #telemetry = new Map<string, EdgeTelemetryEvent>();
  readonly #evidence = new Map<string, EdgeEvidence>();

  constructor(manifest: EdgeManifest, asset: EdgeAsset) {
    if (manifest.assetId !== asset.assetId || manifest.creativeId !== asset.creativeId) {
      throw new Error("Edge Runtime fixture manifest and asset do not match");
    }
    this.#manifest = manifest;
    this.#asset = asset;
  }

  manifest(campaignId: string): EdgeManifest | undefined {
    return campaignId === this.#manifest.campaignId ? this.#manifest : undefined;
  }

  asset(assetId: string): EdgeAsset | undefined {
    return assetId === this.#asset.assetId ? this.#asset : undefined;
  }

  acceptTelemetry(value: unknown): void {
    const event = parseTelemetry(value);
    const previous = this.#telemetry.get(event.eventId);
    if (previous !== undefined && JSON.stringify(previous) !== JSON.stringify(event)) {
      throw new Error("telemetry event identity conflict");
    }
    this.#telemetry.set(event.eventId, event);
  }

  acceptEvidence(value: unknown): void {
    const evidence = parseEvidence(value);
    const previous = this.#evidence.get(evidence.evidenceId);
    if (previous !== undefined && JSON.stringify(previous) !== JSON.stringify(evidence)) {
      throw new Error("evidence identity conflict");
    }
    this.#evidence.set(evidence.evidenceId, evidence);
  }

  telemetryEvents(): readonly EdgeTelemetryEvent[] {
    return [...this.#telemetry.values()];
  }

  evidenceRecords(): readonly EdgeEvidence[] {
    return [...this.#evidence.values()];
  }
}

export function createEdgeRuntimeFixtureStore(campaignId: string): InMemoryEdgeRuntimeStore {
  if (campaignId.trim().length === 0) throw new Error("Edge Runtime fixture campaign is required");
  const creativeId = `${campaignId}:creative`;
  const assetId = `${campaignId}:asset`;
  const content = `<main data-mostarda-creative="${creativeId}"><h1>Mostarda</h1><p>Mídia diferente.</p></main>`;
  const asset: EdgeAsset = {
    contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
    assetId,
    creativeId,
    mediaType: "text/html",
    content,
    digest: sha256(content),
  };
  const manifest: EdgeManifest = {
    contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
    campaignId,
    creativeId,
    version: "manifest-edge-v1",
    durationSeconds: 1,
    assetId,
    playbackIdentity: { campaignId, creativeId },
  };
  return new InMemoryEdgeRuntimeStore(manifest, asset);
}

function parseTelemetry(value: unknown): EdgeTelemetryEvent {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid Edge telemetry event");
  const event = value as Partial<EdgeTelemetryEvent>;
  if (event.contractVersion !== EDGE_CLOUD_CONTRACT_VERSION || typeof event.eventId !== "string" || typeof event.type !== "string" || typeof event.edgeId !== "string") {
    throw new Error("invalid Edge telemetry event");
  }
  return event as EdgeTelemetryEvent;
}

function parseEvidence(value: unknown): EdgeEvidence {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid Edge evidence");
  const evidence = value as Partial<EdgeEvidence>;
  if (evidence.contractVersion !== EDGE_CLOUD_CONTRACT_VERSION || typeof evidence.evidenceId !== "string" || evidence.audienceClaim !== false) {
    throw new Error("invalid Edge evidence");
  }
  const unsigned = { ...evidence } as Record<string, unknown>;
  delete unsigned.evidenceId;
  delete unsigned.evidenceHash;
  if (typeof evidence.evidenceHash !== "string" || sha256(canonicalEdgeJson(unsigned)) !== evidence.evidenceHash) {
    throw new Error("Edge evidence integrity check failed");
  }
  return evidence as EdgeEvidence;
}
