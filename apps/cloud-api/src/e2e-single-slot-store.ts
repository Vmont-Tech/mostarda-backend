import type { Pool } from "pg";

import {
  EDGE_CLOUD_CONTRACT_VERSION,
  assetBytes,
  assetDigest,
  type EdgeAsset,
  type EdgeMediaType,
  type EdgeManifest,
  type EdgePlaybackEvent,
  type EdgeTelemetryEvent,
} from "../../../packages/edge-runtime/src/cloud-contracts.ts";

/** In-memory/PostgreSQL adapters for the bounded single-slot laboratory slice. */
export interface E2ECampaign {
  readonly campaignId: string;
  readonly name: string;
  readonly status: "ACTIVE";
}

export interface E2ESlot {
  readonly slotId: string;
  readonly campaignId: string;
  readonly durationSeconds: number;
  readonly status: "ACTIVE";
}

export interface E2ECreative {
  readonly creativeId: string;
  readonly mediaType: EdgeMediaType;
  readonly content: string;
  readonly digest: string;
  readonly status: "PUBLISHED";
}

export interface E2ESingleSlotStore {
  createCampaign(input: { campaignId: string; name: string }): E2ECampaign | Promise<E2ECampaign>;
  campaign(campaignId: string): E2ECampaign | undefined | Promise<E2ECampaign | undefined>;
  createSlot(input: { slotId: string; campaignId: string; durationSeconds: number }): E2ESlot | Promise<E2ESlot>;
  slot(slotId: string): E2ESlot | undefined | Promise<E2ESlot | undefined>;
  publishCreative(input: { creativeId: string; mediaType: EdgeMediaType; content: string }): E2ECreative | Promise<E2ECreative>;
  assignCreative(slotId: string, creativeId: string): EdgeManifest | Promise<EdgeManifest>;
  manifest(campaignId: string, slotId?: string): EdgeManifest | undefined | Promise<EdgeManifest | undefined>;
  manifests(campaignId: string): readonly EdgeManifest[] | Promise<readonly EdgeManifest[]>;
  asset(assetId: string): EdgeAsset | undefined | Promise<EdgeAsset | undefined>;
  acceptPlaybackEvent(value: unknown): void | Promise<void>;
  playbackEvents(): readonly EdgePlaybackEvent[] | Promise<readonly EdgePlaybackEvent[]>;
  acceptTelemetry(value: unknown): void | Promise<void>;
  telemetryEvents(): readonly EdgeTelemetryEvent[] | Promise<readonly EdgeTelemetryEvent[]>;
}

interface Assignment {
  readonly slotId: string;
  readonly campaignId: string;
  readonly creativeId: string;
  readonly manifestVersion: string;
}

const MANIFEST_VERSION = "manifest-e2e-v1";

export class InMemoryE2ESingleSlotStore implements E2ESingleSlotStore {
  readonly #campaigns = new Map<string, E2ECampaign>();
  readonly #slots = new Map<string, E2ESlot>();
  readonly #creatives = new Map<string, E2ECreative>();
  readonly #assignments = new Map<string, Assignment>();
  readonly #events = new Map<string, EdgePlaybackEvent>();
  readonly #telemetry = new Map<string, EdgeTelemetryEvent>();

  createCampaign(input: { campaignId: string; name: string }): E2ECampaign {
    requireIdentity(input.campaignId, "campaignId");
    requireIdentity(input.name, "campaign name");
    const existing = this.#campaigns.get(input.campaignId);
    if (existing !== undefined) {
      if (existing.name !== input.name) throw new Error("campaign identity conflict");
      return existing;
    }
    const campaign: E2ECampaign = { campaignId: input.campaignId, name: input.name, status: "ACTIVE" };
    this.#campaigns.set(campaign.campaignId, campaign);
    return campaign;
  }

  campaign(campaignId: string): E2ECampaign | undefined {
    return this.#campaigns.get(campaignId);
  }

