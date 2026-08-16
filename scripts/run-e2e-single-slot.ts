import { Pool } from "pg";
import os from "node:os";
import path from "node:path";

import { PostgresE2ESingleSlotStore } from "../apps/cloud-api/src/e2e-single-slot-store.ts";
import { buildServer } from "../apps/cloud-api/src/server.ts";
import {
  createEdgeLocalContentServer,
  createHttpEdgeCloudClient,
  JsonEdgeStorage,
  RealEdgeRuntime,
} from "../packages/edge-runtime/src/index.ts";

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined) throw new Error("DATABASE_URL is required for the single-slot lab");

const campaignId = process.env.E2E_CAMPAIGN_ID ?? "campaign-lab-001";
const slotId = process.env.E2E_SLOT_ID ?? "slot-lab-001";
const creativeId = process.env.E2E_CREATIVE_ID ?? "creative-lab-001";
const cloudHost = process.env.CLOUD_HOST ?? "0.0.0.0";
const cloudPort = Number(process.env.CLOUD_PORT ?? "3333");
const edgeHost = process.env.EDGE_HOST ?? "0.0.0.0";
const edgePort = Number(process.env.EDGE_PLAYER_PORT ?? "4444");
const edgeId = process.env.EDGE_ID ?? "edge-lab-001";
const storageRoot = process.env.EDGE_STORAGE ?? path.join(os.tmpdir(), "mostarda-edge-e2e-lab");
const cloudEndpoint = process.env.CLOUD_ENDPOINT ?? `http://127.0.0.1:${cloudPort}`;

const pool = new Pool({ connectionString: databaseUrl });
const cloud = buildServer({
  logger: true,
  singleSlotStore: new PostgresE2ESingleSlotStore(pool),
});
await cloud.listen({ host: cloudHost, port: cloudPort });

await cloud.inject({ method: "POST", url: "/v1/e2e/campaigns", payload: { campaignId, name: "Mostarda physical lab" } });
await cloud.inject({ method: "POST", url: `/v1/e2e/campaigns/${campaignId}/slots`, payload: { slotId, durationSeconds: 15 } });
await cloud.inject({
  method: "POST",
  url: "/v1/e2e/creatives",
  payload: { creativeId, mediaType: "text/html", content: `<main data-mostarda-creative="${creativeId}"><h1>Mostarda</h1><p>Physical lab creative</p></main>` },
});
await cloud.inject({ method: "POST", url: `/v1/e2e/slots/${slotId}/creative`, payload: { creativeId } });

const runtime = new RealEdgeRuntime({
  edgeId,
  environment: "development",
  storage: new JsonEdgeStorage(storageRoot),
  cloud: createHttpEdgeCloudClient(cloudEndpoint),
});
await runtime.start();
await runtime.sync(campaignId);
const localPlayer = createEdgeLocalContentServer(runtime);
await new Promise<void>((resolve) => localPlayer.listen({ host: edgeHost, port: edgePort }, () => resolve()));

const advertisedHost = process.env.EDGE_ADVERTISED_HOST ?? os.hostname();
console.log(JSON.stringify({
  campaignId,
  slotId,
  creativeId,
  cloudEndpoint,
  playerUrl: `http://${advertisedHost}:${edgePort}/player`,
  offlineProcedure: "Stop Cloud connectivity after the first cache, keep the Player open, restore connectivity, then POST /flush on the local Edge.",
}, null, 2));

const shutdown = async (): Promise<void> => {
  await localPlayer.close();
  await cloud.close();
  await pool.end();
};
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => { void shutdown().then(() => process.exit(0)); });
}
