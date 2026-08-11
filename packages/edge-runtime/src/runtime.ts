import {
  EDGE_CLOUD_CONTRACT_VERSION,
  createEdgeEvidence,
  sha256,
  type EdgeCloudClient,
  type EdgeEnvironment,
  type EdgePlayback,
  type EdgeTelemetryEvent,
} from "./cloud-contracts.ts";
import type { EdgeRuntimeSettings } from "./config.ts";
import {
  JsonEdgeStorage,
  type EdgeRuntimeIdentity,
  type EdgeRuntimeState,
} from "./storage.ts";

export type EdgeHealth =
  | "BOOTING"
  | "READY"
  | "SYNCING"
  | "PLAYING"
  | "OFFLINE"
  | "DEGRADED"
  | "ERROR";

export interface EdgeRuntimeClock {
  next(): string;
}

export class SystemEdgeRuntimeClock implements EdgeRuntimeClock {
  next(): string {
    return new Date().toISOString();
  }
}

export interface EdgeRuntimeConfig {
  readonly edgeId: string;
  readonly environment: EdgeEnvironment;
  readonly storage: JsonEdgeStorage;
  readonly cloud: EdgeCloudClient;
  /** External settings are validated before they reach the runtime; the HTTP transport remains injected. */
  readonly settings?: EdgeRuntimeSettings;
  readonly clock?: EdgeRuntimeClock;
  readonly runtimeVersion?: string;
  readonly maxAttempts?: number;
}

export interface EdgeRuntimeDiagnostics {
  readonly edgeId: string;
  readonly runtimeVersion: string;
  readonly environment: EdgeRuntimeIdentity["environment"];
  readonly manifestCached: boolean;
  readonly assetCached: boolean;
  readonly queueSize: number;
  readonly evidenceQueueSize: number;
  readonly cloudStatus: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  readonly playerStatus: "IDLE" | "PLAYING" | "COMPLETED" | "UNKNOWN";
  readonly lastSync?: string;
  readonly lastPlayback?: string;
  readonly health: EdgeHealth;
}

export class RealEdgeRuntime {
  readonly #config: EdgeRuntimeConfig;
  readonly #clock: EdgeRuntimeClock;
  readonly #runtimeVersion: string;
  #state: EdgeRuntimeState | undefined;
  #health: EdgeHealth = "BOOTING";
  #started = false;
  #lastSync: string | undefined;
  #lastPlayback: EdgePlayback | undefined;

  constructor(config: EdgeRuntimeConfig) {
    if (config.edgeId.trim().length === 0) throw new Error("edge identity is required");
    if (config.settings !== undefined && (config.settings.edgeId !== config.edgeId || config.settings.environment !== config.environment)) {
      throw new Error("external Edge Runtime settings do not match identity/environment");
    }
    this.#config = config;
    this.#clock = config.clock ?? new SystemEdgeRuntimeClock();
    this.#runtimeVersion = config.runtimeVersion ?? "edge-runtime-dev-1";
  }

