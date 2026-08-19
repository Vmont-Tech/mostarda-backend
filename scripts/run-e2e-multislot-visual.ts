import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { PostgresE2ESingleSlotStore } from "../apps/cloud-api/src/e2e-single-slot-store.ts";
import { buildServer } from "../apps/cloud-api/src/server.ts";
import { createEdgePlaylistContentServer, createHttpEdgeCloudClient, EdgePlaylistRuntime, JsonEdgeStorage, allocateAtomicSlots, readMp4DurationSeconds } from "../packages/edge-runtime/src/index.ts";

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
const media = await Promise.all(paths.map(async (filePath, index) => {
  const bytes = await readFile(filePath);
  if (!filePath.toLowerCase().endsWith(".mp4")) throw new Error(`Only .mp4 is supported: ${filePath}`);
  return { filePath, bytes, durationSeconds: readMp4DurationSeconds(bytes), creativeId: `creative-multislot-${index + 1}` };
}));
const availableSlotIds = Array.from({ length: 96 }, (_, index) => `slot-multislot-${String(index + 1).padStart(3, "0")}`);
const allocation = allocateAtomicSlots({ availableSlotIds, items: media.map((item) => ({ creativeId: item.creativeId, durationSeconds: item.durationSeconds })) });
const pool = new Pool({ connectionString: databaseUrl });
const store = new PostgresE2ESingleSlotStore(pool);
const cloud = buildServer({ logger: true, singleSlotStore: store });
await cloud.listen({ host: "0.0.0.0", port: cloudPort });
await store.createCampaign({ campaignId, name: "Mostarda multi-slot visual lab" });
for (const [index, item] of media.entries()) {
  const planned = allocation.items[index]!;
  for (const slotId of planned.slotIds) {
    await store.createSlot({ slotId, campaignId, durationSeconds: slotId === planned.slotIds[0] ? Math.ceil(item.durationSeconds) : 15 });
  }
  await store.publishCreative({ creativeId: item.creativeId, mediaType: "video/mp4", content: item.bytes.toString("base64") });
  await store.assignCreative(planned.slotIds[0]!, item.creativeId);
}
const runtime = new EdgePlaylistRuntime({ edgeId, environment: "development", storageRoot, cloud: createHttpEdgeCloudClient(cloudEndpoint) });
await runtime.sync(campaignId);
const player = createEdgePlaylistContentServer(runtime);
await new Promise<void>((resolve) => player.listen({ host: edgeHost, port: edgePort }, () => resolve()));
console.log(JSON.stringify({ campaignId, playerUrl: `http://${advertisedHost}:${edgePort}/player`, playlistUrl: `http://${advertisedHost}:${edgePort}/playlist`, allocation: allocation.items, remainingSlotCount: allocation.remainingSlotIds.length, note: "Long creatives reserve ceil(duration/15) slots; one playback identity is retained per assigned slot and no creative is duplicated silently." }, null, 2));
const shutdown = async (): Promise<void> => { await player.close(); await cloud.close(); await pool.end(); };
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void shutdown().then(() => process.exit(0)); });