  createSlot(input: { slotId: string; campaignId: string; durationSeconds: number }): E2ESlot {
    requireIdentity(input.slotId, "slotId");
    if (this.#campaigns.has(input.campaignId) === false) throw new Error("campaign not found");
    if (!Number.isInteger(input.durationSeconds) || input.durationSeconds <= 0) {
      throw new Error("slot duration must be a positive integer");
    }
    const existing = this.#slots.get(input.slotId);
    if (existing !== undefined) {
      if (JSON.stringify(existing) !== JSON.stringify({ ...existing, durationSeconds: input.durationSeconds })) {
        throw new Error("slot identity conflict");
      }
      return existing;
    }
    const slot: E2ESlot = { slotId: input.slotId, campaignId: input.campaignId, durationSeconds: input.durationSeconds, status: "ACTIVE" };
    this.#slots.set(slot.slotId, slot);
    return slot;
  }

  slot(slotId: string): E2ESlot | undefined {
    return this.#slots.get(slotId);
  }

  publishCreative(input: { creativeId: string; mediaType: EdgeMediaType; content: string }): E2ECreative {
    requireIdentity(input.creativeId, "creativeId");
    validateMedia(input.mediaType, input.content);
    const creative: E2ECreative = {
      creativeId: input.creativeId,
      mediaType: input.mediaType,
      content: input.content,
      digest: assetDigest(input.mediaType, input.content),
      status: "PUBLISHED",
    };
    const existing = this.#creatives.get(creative.creativeId);
    if (existing !== undefined) {
      if (JSON.stringify(existing) !== JSON.stringify(creative)) throw new Error("creative identity conflict");
      return existing;
    }
    this.#creatives.set(creative.creativeId, creative);
    return creative;
  }

  assignCreative(slotId: string, creativeId: string): EdgeManifest {
    const slot = this.#slots.get(slotId);
    if (slot === undefined) throw new Error("slot not found");
    const creative = this.#creatives.get(creativeId);
    if (creative === undefined) throw new Error("creative not found");
    const assignment: Assignment = {
      slotId,
      campaignId: slot.campaignId,
      creativeId,
      manifestVersion: `${MANIFEST_VERSION}:${slotId}`,
    };
    const existing = this.#assignments.get(slotId);
    if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(assignment)) {
      throw new Error("slot creative assignment conflict");
    }
    this.#assignments.set(slotId, assignment);
    return this.#manifestFor(slot, creative, assignment);
  }

  manifest(campaignId: string, slotId?: string): EdgeManifest | undefined {
    const slot = [...this.#slots.values()].find((candidate) => candidate.campaignId === campaignId && (slotId === undefined || candidate.slotId === slotId));
    if (slot === undefined) return undefined;
    const assignment = this.#assignments.get(slot.slotId);
    if (assignment === undefined) return undefined;
    const creative = this.#creatives.get(assignment.creativeId);
    if (creative === undefined) return undefined;
    return this.#manifestFor(slot, creative, assignment);
  }

  manifests(campaignId: string): readonly EdgeManifest[] {
    return [...this.#slots.values()]
      .filter((slot) => slot.campaignId === campaignId)
      .sort((left, right) => left.slotId.localeCompare(right.slotId))
      .flatMap((slot) => {
        const assignment = this.#assignments.get(slot.slotId);
        const creative = assignment === undefined ? undefined : this.#creatives.get(assignment.creativeId);
        return assignment === undefined || creative === undefined ? [] : [this.#manifestFor(slot, creative, assignment)];
      });
  }

  asset(assetId: string): EdgeAsset | undefined {
    const suffix = ":asset";
    if (!assetId.endsWith(suffix)) return undefined;
    const creative = this.#creatives.get(assetId.slice(0, -suffix.length));
    if (creative === undefined) return undefined;
    return {
      contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
      assetId,
      creativeId: creative.creativeId,
      mediaType: creative.mediaType,
      content: creative.content,
      digest: creative.digest,
    };
  }

  acceptPlaybackEvent(value: unknown): void {
    const event = parsePlaybackEvent(value);
    const previous = this.#events.get(event.playbackEventId);
    if (previous !== undefined && JSON.stringify(previous) !== JSON.stringify(event)) {
      throw new Error("playback event identity conflict");
    }
    this.#events.set(event.playbackEventId, event);
  }

  playbackEvents(): readonly EdgePlaybackEvent[] {
    return [...this.#events.values()];
  }

  acceptTelemetry(value: unknown): void {
    const event = parseTelemetry(value);
    const previous = this.#telemetry.get(event.eventId);
    if (previous !== undefined && JSON.stringify(previous) !== JSON.stringify(event)) {
      throw new Error("telemetry event identity conflict");
    }
    this.#telemetry.set(event.eventId, event);
  }

  telemetryEvents(): readonly EdgeTelemetryEvent[] {
    return [...this.#telemetry.values()];
  }

  #manifestFor(slot: E2ESlot, creative: E2ECreative, assignment: Assignment): EdgeManifest {
    return {
      contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
      campaignId: slot.campaignId,
      slotId: slot.slotId,
      creativeId: creative.creativeId,
      mediaType: creative.mediaType,
      version: assignment.manifestVersion,
      durationSeconds: slot.durationSeconds,
      assetId: `${creative.creativeId}:asset`,
      playbackIdentity: { campaignId: slot.campaignId, slotId: slot.slotId, creativeId: creative.creativeId },
    };
  }
}

export class PostgresE2ESingleSlotStore implements E2ESingleSlotStore {
  readonly #pool: Pool;

  constructor(pool: Pool) {
    this.#pool = pool;
  }

  async createCampaign(input: { campaignId: string; name: string }): Promise<E2ECampaign> {
    const result = await this.#pool.query<E2ECampaign>(
      `INSERT INTO e2e_campaigns (campaign_id, name, status)
       VALUES ($1, $2, 'ACTIVE')
       ON CONFLICT (campaign_id) DO UPDATE SET name = e2e_campaigns.name
       RETURNING campaign_id AS "campaignId", name, status`,
      [input.campaignId, input.name],
    );
    const row = result.rows[0];
    if (row === undefined || row.name !== input.name) throw new Error("campaign identity conflict");
    return row;
  }

  async campaign(campaignId: string): Promise<E2ECampaign | undefined> {
    const result = await this.#pool.query<E2ECampaign>(
      `SELECT campaign_id AS "campaignId", name, status FROM e2e_campaigns WHERE campaign_id = $1`,
      [campaignId],
    );
    return result.rows[0];
  }

  async createSlot(input: { slotId: string; campaignId: string; durationSeconds: number }): Promise<E2ESlot> {
    const result = await this.#pool.query<E2ESlot>(
      `INSERT INTO e2e_slots (slot_id, campaign_id, duration_seconds, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (slot_id) DO UPDATE SET slot_id = e2e_slots.slot_id
       RETURNING slot_id AS "slotId", campaign_id AS "campaignId", duration_seconds AS "durationSeconds", status`,
      [input.slotId, input.campaignId, input.durationSeconds],
    );
    const row = result.rows[0];
    if (row === undefined || row.campaignId !== input.campaignId || row.durationSeconds !== input.durationSeconds) {
      throw new Error("slot identity conflict");
    }
    return row;
  }

  async slot(slotId: string): Promise<E2ESlot | undefined> {
    const result = await this.#pool.query<E2ESlot>(
      `SELECT slot_id AS "slotId", campaign_id AS "campaignId", duration_seconds AS "durationSeconds", status
         FROM e2e_slots WHERE slot_id = $1`,
      [slotId],
    );
    return result.rows[0];
  }

