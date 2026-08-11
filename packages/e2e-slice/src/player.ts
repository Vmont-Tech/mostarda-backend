import {
  DEMO_ENVIRONMENT,
  DEMO_CONTRACT_REGISTRY,
  type DemoAsset,
  type DemoManifest,
  type DemoPlayback,
  type DemoTelemetryEvent,
  DEMO_EDGE_ID,
  DEMO_PLAYBACK_ID,
} from "./contracts.ts";

export interface PlayerClock {
  next(): string;
}

export class DeterministicClock implements PlayerClock {
  #index = 0;
  readonly start: string;

  constructor(start = "2026-08-11T12:00:00.000Z") {
    this.start = start;
  }

  next(): string {
    const value = new Date(Date.parse(this.start) + this.#index * 1000).toISOString();
    this.#index += 1;
    return value;
  }
}

export interface PlayerRun {
  readonly playback: DemoPlayback;
  readonly events: readonly DemoTelemetryEvent[];
}

export class DeterministicPlayer {
  readonly edgeId: string;
  readonly clock: PlayerClock;

  constructor(
    edgeId = DEMO_EDGE_ID,
    clock: PlayerClock = new DeterministicClock(),
  ) {
    this.edgeId = edgeId;
    this.clock = clock;
  }

  play(manifest: DemoManifest, asset: DemoAsset): PlayerRun {
    if (asset.creativeId !== manifest.creativeId || asset.mediaType !== "text/html") {
      throw new Error("asset does not satisfy the manifest");
    }
    const startedAt = this.clock.next();
    const completedAt = this.clock.next();
    const playbackId = `${DEMO_PLAYBACK_ID}-${manifest.version}`;
    const common = {
      environment: DEMO_ENVIRONMENT,
      contractOrigin: DEMO_CONTRACT_REGISTRY.DemoTelemetryEvent.origin,
      edgeId: this.edgeId,
      occurredAt: startedAt,
      campaignId: manifest.campaignId,
      creativeId: manifest.creativeId,
      playbackId,
      manifestVersion: manifest.version,
    };
    const playback: DemoPlayback = {
      environment: DEMO_ENVIRONMENT,
      contractOrigin: DEMO_CONTRACT_REGISTRY.DemoPlayback.origin,
      playbackId,
      edgeId: this.edgeId,
      campaignId: manifest.campaignId,
      creativeId: manifest.creativeId,
      manifestVersion: manifest.version,
      startedAt,
      completedAt,
      completed: true,
    };
    return {
      playback,
      events: [
        { ...common, eventId: `${playbackId}:player.started`, type: "player.started", payload: { assetId: asset.assetId } },
        { ...common, eventId: `${playbackId}:playback.started`, type: "playback.started", payload: { assetId: asset.assetId } },
        { ...common, eventId: `${playbackId}:playback.completed`, type: "playback.completed", occurredAt: completedAt, payload: { durationSeconds: manifest.durationSeconds } },
      ],
    };
  }
}
