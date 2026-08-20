import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildServer } from "../apps/cloud-api/src/server.ts";
import { createEdgeRuntimeFixtureStore } from "../apps/cloud-api/src/edge-runtime-store.ts";
import { createHttpEdgeCloudClient, JsonEdgeStorage, RealEdgeRuntime } from "../packages/edge-runtime/src/index.ts";

const root = await mkdtemp(path.join(os.tmpdir(), "mostarda-real-edge-e2e-"));
const campaignId = "campaign-runtime-e2e-001";
const cloud = createEdgeRuntimeFixtureStore(campaignId);
const server = buildServer({ edgeRuntimeStore: cloud });
try {
  await server.listen({ host: "127.0.0.1", port: 0 });
  const address = server.server.address();
  if (address === null || typeof address === "string") throw new Error("Cloud API did not expose a TCP address");
  const client = createHttpEdgeCloudClient(`http://127.0.0.1:${address.port}`);
  const runtime = new RealEdgeRuntime({
    edgeId: "edge-runtime-e2e-001",
    environment: "development",
    storage: new JsonEdgeStorage(root),
    cloud: client,
  });
  await runtime.start();
  await runtime.sync(campaignId);
  const playback = await runtime.playCached();
  await runtime.flush();
  console.log(JSON.stringify({
    mode: "SOFTWARE_VERIFIED",
    runtime: await runtime.diagnostics(),
    playback,
    cloudTelemetry: cloud.telemetryEvents().length,
    cloudPlaybackEvents: cloud.playbackEvents().length,
  }, null, 2));
} finally {
  await server.close();
  await rm(root, { recursive: true, force: true });
}