  async publishCreative(input: { creativeId: string; mediaType: EdgeMediaType; content: string }): Promise<E2ECreative> {
    validateMedia(input.mediaType, input.content);
    const digest = assetDigest(input.mediaType, input.content);
    const result = await this.#pool.query<E2ECreative>(
      `INSERT INTO e2e_creatives (creative_id, media_type, content, digest, status)
       VALUES ($1, $2, $3, $4, 'PUBLISHED')
       ON CONFLICT (creative_id) DO UPDATE SET creative_id = e2e_creatives.creative_id
       RETURNING creative_id AS "creativeId", media_type AS "mediaType", content, digest, status`,
      [input.creativeId, input.mediaType, input.content, digest],
    );
    const row = result.rows[0];
    if (row === undefined || row.mediaType !== input.mediaType || row.content !== input.content || row.digest !== digest) {
      throw new Error("creative identity conflict");
    }
    return row;
  }

  async assignCreative(slotId: string, creativeId: string): Promise<EdgeManifest> {
    const slot = await this.slot(slotId);
    if (slot === undefined) throw new Error("slot not found");
    const creative = await this.#creative(creativeId);
    if (creative === undefined) throw new Error("creative not found");
    const manifestVersion = `${MANIFEST_VERSION}:${slot.slotId}`;
    const existing = await this.#pool.query<{ campaign_id: string; creative_id: string; manifest_version: string }>(
      `SELECT campaign_id, creative_id, manifest_version
         FROM e2e_slot_creatives WHERE slot_id = $1`,
      [slot.slotId],
    );
    const previous = existing.rows[0];
    if (previous !== undefined && (previous.campaign_id !== slot.campaignId
      || previous.creative_id !== creative.creativeId
      || previous.manifest_version !== manifestVersion)) {
      throw new Error("slot creative assignment conflict");
    }
    await this.#pool.query(
      `INSERT INTO e2e_slot_creatives (slot_id, campaign_id, creative_id, manifest_version)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slot_id) DO UPDATE
         SET campaign_id = e2e_slot_creatives.campaign_id,
             creative_id = e2e_slot_creatives.creative_id,
             manifest_version = e2e_slot_creatives.manifest_version`,
      [slot.slotId, slot.campaignId, creative.creativeId, manifestVersion],
    );
    const result = await this.manifest(slot.campaignId, slot.slotId);
    if (result === undefined) throw new Error("manifest was not materialized");
    return result;
  }

  async manifest(campaignId: string, slotId?: string): Promise<EdgeManifest | undefined> {
    const result = await this.#pool.query<{
      campaign_id: string;
      slot_id: string;
      creative_id: string;
      manifest_version: string;
      duration_seconds: number;
      media_type: EdgeMediaType;
    }>(
      `SELECT assignment.campaign_id, assignment.slot_id, assignment.creative_id,
              assignment.manifest_version, slot.duration_seconds, creative.media_type
         FROM e2e_slot_creatives AS assignment
         JOIN e2e_slots AS slot ON slot.slot_id = assignment.slot_id
         JOIN e2e_creatives AS creative ON creative.creative_id = assignment.creative_id
        WHERE assignment.campaign_id = $1
          AND ($2::text IS NULL OR assignment.slot_id = $2)
        ORDER BY assignment.slot_id
        LIMIT 1`,
      [campaignId, slotId ?? null],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    return {
      contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
      campaignId: row.campaign_id,
      slotId: row.slot_id,
      creativeId: row.creative_id,
      mediaType: row.media_type,
      version: row.manifest_version,
      durationSeconds: row.duration_seconds,
      assetId: `${row.creative_id}:asset`,
      playbackIdentity: { campaignId: row.campaign_id, slotId: row.slot_id, creativeId: row.creative_id },
    };
  }

  async manifests(campaignId: string): Promise<readonly EdgeManifest[]> {
    const result = await this.#pool.query<{
      campaign_id: string;
      slot_id: string;
      creative_id: string;
      manifest_version: string;
      duration_seconds: number;
      media_type: EdgeMediaType;
    }>(
      `SELECT assignment.campaign_id, assignment.slot_id, assignment.creative_id,
              assignment.manifest_version, slot.duration_seconds, creative.media_type
         FROM e2e_slot_creatives AS assignment
         JOIN e2e_slots AS slot ON slot.slot_id = assignment.slot_id
         JOIN e2e_creatives AS creative ON creative.creative_id = assignment.creative_id
        WHERE assignment.campaign_id = $1
        ORDER BY assignment.slot_id`,
      [campaignId],
    );
    return result.rows.map((row) => ({
      contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
      campaignId: row.campaign_id,
      slotId: row.slot_id,
      creativeId: row.creative_id,
      mediaType: row.media_type,
      version: row.manifest_version,
      durationSeconds: row.duration_seconds,
      assetId: `${row.creative_id}:asset`,
      playbackIdentity: { campaignId: row.campaign_id, slotId: row.slot_id, creativeId: row.creative_id },
    }));
  }

  async asset(assetId: string): Promise<EdgeAsset | undefined> {
    const suffix = ":asset";
    if (!assetId.endsWith(suffix)) return undefined;
    const creative = await this.#creative(assetId.slice(0, -suffix.length));
    if (creative === undefined) return undefined;
    return {
      contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
      assetId,
      creativeId: creative.creativeId,
      mediaType: creative.mediaType,
      content: creative.content,
      digest: creative.digest,
    };
  }

  async acceptPlaybackEvent(value: unknown): Promise<void> {
    const event = parsePlaybackEvent(value);
    const result = await this.#pool.query(
      `INSERT INTO e2e_playback_events (
         playback_event_id, campaign_id, slot_id, creative_id, edge_id,
         session_id, playback_id, manifest_version, started_at, completed_at,
         duration_seconds, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, $11, $12)
       ON CONFLICT (playback_event_id) DO NOTHING`,
      [event.playbackEventId, event.campaignId, event.slotId, event.creativeId, event.edgeId,
        event.sessionId, event.playbackId, event.manifestVersion, event.startedAt, event.completedAt,
        event.durationSeconds, event.status],
    );
    if (result.rowCount === 0) {
      const existing = await this.#pool.query<PlaybackEventRow>(
        `SELECT playback_event_id, campaign_id, slot_id, creative_id, edge_id,
                session_id, playback_id, manifest_version, started_at::text,
                completed_at::text, duration_seconds, status
           FROM e2e_playback_events WHERE playback_event_id = $1`,
        [event.playbackEventId],
      );
      const row = existing.rows[0];
      if (row === undefined || JSON.stringify(toPlaybackEvent(row)) !== JSON.stringify(event)) {
        throw new Error("playback event identity conflict");
      }
    }
  }

  async playbackEvents(): Promise<readonly EdgePlaybackEvent[]> {
    const result = await this.#pool.query<PlaybackEventRow>(
      `SELECT playback_event_id, campaign_id, slot_id, creative_id, edge_id,
              session_id, playback_id, manifest_version, started_at::text,
              completed_at::text, duration_seconds, status
         FROM e2e_playback_events ORDER BY playback_event_id`,
    );
    return result.rows.map(toPlaybackEvent);
  }

  async acceptTelemetry(value: unknown): Promise<void> {
    const event = parseTelemetry(value);
    await this.#pool.query(
      `INSERT INTO e2e_telemetry_events (event_id, event_type, edge_id, occurred_at, payload)
       VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
       ON CONFLICT (event_id) DO NOTHING`,
      [event.eventId, event.type, event.edgeId, event.occurredAt, JSON.stringify(event)],
    );
  }

  async telemetryEvents(): Promise<readonly EdgeTelemetryEvent[]> {
    const result = await this.#pool.query<{ payload: EdgeTelemetryEvent }>(
      `SELECT payload FROM e2e_telemetry_events ORDER BY event_id`,
    );
    return result.rows.map((row) => row.payload);
  }

  async #creative(creativeId: string): Promise<E2ECreative | undefined> {
    const result = await this.#pool.query<E2ECreative>(
      `SELECT creative_id AS "creativeId", media_type AS "mediaType", content, digest, status
         FROM e2e_creatives WHERE creative_id = $1`,
      [creativeId],
    );
    return result.rows[0];
  }
}

