import { canonicalEdgeJson, type EdgeAsset } from "./cloud-contracts.ts";
import type { DailySlotSchedule } from "./daily-slot-schedule.ts";

export const EDGE_SCHEDULE_CONTRACT_VERSION = "edge-schedule-v1" as const;

export interface DailyScheduleUpdate {
  readonly contractVersion: typeof EDGE_SCHEDULE_CONTRACT_VERSION;
  readonly edgeId: string;
  readonly revision: number;
  readonly schedule: DailySlotSchedule;
  readonly assets: readonly EdgeAsset[];
}

export interface DailyScheduleSnapshot {
  readonly edgeId: string;
  readonly revision: number;
  readonly schedule: DailySlotSchedule;
  readonly assets: ReadonlyMap<string, EdgeAsset>;
}

export type DailyScheduleReplaceResult =
  | { readonly status: "applied"; readonly revision: number }
  | { readonly status: "replayed"; readonly revision: number };

/**
 * Atomic in-memory representation of the Edge's committed schedule snapshot.
 * A persistent Edge store can implement the same replacement contract later.
 */
export class InMemoryDailyScheduleStore {
  #snapshot: DailyScheduleSnapshot;

  constructor(initial: DailyScheduleUpdate) {
    validateUpdate(initial);
    this.#snapshot = makeSnapshot(initial);
  }

  snapshot(): DailyScheduleSnapshot {
    return this.#snapshot;
  }

  replace(update: DailyScheduleUpdate): DailyScheduleReplaceResult {
    validateUpdate(update);
    if (update.edgeId !== this.#snapshot.edgeId) throw new Error("SCHEDULE_EDGE_ID_MISMATCH");
    if (update.revision < this.#snapshot.revision) throw new Error("SCHEDULE_REVISION_STALE");
    if (update.revision === this.#snapshot.revision) {
      const candidate = makeSnapshot(update);
      if (snapshotFingerprint(candidate) !== snapshotFingerprint(this.#snapshot)) throw new Error("SCHEDULE_REVISION_CONFLICT");
      return { status: "replayed", revision: update.revision };
    }
    this.#snapshot = makeSnapshot(update);
    return { status: "applied", revision: update.revision };
  }
}

export async function publishDailySchedule(endpoint: string, update: DailyScheduleUpdate): Promise<DailyScheduleReplaceResult> {
  const base = endpoint.replace(/\/$/, "");
  const response = await fetch(`${base}/v1/edge/commands/schedule`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(update),
  });
  const body = await response.json() as Partial<DailyScheduleReplaceResult> & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `edge schedule update failed: ${response.status}`);
  if (body.status !== "applied" && body.status !== "replayed" || typeof body.revision !== "number") throw new Error("invalid edge schedule update response");
  return { status: body.status, revision: body.revision };
}

function makeSnapshot(update: DailyScheduleUpdate): DailyScheduleSnapshot {
  return {
    edgeId: update.edgeId,
    revision: update.revision,
    schedule: update.schedule,
    assets: new Map(update.assets.map((asset) => [asset.assetId, asset])),
  };
}

function snapshotFingerprint(snapshot: DailyScheduleSnapshot): string {
  return canonicalEdgeJson({
    edgeId: snapshot.edgeId,
    revision: snapshot.revision,
    schedule: snapshot.schedule,
    assets: [...snapshot.assets.values()].sort((left, right) => left.assetId.localeCompare(right.assetId)),
  });
}

function validateUpdate(update: DailyScheduleUpdate): void {
  if (update.contractVersion !== EDGE_SCHEDULE_CONTRACT_VERSION) throw new Error("SCHEDULE_CONTRACT_VERSION_INVALID");
  if (typeof update.edgeId !== "string" || update.edgeId.trim().length === 0) throw new Error("SCHEDULE_EDGE_ID_REQUIRED");
  if (!Number.isInteger(update.revision) || update.revision < 1) throw new Error("SCHEDULE_REVISION_INVALID");
  if (!Array.isArray(update.schedule?.slots) || update.schedule.slots.length !== 5760) throw new Error("SCHEDULE_SLOT_GRID_INVALID");
  if (!Array.isArray(update.assets)) throw new Error("SCHEDULE_ASSETS_INVALID");
  const identities = new Set<string>();
  for (const asset of update.assets) {
    if (identities.has(asset.assetId)) throw new Error(`SCHEDULE_ASSET_DUPLICATE:${asset.assetId}`);
    identities.add(asset.assetId);
  }
}
