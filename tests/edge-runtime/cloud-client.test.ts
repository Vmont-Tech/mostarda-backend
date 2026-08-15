import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/cloud-api/src/server.ts";
import { createEdgeRuntimeFixtureStore } from "../../apps/cloud-api/src/edge-runtime-store.ts";
import { createHttpEdgeCloudClient, type EdgeCloudClient } from "../../packages/edge-runtime/src/index.ts";

test("HTTP Edge Cloud client uses the existing Cloud API Edge surface", async () => {
  const campaignId = "campaign-runtime-contract-001";
  const server = buildServer({ edgeRuntimeStore: createEdgeRuntimeFixtureStore(campaignId) });
  await server.listen({ host: "127.0.0.1", port: 0 });
  try {
    const address = server.server.address();
    assert.ok(address !== null && typeof address !== "string");
    const client = createHttpEdgeCloudClient(`http://127.0.0.1:${address.port}`);
    const manifest = await client.fetchManifest(campaignId);
    assert.equal(manifest.campaignId, campaignId);
    const asset = await client.fetchAsset(manifest.assetId);
    assert.equal(asset.creativeId, manifest.creativeId);
    assert.equal(await client.health(), true);
    const typed: EdgeCloudClient = client;
    assert.equal(typeof typed.sendTelemetry, "function");
  } finally {
    await server.close();
  }
});