interface PlaybackEventRow {
  playback_event_id: string;
  campaign_id: string;
  slot_id: string;
  creative_id: string;
  edge_id: string;
  session_id: string;
  playback_id: string;
  manifest_version: string;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  status: "COMPLETED";
}

function validateMedia(mediaType: EdgeMediaType, content: string): void {
  if (mediaType !== "text/html" && mediaType !== "video/mp4") {
    throw new Error("unsupported creative media type");
  }
  if (content.length === 0) throw new Error("creative content is required");
  assetBytes(mediaType, content);
}

function toPlaybackEvent(row: PlaybackEventRow): EdgePlaybackEvent {
  return {
    contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
    playbackEventId: row.playback_event_id,
    campaignId: row.campaign_id,
    slotId: row.slot_id,
    creativeId: row.creative_id,
    edgeId: row.edge_id,
    sessionId: row.session_id,
    playbackId: row.playback_id,
    manifestVersion: row.manifest_version,
    startedAt: new Date(row.started_at).toISOString(),
    completedAt: new Date(row.completed_at).toISOString(),
    durationSeconds: Number(row.duration_seconds),
    status: row.status,
  };
}

function parsePlaybackEvent(value: unknown): EdgePlaybackEvent {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid PlaybackEvent");
  const event = value as Partial<EdgePlaybackEvent>;
  if (event.contractVersion !== EDGE_CLOUD_CONTRACT_VERSION
    || typeof event.playbackEventId !== "string"
    || typeof event.campaignId !== "string"
    || typeof event.slotId !== "string"
    || typeof event.creativeId !== "string"
    || typeof event.edgeId !== "string"
    || typeof event.sessionId !== "string"
    || typeof event.playbackId !== "string"
    || typeof event.manifestVersion !== "string"
    || typeof event.startedAt !== "string"
    || typeof event.completedAt !== "string"
    || typeof event.durationSeconds !== "number"
    || event.status !== "COMPLETED") {
    throw new Error("invalid PlaybackEvent");
  }
  return event as EdgePlaybackEvent;
}

function parseTelemetry(value: unknown): EdgeTelemetryEvent {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid Edge telemetry event");
  const event = value as Partial<EdgeTelemetryEvent>;
  if (event.contractVersion !== EDGE_CLOUD_CONTRACT_VERSION
    || typeof event.eventId !== "string"
    || typeof event.type !== "string"
    || typeof event.edgeId !== "string"
    || typeof event.environment !== "string"
    || typeof event.occurredAt !== "string"
    || event.payload === null
    || typeof event.payload !== "object") {
    throw new Error("invalid Edge telemetry event");
  }
  return event as EdgeTelemetryEvent;
}

function requireIdentity(value: string, name: string): void {
  if (value.trim().length === 0) throw new Error(`${name} is required`);
}
