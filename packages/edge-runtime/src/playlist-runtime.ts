import path from "node:path";

import {
  type EdgeAsset,
  type EdgeCloudClient,
  type EdgeManifest,
  type EdgePlayback,
} from "./cloud-contracts.ts";
import { JsonEdgeStorage } from "./storage.ts";
import { RealEdgeRuntime, type EdgeRuntimeConfig, type EdgeRuntimeDiagnostics } from "./runtime.ts";

/**
 * Coordinates several existing RealEdgeRuntime instances for a campaign
 * playlist. It is an Edge scheduling adapter: rendering remains the existing
 * Browser Player, while every item retains its campaign/slot/creative identity.
 */
export class EdgePlaylistRuntime {
  readonly #config: EdgePlaylistRuntimeConfig;
  readonly #runtimes = new Map<string, RealEdgeRuntime>();
  #campaignId: string | undefined;

  constructor(config: EdgePlaylistRuntimeConfig) {
    if (config.edgeId.trim().length === 0) throw new Error("edge identity is required");
    if (config.storageRoot.trim().length === 0) throw new Error("playlist storage root is required");
    this.#config = config;
  }

  async start(): Promise<void> {
    // Startup does not require Cloud. A previously activated device can still
    // serve the cached playlist while the Cloud is temporarily unavailable.
    for (const runtime of this.#runtimes.values()) await runtime.start();
  }

  async sync(campaignId: string): Promise<readonly EdgeManifest[]> {
    if (campaignId.trim().length === 0) throw new Error("campaign identity is required for sync");
    const fetchManifests = this.#config.cloud.fetchManifests;
    const manifests = fetchManifests === undefined
      ? [await this.#config.cloud.fetchManifest(campaignId)]
      : [...await fetchManifests(campaignId)];
    if (manifests.length === 0) throw new Error("campaign playlist is empty");
    const sorted = manifests.slice().sort((left, right) => left.slotId.localeCompare(right.slotId));
    const seen = new Set<string>();
    for (const manifest of sorted) {
      if (seen.has(manifest.slotId)) throw new Error(`duplicate playlist slot: ${manifest.slotId}`);
      seen.add(manifest.slotId);
      if (manifest.campaignId !== campaignId) throw new Error("playlist campaign identity mismatch");
      const runtime = this.#runtimeFor(manifest);
      await runtime.start();
      await runtime.sync(campaignId);
    }
    this.#campaignId = campaignId;
    return sorted;
  }

  async playSlot(slotId: string): Promise<EdgePlayback> {
    const runtime = this.#runtimes.get(slotId);
    if (runtime === undefined) throw new Error(`playlist slot is not cached: ${slotId}`);
    return runtime.playCached();
  }

  async playAll(): Promise<readonly EdgePlayback[]> {
    const playbacks: EdgePlayback[] = [];
    for (const slotId of [...this.#runtimes.keys()].sort((left, right) => left.localeCompare(right))) {
      playbacks.push(await this.playSlot(slotId));
    }
    return playbacks;
  }

  async localManifests(): Promise<readonly EdgeManifest[]> {
    const manifests: EdgeManifest[] = [];
    for (const slotId of [...this.#runtimes.keys()].sort((left, right) => left.localeCompare(right))) {
      const manifest = await this.#runtimes.get(slotId)?.localManifest();
      if (manifest !== undefined) manifests.push(manifest);
    }
    return manifests;
  }

  async localAsset(slotId: string, assetId: string): Promise<EdgeAsset | undefined> {
    return this.#runtimes.get(slotId)?.localAsset(assetId);
  }

  async flush(): Promise<void> {
    for (const runtime of this.#runtimes.values()) await runtime.flush();
  }

  async diagnostics(): Promise<EdgePlaylistDiagnostics> {
    const diagnostics: EdgeRuntimeDiagnostics[] = [];
    for (const runtime of this.#runtimes.values()) diagnostics.push(await runtime.diagnostics());
    return {
      ...(this.#campaignId === undefined ? {} : { campaignId: this.#campaignId }),
      slotCount: diagnostics.length,
      manifestCached: diagnostics.length > 0 && diagnostics.every((value) => value.manifestCached),
      assetCached: diagnostics.length > 0 && diagnostics.every((value) => value.assetCached),
      queueSize: diagnostics.reduce((sum, value) => sum + value.queueSize, 0),
      playbackEventQueueSize: diagnostics.reduce((sum, value) => sum + value.playbackEventQueueSize, 0),
      evidenceQueueSize: diagnostics.reduce((sum, value) => sum + value.evidenceQueueSize, 0),
      cloudStatus: diagnostics.some((value) => value.cloudStatus === "UNAVAILABLE") ? "UNAVAILABLE"
        : diagnostics.every((value) => value.cloudStatus === "AVAILABLE") ? "AVAILABLE" : "UNKNOWN",
      playerStatus: diagnostics.some((value) => value.playerStatus === "PLAYING") ? "PLAYING"
        : diagnostics.some((value) => value.playerStatus === "COMPLETED") ? "COMPLETED" : "IDLE",
      health: diagnostics.some((value) => value.health === "ERROR") ? "ERROR"
        : diagnostics.some((value) => value.health === "OFFLINE") ? "OFFLINE"
        : diagnostics.some((value) => value.health === "DEGRADED") ? "DEGRADED"
        : "READY",
    };
  }

  #runtimeFor(manifest: EdgeManifest): RealEdgeRuntime {
    const existing = this.#runtimes.get(manifest.slotId);
    if (existing !== undefined) return existing;
    const scopedCloud = scopeCloudClient(this.#config.cloud, manifest);
    const runtimeConfig: EdgeRuntimeConfig = {
      edgeId: this.#config.edgeId,
      environment: this.#config.environment,
      storage: new JsonEdgeStorage(path.join(this.#config.storageRoot, "slots", manifest.slotId)),
      cloud: scopedCloud,
      ...(this.#config.clock === undefined ? {} : { clock: this.#config.clock }),
      ...(this.#config.runtimeVersion === undefined ? {} : { runtimeVersion: this.#config.runtimeVersion }),
      ...(this.#config.maxAttempts === undefined ? {} : { maxAttempts: this.#config.maxAttempts }),
      suppressStartedEvent: this.#runtimes.size > 0,
    };
    const runtime = new RealEdgeRuntime(runtimeConfig);
    this.#runtimes.set(manifest.slotId, runtime);
    return runtime;
  }
}

export interface EdgePlaylistRuntimeConfig {
  readonly edgeId: string;
  readonly environment: EdgeRuntimeConfig["environment"];
  readonly storageRoot: string;
  readonly cloud: EdgeCloudClient;
  readonly clock?: EdgeRuntimeConfig["clock"];
  readonly runtimeVersion?: string;
  readonly maxAttempts?: number;
}

export interface EdgePlaylistDiagnostics {
  readonly campaignId?: string;
  readonly slotCount: number;
  readonly manifestCached: boolean;
  readonly assetCached: boolean;
  readonly queueSize: number;
  readonly playbackEventQueueSize: number;
  readonly evidenceQueueSize: number;
  readonly cloudStatus: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  readonly playerStatus: "IDLE" | "PLAYING" | "COMPLETED" | "UNKNOWN";
  readonly health: EdgeRuntimeDiagnostics["health"];
}

function scopeCloudClient(client: EdgeCloudClient, manifest: EdgeManifest): EdgeCloudClient {
  return {
    fetchManifest: async (campaignId) => {
      if (campaignId !== manifest.campaignId) throw new Error("scoped manifest campaign mismatch");
      return manifest;
    },
    fetchAsset: (assetId) => client.fetchAsset(assetId),
    sendTelemetry: (event) => client.sendTelemetry(event),
    sendPlaybackEvent: (event) => client.sendPlaybackEvent(event),
    sendEvidence: (evidence) => client.sendEvidence(evidence),
    health: () => client.health(),
  };
}
