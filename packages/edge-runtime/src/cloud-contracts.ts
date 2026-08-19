import { createHash } from "node:crypto";

export const EDGE_CLOUD_CONTRACT_VERSION = "edge-cloud-v1" as const;

export type EdgeMediaType = "text/html" | "video/mp4";

export type EdgeEnvironment = "development" | "test" | "production";

export type EdgeTelemetryType =
  | "edge.started"
  | "manifest.synced"
  | "player.started"
  | "playback.started"
  | "playback.completed"
  | "telemetry.sent";

export interface EdgeManifest {
  readonly contractVersion: typeof EDGE_CLOUD_CONTRACT_VERSION;
  readonly campaignId: string;
  readonly slotId: string;
  readonly creativeId: string;
  readonly mediaType: EdgeMediaType;
  readonly version: string;
  readonly durationSeconds: number;
  readonly assetId: string;
  readonly playbackIdentity: {
    readonly campaignId: string;
    readonly slotId: string;
    readonly creativeId: string;
  };
}

export interface EdgeAsset {
  readonly contractVersion: typeof EDGE_CLOUD_CONTRACT_VERSION;
  readonly assetId: string;
  readonly creativeId: string;
  readonly mediaType: EdgeMediaType;
  /** UTF-8 HTML or Base64-encoded bytes for video/mp4. */
  readonly content: string;
  readonly digest: string;
}

export interface EdgePlayback {
  readonly contractVersion: typeof EDGE_CLOUD_CONTRACT_VERSION;
  readonly playbackId: string;
  readonly edgeId: string;
  readonly environment: EdgeEnvironment;
  readonly campaignId: string;
  readonly slotId: string;
  readonly creativeId: string;
  readonly manifestVersion: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationSeconds: number;
  readonly status: "COMPLETED";
}

/**
 * A PlaybackEvent is an operational fact emitted by the Edge. It is not an
 * EvidenceRecord and cannot authorize Settlement by itself.
 */
export interface EdgePlaybackEvent {
  readonly contractVersion: typeof EDGE_CLOUD_CONTRACT_VERSION;
  readonly playbackEventId: string;
  readonly campaignId: string;
  readonly slotId: string;
  readonly creativeId: string;
  readonly edgeId: string;
  readonly sessionId: string;
  readonly playbackId: string;
  readonly manifestVersion: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationSeconds: number;
  readonly status: "COMPLETED";
}

export interface EdgeTelemetryEvent {
  readonly contractVersion: typeof EDGE_CLOUD_CONTRACT_VERSION;
  readonly eventId: string;
  readonly type: EdgeTelemetryType;
  readonly edgeId: string;
  readonly environment: EdgeEnvironment;
  readonly occurredAt: string;
  readonly campaignId?: string;
  readonly creativeId?: string;
  readonly playbackId?: string;
  readonly manifestVersion?: string;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
}

export interface EdgeEvidence {
  readonly contractVersion: typeof EDGE_CLOUD_CONTRACT_VERSION;
  readonly evidenceId: string;
  readonly evidenceKind: "PLAYBACK_EXECUTION_OBSERVATION";
  readonly status: "PLAYBACK_COMPLETED";
  readonly environment: EdgeEnvironment;
  readonly campaignId: string;
  readonly creativeId: string;
  readonly edgeId: string;
  readonly playbackId: string;
  readonly manifestVersion: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationSeconds: number;
  readonly audienceClaim: false;
  readonly evidenceHash: string;
}

export interface EdgeCloudClient {
  fetchManifest(campaignId: string, slotId?: string): Promise<EdgeManifest>;
  /** Optional playlist surface; single-manifest clients remain valid. */
  fetchManifests?(campaignId: string): Promise<readonly EdgeManifest[]>;
  fetchAsset(assetId: string): Promise<EdgeAsset>;
  sendTelemetry(event: EdgeTelemetryEvent): Promise<void>;
  sendPlaybackEvent(event: EdgePlaybackEvent): Promise<void>;
  /** @deprecated Evidence is not produced by the Edge E2E slice. Kept for the demo boundary only. */
  sendEvidence(evidence: EdgeEvidence): Promise<void>;
  health(): Promise<boolean>;
}

export function canonicalEdgeJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalEdgeJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalEdgeJson(object[key])}`)
    .join(",")}}`;
}

export function sha256(value: string | Uint8Array): string {
  return typeof value === "string"
    ? createHash("sha256").update(value, "utf8").digest("hex")
    : createHash("sha256").update(value).digest("hex");
}

export function assetBytes(mediaType: EdgeMediaType, content: string): Uint8Array {
  if (mediaType === "text/html") return Buffer.from(content, "utf8");
  const bytes = Buffer.from(content, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== content) {
    throw new Error("video/mp4 content must be canonical Base64");
  }
  return bytes;
}

export function assetDigest(mediaType: EdgeMediaType, content: string): string {
  return sha256(assetBytes(mediaType, content));
}

export function createEdgeEvidence(playback: EdgePlayback): EdgeEvidence {
  const unsigned = {
    contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
    evidenceKind: "PLAYBACK_EXECUTION_OBSERVATION" as const,
    status: "PLAYBACK_COMPLETED" as const,
    environment: playback.environment,
    campaignId: playback.campaignId,
    creativeId: playback.creativeId,
    edgeId: playback.edgeId,
    playbackId: playback.playbackId,
    manifestVersion: playback.manifestVersion,
    startedAt: playback.startedAt,
    completedAt: playback.completedAt,
    durationSeconds: playback.durationSeconds,
    audienceClaim: false as const,
  };
  return {
    ...unsigned,
    evidenceId: `evidence-${playback.playbackId}`,
    evidenceHash: sha256(canonicalEdgeJson(unsigned)),
  };
}
