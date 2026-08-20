import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { PostgresE2ESingleSlotStore } from "../apps/cloud-api/src/e2e-single-slot-store.ts";
import { buildServer } from "../apps/cloud-api/src/server.ts";
import { assetDigest, buildDailySlotSchedule, createDailyScheduleContentServer, createHttpEdgeCloudClient, EdgePlaylistRuntime, EDGE_CLOUD_CONTRACT_VERSION, InMemoryDailyScheduleStore, JsonEdgeStorage, allocateAtomicSlots, parseDailySlotIndices, publishDailySchedule, readMp4DurationSeconds, type EdgeAsset, type EdgeMediaType } from "../packages/edge-runtime/src/index.ts";

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined) throw new Error("DATABASE_URL is required");
const paths = (process.env.E2E_VIDEO_PATHS ?? "").split(";").map((value) => value.trim()).filter(Boolean);
if (paths.length === 0) throw new Error("E2E_VIDEO_PATHS must contain one or more .mp4 paths separated by ';'");
const campaignId = process.env.E2E_CAMPAIGN_ID ?? `campaign-multislot-lab-${Date.now()}`;
const cloudPort = Number(process.env.CLOUD_PORT ?? "3333");
const edgePort = Number(process.env.EDGE_PLAYER_PORT ?? "4444");
const cloudEndpoint = process.env.CLOUD_ENDPOINT ?? `http://127.0.0.1:${cloudPort}`;
const edgeHost = process.env.EDGE_HOST ?? "0.0.0.0";
const advertisedHost = process.env.EDGE_ADVERTISED_HOST ?? os.hostname();
const edgeId = process.env.EDGE_ID ?? "edge-lab-001";
const storageRoot = process.env.EDGE_STORAGE ?? path.join(os.tmpdir(), "mostarda-edge-multislot-lab");
const slotPrefix = process.env.E2E_SLOT_PREFIX ?? `slot-multislot-${Date.now()}`;
const configuredAdStarts = parseDailySlotIndices(process.env.E2E_AD_START_SLOTS);
const configuredAdStart = process.env.E2E_AD_START_SLOT === undefined ? undefined : parseDailySlotIndices(process.env.E2E_AD_START_SLOT)[0];
const media = await Promise.all(paths.map(async (filePath, index) => {
  const bytes = await readFile(filePath);
  if (!filePath.toLowerCase().endsWith(".mp4")) throw new Error(`Only .mp4 is supported: ${filePath}`);
  return { filePath, bytes, durationSeconds: readMp4DurationSeconds(bytes), creativeId: `${campaignId}-creative-${index + 1}` };
}));
const availableSlotIds = Array.from({ length: 5760 }, (_, index) => `${slotPrefix}-${String(index + 1).padStart(4, "0")}`);
const allocation = allocateAtomicSlots({ availableSlotIds, items: media.map((item) => ({ creativeId: item.creativeId, durationSeconds: item.durationSeconds })) });
const pool = new Pool({ connectionString: databaseUrl });
const store = new PostgresE2ESingleSlotStore(pool);
const cloud = buildServer({ logger: true, singleSlotStore: store, dailySchedulePublisher: (targetEdgeId, update) => {
  if (targetEdgeId !== edgeId) throw new Error("schedule edge identity mismatch");
  return publishDailySchedule(`http://127.0.0.1:${edgePort}`, update);
} });
await cloud.listen({ host: "0.0.0.0", port: cloudPort });
await store.createCampaign({ campaignId, name: "Mostarda multi-slot visual lab" });
for (const [index, item] of media.entries()) {
  const planned = allocation.items[index]!;
  for (const slotId of planned.slotIds) {
    await store.createSlot({ slotId, campaignId, durationSeconds: Math.max(1, Math.ceil(Math.min(15, Math.max(0.0001, item.durationSeconds - planned.slotIds.indexOf(slotId) * 15)))) });
  }
  await store.publishCreative({ creativeId: item.creativeId, mediaType: "video/mp4", content: item.bytes.toString("base64") });
  for (const slotId of planned.slotIds) await store.assignCreative(slotId, item.creativeId);
}
const runtime = new EdgePlaylistRuntime({ edgeId, environment: "development", storageRoot, cloud: createHttpEdgeCloudClient(cloudEndpoint) });
const manifests = await runtime.sync(campaignId);
const assets = new Map<string, EdgeAsset>();
for (const manifest of manifests) {
  const asset = await runtime.localAsset(manifest.slotId, manifest.assetId);
  if (asset !== undefined) assets.set(asset.assetId, asset);
}
const fallbackPaths = (process.env.E2E_INSTITUTIONAL_VIDEO_PATHS ?? "").split(";").map((value) => value.trim()).filter(Boolean);
const fallbackDefinitions = [
  { actor: "MOSTARDA" as const, contentId: "institutional-mostarda", label: "Mostarda" },
  { actor: "SPACE_OWNER" as const, contentId: "institutional-space-owner", label: "Proprietário do espaço" },
  ...(process.env.E2E_INFLUENCER_ENABLED === "false" ? [] : [{ actor: "INFLUENCER" as const, contentId: "institutional-influencer", label: "Influenciador" }]),
];
for (const [index, fallback] of fallbackDefinitions.entries()) {
  const filePath = fallbackPaths[index];
  const mediaType: EdgeMediaType = filePath === undefined ? "text/html" : "video/mp4";
  const content = filePath === undefined
    ? `<main style="font:700 8vw sans-serif;color:#f4c400;display:grid;place-items:center;height:100vh;background:#111">${fallback.label}</main>`
    : (await readFile(filePath)).toString("base64");
  assets.set(`${fallback.contentId}:asset`, {
    contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
    assetId: `${fallback.contentId}:asset`,
    creativeId: fallback.contentId,
    mediaType,
    content,
    digest: assetDigest(mediaType, content),
  });
}
const schedule = buildDailySlotSchedule({
  timezone: process.env.E2E_SCHEDULE_TIMEZONE ?? "local",
  advertiser: media.map((item, index) => ({
    campaignId,
    slotId: allocation.items[index]!.slotIds[0]!,
    segmentSlotIds: allocation.items[index]!.slotIds,
    ...((configuredAdStarts[index] ?? (index === 0 ? configuredAdStart : undefined)) === undefined ? {} : { startSlotIndex: configuredAdStarts[index] ?? configuredAdStart }),
    creativeId: item.creativeId,
    durationSeconds: item.durationSeconds,
    mediaType: "video/mp4",
    assetId: `${item.creativeId}:asset`,
  })),
  fallbacks: fallbackDefinitions.map((fallback) => ({ actor: fallback.actor, contentId: fallback.contentId, durationSeconds: 15, mediaType: assets.get(`${fallback.contentId}:asset`)!.mediaType, assetId: `${fallback.contentId}:asset` })),
});
const scheduleStore = new InMemoryDailyScheduleStore({
  contractVersion: "edge-schedule-v1",
  edgeId,
  revision: 1,
  schedule,
  assets: [...assets.values()],
});
const player = createDailyScheduleContentServer({
  scheduleStore,
  edgeId,
  beforeScheduleReplace: async (update) => {
    const campaigns = new Set(update.schedule.slots
      .filter((slot) => slot.content.actor === "ADVERTISER" && slot.content.campaignId !== undefined)
      .map((slot) => slot.content.campaignId!));
    for (const scheduledCampaignId of campaigns) await runtime.sync(scheduledCampaignId);
  },
  diagnostics: () => runtime.diagnostics(),
  flush: () => runtime.flush(),
  onPlayback: async (slot) => {
    if (slot.content.actor === "ADVERTISER") await runtime.playSlot(slot.content.slotId);
  },
});
await new Promise<void>((resolve) => player.listen({ host: edgeHost, port: edgePort }, () => resolve()));
console.log(JSON.stringify({ campaignId, playerUrl: `http://${advertisedHost}:${edgePort}/player`, scheduleUrl: `http://${advertisedHost}:${edgePort}/schedule/current`, dailySlotCount: schedule.slots.length, advertiserSlotCount: schedule.advertiserSlotCount, institutionalSlotCount: schedule.institutionalSlotCount, allocation: allocation.items, remainingSlotCount: allocation.remainingSlotIds.length, note: "The daily grid has 5760 local-time slots; unoccupied slots are filled by institutional fallbacks and long creatives use consecutive 15-second segments." }, null, 2));
const shutdown = async (): Promise<void> => { await player.close(); await cloud.close(); await pool.end(); };
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void shutdown().then(() => process.exit(0)); });
