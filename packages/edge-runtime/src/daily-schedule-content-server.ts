import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { EdgeAsset } from "./cloud-contracts.ts";
import { PLAYER_HTML } from "./player-html.ts";
import { currentDailySlot, type DailySlot, type DailySlotSchedule } from "./daily-slot-schedule.ts";
import { InMemoryDailyScheduleStore, type DailyScheduleUpdate } from "./daily-schedule-store.ts";

export interface DailyScheduleContentServerOptions {
  readonly schedule?: DailySlotSchedule;
  readonly assets?: ReadonlyMap<string, EdgeAsset>;
  readonly scheduleStore?: InMemoryDailyScheduleStore;
  readonly edgeId?: string;
  /** Prepares referenced campaign assets before atomically replacing the schedule. */
  readonly beforeScheduleReplace?: (update: DailyScheduleUpdate) => Promise<void>;
  readonly onPlayback?: (slot: DailySlot) => void | Promise<void>;
  readonly diagnostics?: () => Promise<unknown>;
  readonly flush?: () => Promise<void>;
}

/** Local content server that chooses exactly one slot from the local wall clock. */
export function createDailyScheduleContentServer(options: DailyScheduleContentServerOptions): Server {
  const scheduleStore = options.scheduleStore ?? new InMemoryDailyScheduleStore({
    contractVersion: "edge-schedule-v1",
    edgeId: options.edgeId ?? "edge-local",
    revision: 1,
    schedule: options.schedule ?? (() => { throw new Error("schedule is required"); })(),
    assets: [...(options.assets?.values() ?? [])],
  });
  const emittedPlaybackKeys = new Set<string>();
  return createServer((request, response) => {
    void handleRequest(options, scheduleStore, emittedPlaybackKeys, request, response).catch(() => {
      if (!response.headersSent) response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "daily_schedule_request_failed" }));
    });
  });
}

async function handleRequest(options: DailyScheduleContentServerOptions, scheduleStore: InMemoryDailyScheduleStore, emittedPlaybackKeys: Set<string>, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://edge.local");
  if (method === "GET" && url.pathname === "/player") return send(response, 200, "text/html; charset=utf-8", PLAYER_HTML);
  if (method === "POST" && url.pathname === "/v1/edge/commands/schedule") {
    try {
      const update = await readJson(request) as DailyScheduleUpdate;
      await options.beforeScheduleReplace?.(update);
      const result = scheduleStore.replace(update);
      return sendJson(response, result.status === "applied" ? 202 : 200, result);
    } catch (error) {
      return sendJson(response, 409, { error: error instanceof Error ? error.message : "schedule_update_rejected" });
    }
  }
  if (method === "GET" && url.pathname === "/schedule/current") {
    const snapshot = scheduleStore.snapshot();
    const schedule = snapshot.schedule;
    const at = url.searchParams.get("at");
    const now = at === null ? new Date() : new Date(at);
    if (Number.isNaN(now.getTime())) return sendJson(response, 400, { error: "invalid_schedule_time" });
    const slot = currentDailySlot(schedule, now);
    const seconds = Number(new Intl.DateTimeFormat("en-US", {
      ...(schedule.timezone === "local" ? {} : { timeZone: schedule.timezone }),
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now).find((part) => part.type === "second")?.value ?? "0");
    const millisecondsIntoSlot = ((seconds % 15) * 1000) + now.getMilliseconds();
    const nextSlotInMs = Math.max(1, Math.ceil(15_000 - millisecondsIntoSlot));
    const localDate = new Intl.DateTimeFormat("en-CA", { ...(schedule.timezone === "local" ? {} : { timeZone: schedule.timezone }), year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    return sendJson(response, 200, { ...slot, scheduleRevision: snapshot.revision, playbackKey: `${localDate}:${slot.slotIndex}`, assetUrl: `/assets/${encodeURIComponent(slot.content.assetId)}`, nextSlotInMs, slotEndsAt: now.getTime() + nextSlotInMs });
  }
  if (method === "GET" && url.pathname.startsWith("/assets/")) {
    const parts = url.pathname.slice("/assets/".length).split("/").filter(Boolean);
    const assetId = decodeURIComponent(parts.at(-1) ?? "");
    const asset = scheduleStore.snapshot().assets.get(assetId);
    return asset === undefined ? sendJson(response, 404, { error: "scheduled_asset_not_found" }) : sendAsset(response, asset);
  }
  if (method === "POST" && url.pathname.startsWith("/playback/")) {
    const snapshot = scheduleStore.snapshot();
    const slotId = decodeURIComponent(url.pathname.slice("/playback/".length));
    const slot = snapshot.schedule.slots.find((candidate) => candidate.slotId === slotId);
    if (slot === undefined) return sendJson(response, 404, { error: "scheduled_slot_not_found" });
    const playbackKey = url.searchParams.get("playbackKey") ?? slotId;
    const emittedKey = `${snapshot.revision}:${playbackKey}`;
    if (emittedPlaybackKeys.has(emittedKey)) return sendJson(response, 200, { accepted: true, deduplicated: true, slotId, playbackKey });
    emittedPlaybackKeys.add(emittedKey);
    await options.onPlayback?.(slot);
    return sendJson(response, 202, { accepted: true, slotId, playbackKey });
  }
  if (method === "GET" && url.pathname === "/health") return sendJson(response, 200, { status: "ok" });
  if (method === "GET" && url.pathname === "/diagnostics") return sendJson(response, 200, await options.diagnostics?.() ?? { health: "READY" });
  if (method === "POST" && url.pathname === "/flush") { await options.flush?.(); return sendJson(response, 202, { flushed: true }); }
  return sendJson(response, 404, { error: "not_found" });
}

function sendAsset(response: ServerResponse, asset: EdgeAsset): void {
  if (asset.mediaType === "video/mp4") {
    const bytes = Buffer.from(asset.content, "base64");
    response.writeHead(200, { "content-type": asset.mediaType, "cache-control": "no-store" });
    response.end(bytes);
    return;
  }
  send(response, 200, asset.mediaType, asset.content);
}
async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > 8 * 1024 * 1024) throw new Error("schedule_update_payload_too_large");
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function sendJson(response: ServerResponse, status: number, value: unknown): void { send(response, status, "application/json; charset=utf-8", JSON.stringify(value)); }
function send(response: ServerResponse, status: number, contentType: string, body: string | Uint8Array): void { response.writeHead(status, { "content-type": contentType, "cache-control": "no-store" }); response.end(body); }
