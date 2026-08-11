import {
  DEMO_ENVIRONMENT,
  DEMO_EDGE_ID,
  type DemoAsset,
  type DemoEvidence,
  type DemoManifest,
  type DemoPlayback,
  type DemoTelemetryEvent,
  createEvidence,
  sha256,
} from "./contracts.ts";
import { DeterministicPlayer, type PlayerClock } from "./player.ts";

export interface DemoHttpResponse {
  readonly statusCode: number;
  json<T>(): T;
}

export interface DemoCloudClient {
  get(path: string): Promise<DemoHttpResponse>;
  post(path: string, payload: unknown): Promise<DemoHttpResponse>;
}

export interface EdgeLocalState {
  readonly manifestCached: boolean;
  readonly assetCached: boolean;
  readonly queuedTelemetry: number;
  readonly queuedEvidence: number;
}

export class SimulatedEdge {
  readonly #edgeId: string;
  readonly #cloud: DemoCloudClient;
  readonly #clock: PlayerClock | undefined;
  readonly #telemetry: DemoTelemetryEvent[] = [];
  readonly #evidence: DemoEvidence[] = [];
  #manifest: DemoManifest | undefined;
  #asset: DemoAsset | undefined;
  #cloudAvailable = true;

  constructor(options: { edgeId?: string; cloud: DemoCloudClient; clock?: PlayerClock }) {
    this.#edgeId = options.edgeId ?? DEMO_EDGE_ID;
    this.#cloud = options.cloud;
    this.#clock = options.clock;
  }

  async start(): Promise<void> {
    this.#enqueue({
      environment: DEMO_ENVIRONMENT,
      eventId: `${this.#edgeId}:edge.started`,
      type: "edge.started",
      edgeId: this.#edgeId,
      occurredAt: "2026-08-11T12:00:00.000Z",
      payload: { mode: "simulated" },
    });
  }

  async sync(): Promise<void> {
    const manifestResponse = await this.#get(`/v1/demo/manifests/campaign-demo-001`);
    if (manifestResponse.statusCode !== 200) throw new Error("manifest sync failed");
    this.#manifest = manifestResponse.json<DemoManifest>();
    const assetResponse = await this.#get(`/v1/demo/assets/${this.#manifest.assetId}`);
    if (assetResponse.statusCode !== 200) throw new Error("asset sync failed");
    const asset = assetResponse.json<DemoAsset>();
    if (sha256(asset.content) !== asset.digest) throw new Error("asset integrity check failed");
    if (asset.creativeId !== this.#manifest.creativeId) throw new Error("asset identity does not match manifest");
    this.#asset = asset;
    this.#enqueue({
      environment: DEMO_ENVIRONMENT,
      eventId: `${this.#edgeId}:manifest.synced`,
      type: "manifest.synced",
      edgeId: this.#edgeId,
      occurredAt: "2026-08-11T12:00:00.000Z",
      campaignId: this.#manifest.campaignId,
      creativeId: this.#manifest.creativeId,
      manifestVersion: this.#manifest.version,
      payload: { assetId: this.#asset.assetId },
    });
  }

  async playCached(): Promise<DemoPlayback> {
    if (this.#manifest === undefined || this.#asset === undefined) {
      throw new Error("no validated local content is available");
    }
    const run = new DeterministicPlayer(this.#edgeId, this.#clock ?? undefined).play(this.#manifest, this.#asset);
    this.#telemetry.push(...run.events);
    this.#evidence.push(createEvidence(run.playback));
    return run.playback;
  }

  setCloudAvailability(available: boolean): void {
    this.#cloudAvailable = available;
  }

  async flushTelemetry(): Promise<void> {
    if (!this.#cloudAvailable) return;
    const pending = [...this.#telemetry];
    for (const event of pending) {
      const response = await this.#cloud.post("/v1/demo/telemetry", event);
      if (response.statusCode >= 300) {
        throw new Error(`telemetry delivery failed: ${response.statusCode}`);
      }
    }
    const pendingEvidence = [...this.#evidence];
    for (const evidence of pendingEvidence) {
      const response = await this.#cloud.post("/v1/demo/evidence", evidence);
      if (response.statusCode >= 300) throw new Error(`evidence delivery failed: ${response.statusCode}`);
    }
    if (pending.length > 0) {
      await this.#cloud.post("/v1/demo/telemetry", {
        environment: DEMO_ENVIRONMENT,
        eventId: `${this.#edgeId}:telemetry.sent:${pending[0]?.eventId ?? "none"}`,
        type: "telemetry.sent",
        edgeId: this.#edgeId,
        occurredAt: "2026-08-11T12:00:00.000Z",
        payload: { count: pending.length },
      } satisfies DemoTelemetryEvent);
    }
    this.#telemetry.splice(0, pending.length);
    this.#evidence.splice(0, pendingEvidence.length);
  }

  localState(): EdgeLocalState {
    return {
      manifestCached: this.#manifest !== undefined,
      assetCached: this.#asset !== undefined,
      queuedTelemetry: this.#telemetry.length,
      queuedEvidence: this.#evidence.length,
    };
  }

  async #get(path: string): Promise<DemoHttpResponse> {
    if (!this.#cloudAvailable) throw new Error("cloud unavailable");
    return this.#cloud.get(path);
  }

  #enqueue(event: DemoTelemetryEvent): void {
    this.#telemetry.push(event);
  }
}
