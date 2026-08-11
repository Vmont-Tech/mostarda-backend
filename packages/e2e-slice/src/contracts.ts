import { createHash } from "node:crypto";

export const DEMO_ENVIRONMENT = "DEVELOPMENT_SIMULATION" as const;
export const DEMO_CAMPAIGN_ID = "campaign-demo-001";
export const DEMO_CREATIVE_ID = "creative-demo-001";
export const DEMO_ASSET_ID = "asset-demo-001";
export const DEMO_MANIFEST_VERSION = "manifest-v1";
export const DEMO_EDGE_ID = "edge-demo-001";
export const DEMO_PLAYBACK_ID = "playback-demo-001";
export const DEMO_START_TIME = "2026-08-11T12:00:00.000Z";

export type DemoEventType =
  | "edge.started"
  | "manifest.synced"
  | "player.started"
  | "playback.started"
  | "playback.completed"
  | "telemetry.sent";

export interface DemoCampaign {
  readonly environment: typeof DEMO_ENVIRONMENT;
  readonly campaignId: string;
  readonly creativeId: string;
  readonly status: "ACTIVE";
}

export interface DemoManifest {
  readonly environment: typeof DEMO_ENVIRONMENT;
  readonly campaignId: string;
  readonly creativeId: string;
  readonly version: string;
  readonly durationSeconds: 1;
  readonly assetId: string;
  readonly playbackIdentity: {
    readonly campaignId: string;
    readonly creativeId: string;
  };
}

export interface DemoAsset {
  readonly environment: typeof DEMO_ENVIRONMENT;
  readonly assetId: string;
  readonly creativeId: string;
  readonly mediaType: "text/html";
  readonly content: string;
  readonly digest: string;
}

export interface DemoPlayback {
  readonly environment: typeof DEMO_ENVIRONMENT;
  readonly playbackId: string;
  readonly edgeId: string;
  readonly campaignId: string;
  readonly creativeId: string;
  readonly manifestVersion: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly completed: true;
}

export interface DemoTelemetryEvent {
  readonly environment: typeof DEMO_ENVIRONMENT;
  readonly eventId: string;
  readonly type: DemoEventType;
  readonly edgeId: string;
  readonly occurredAt: string;
  readonly campaignId?: string;
  readonly creativeId?: string;
  readonly playbackId?: string;
  readonly manifestVersion?: string;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
}

export interface DemoEvidence {
  readonly environment: typeof DEMO_ENVIRONMENT;
  readonly evidenceId: string;
  readonly evidenceKind: "PLAYBACK_EXECUTION_OBSERVATION";
  readonly status: "PLAYBACK_COMPLETED";
  readonly campaignId: string;
  readonly creativeId: string;
  readonly edgeId: string;
  readonly playbackId: string;
  readonly manifestVersion: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly audienceClaim: false;
  readonly evidenceHash: string;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createDemoAsset(): DemoAsset {
  const content =
    '<main data-mostarda-creative="creative-demo-001"><h1>Mostarda</h1><p>Mídia inteligente.</p></main>';
  return {
    environment: DEMO_ENVIRONMENT,
    assetId: DEMO_ASSET_ID,
    creativeId: DEMO_CREATIVE_ID,
    mediaType: "text/html",
    content,
    digest: sha256(content),
  };
}

export function createDemoManifest(): DemoManifest {
  return {
    environment: DEMO_ENVIRONMENT,
    campaignId: DEMO_CAMPAIGN_ID,
    creativeId: DEMO_CREATIVE_ID,
    version: DEMO_MANIFEST_VERSION,
    durationSeconds: 1,
    assetId: DEMO_ASSET_ID,
    playbackIdentity: {
      campaignId: DEMO_CAMPAIGN_ID,
      creativeId: DEMO_CREATIVE_ID,
    },
  };
}

export function createDemoCampaign(): DemoCampaign {
  return {
    environment: DEMO_ENVIRONMENT,
    campaignId: DEMO_CAMPAIGN_ID,
    creativeId: DEMO_CREATIVE_ID,
    status: "ACTIVE",
  };
}

export function createEvidence(playback: DemoPlayback): DemoEvidence {
  const unsigned = {
    environment: DEMO_ENVIRONMENT,
    evidenceKind: "PLAYBACK_EXECUTION_OBSERVATION" as const,
    status: "PLAYBACK_COMPLETED" as const,
    campaignId: playback.campaignId,
    creativeId: playback.creativeId,
    edgeId: playback.edgeId,
    playbackId: playback.playbackId,
    manifestVersion: playback.manifestVersion,
    startedAt: playback.startedAt,
    completedAt: playback.completedAt,
    audienceClaim: false as const,
  };
  return {
    ...unsigned,
    evidenceId: `evidence-${playback.playbackId}`,
    evidenceHash: sha256(canonicalJson(unsigned)),
  };
}