  async start(): Promise<void> {
    const state = await this.#load();
    const createdAt = this.#clock.next();
    const identity = state.identity ?? {
      edgeId: this.#config.edgeId,
      environment: this.#config.environment,
      createdAt,
    };
    if (identity.edgeId !== this.#config.edgeId) {
      throw new Error("persistent Edge identity does not match configuration");
    }
    const identityCreated = state.identity === undefined;
    this.#state = { ...state, identity };
    this.#started = true;
    this.#health = "READY";
    if (identityCreated) {
      this.#enqueue({
        contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
        eventId: `${this.#config.edgeId}:edge.started`,
        type: "edge.started",
        edgeId: this.#config.edgeId,
        environment: this.#config.environment,
        occurredAt: createdAt,
        payload: { mode: "real-runtime" },
      });
      await this.#save();
    }
  }

  async sync(campaignId: string): Promise<void> {
    if (campaignId.trim().length === 0) throw new Error("campaign identity is required for sync");
    await this.#requireStarted();
    this.#health = "SYNCING";
    try {
      const manifest = await this.#withRetry(() => this.#config.cloud.fetchManifest(campaignId));
      const asset = await this.#withRetry(() => this.#config.cloud.fetchAsset(manifest.assetId));
      if (sha256(asset.content) !== asset.digest) throw new Error("asset integrity check failed");
      if (asset.creativeId !== manifest.creativeId) throw new Error("asset identity does not match manifest");
      if (manifest.playbackIdentity.campaignId !== manifest.campaignId || manifest.playbackIdentity.creativeId !== manifest.creativeId) {
        throw new Error("manifest playback identity does not match manifest");
      }
      this.#state = { ...this.#state, manifest, asset } as EdgeRuntimeState;
      this.#lastSync = this.#clock.next();
      this.#enqueue({
        contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
        eventId: `${this.#config.edgeId}:manifest.synced:${manifest.version}`,
        type: "manifest.synced",
        edgeId: this.#config.edgeId,
        environment: this.#config.environment,
        occurredAt: this.#lastSync,
        campaignId: manifest.campaignId,
        creativeId: manifest.creativeId,
        manifestVersion: manifest.version,
        payload: { assetId: asset.assetId },
      });
      await this.#save();
      this.#health = "READY";
    } catch (error) {
      this.#health = "OFFLINE";
      throw error;
    }
  }

  async playCached(): Promise<EdgePlayback> {
    await this.#requireStarted();
    const state = await this.#load();
    if (state.manifest === undefined || state.asset === undefined) {
      this.#health = "DEGRADED";
      throw new Error("no validated local content is available");
    }
    if (sha256(state.asset.content) !== state.asset.digest) {
      this.#health = "ERROR";
      throw new Error("cached asset integrity check failed");
    }
    this.#health = "PLAYING";
    const startedAt = this.#clock.next();
    const completedAt = this.#clock.next();
    const sequence = state.playbackSequence + 1;
    const playbackId = `${this.#config.edgeId}:${state.manifest.version}:playback-${sequence}`;
    const playback: EdgePlayback = {
      contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
      playbackId,
      edgeId: this.#config.edgeId,
      environment: this.#config.environment,
      campaignId: state.manifest.campaignId,
      creativeId: state.manifest.creativeId,
      manifestVersion: state.manifest.version,
      startedAt,
      completedAt,
      durationSeconds: state.manifest.durationSeconds,
      status: "COMPLETED",
    };
    const common = {
      contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
      edgeId: this.#config.edgeId,
      environment: this.#config.environment,
      campaignId: state.manifest.campaignId,
      creativeId: state.manifest.creativeId,
      playbackId,
      manifestVersion: state.manifest.version,
    };
    this.#state = {
      ...state,
      playbackSequence: sequence,
      playback,
      telemetryQueue: [
        ...state.telemetryQueue,
        { ...common, eventId: `${playbackId}:player.started`, type: "player.started", occurredAt: startedAt, payload: { assetId: state.asset.assetId } },
        { ...common, eventId: `${playbackId}:playback.started`, type: "playback.started", occurredAt: startedAt, payload: { assetId: state.asset.assetId } },
        { ...common, eventId: `${playbackId}:playback.completed`, type: "playback.completed", occurredAt: completedAt, payload: { durationSeconds: state.manifest.durationSeconds } },
      ],
      evidenceQueue: [...state.evidenceQueue, createEdgeEvidence(playback)],
    };
    this.#lastPlayback = playback;
    await this.#save();
    this.#health = "READY";
    return playback;
  }

  async flush(): Promise<void> {
    await this.#requireStarted();
    const state = await this.#load();
    const telemetry = [...state.telemetryQueue];
    const evidence = [...state.evidenceQueue];
    if (telemetry.length === 0 && evidence.length === 0) return;
    try {
      for (const event of telemetry) await this.#withRetry(() => this.#config.cloud.sendTelemetry(event));
      for (const record of evidence) await this.#withRetry(() => this.#config.cloud.sendEvidence(record));
      if (telemetry.length > 0) {
        const firstEvent = telemetry[0];
        await this.#withRetry(() => this.#config.cloud.sendTelemetry({
          contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
          eventId: `${this.#config.edgeId}:telemetry.sent:${firstEvent?.eventId ?? "none"}`,
          type: "telemetry.sent",
          edgeId: this.#config.edgeId,
          environment: this.#config.environment,
          occurredAt: this.#clock.next(),
          payload: { count: telemetry.length },
        } satisfies EdgeTelemetryEvent));
      }
      this.#state = { ...state, telemetryQueue: [], evidenceQueue: [] };
      await this.#save();
      this.#health = "READY";
    } catch (error) {
      this.#health = "OFFLINE";
      throw error;
    }
  }

  async diagnostics(): Promise<EdgeRuntimeDiagnostics> {
    const state = await this.#load();
    let cloudStatus: EdgeRuntimeDiagnostics["cloudStatus"] = "UNKNOWN";
    try {
      cloudStatus = (await this.#config.cloud.health()) ? "AVAILABLE" : "UNAVAILABLE";
    } catch {
      cloudStatus = "UNAVAILABLE";
    }
    return {
      edgeId: this.#config.edgeId,
      runtimeVersion: this.#runtimeVersion,
      environment: this.#config.environment,
      manifestCached: state.manifest !== undefined,
      assetCached: state.asset !== undefined,
      queueSize: state.telemetryQueue.length,
      evidenceQueueSize: state.evidenceQueue.length,
      cloudStatus,
      playerStatus: this.#lastPlayback === undefined ? "IDLE" : "COMPLETED",
      ...(this.#lastSync === undefined ? {} : { lastSync: this.#lastSync }),
      ...(state.playback === undefined ? {} : { lastPlayback: state.playback.completedAt }),
      health: this.#health,
    };
  }

  async #load(): Promise<EdgeRuntimeState> {
    this.#state ??= await this.#config.storage.load();
    return this.#state;
  }

  async #save(): Promise<void> {
    await this.#config.storage.save(await this.#load());
  }

  async #requireStarted(): Promise<void> {
    if (!this.#started) await this.start();
  }

  #enqueue(event: EdgeTelemetryEvent): void {
    if (this.#state === undefined) throw new Error("runtime state is not loaded");
    this.#state = { ...this.#state, telemetryQueue: [...this.#state.telemetryQueue, event] };
  }

  async #withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    const maxAttempts = this.#config.maxAttempts ?? this.#config.settings?.telemetryRetry.maxAttempts ?? 1;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Cloud request failed");
  }
}
