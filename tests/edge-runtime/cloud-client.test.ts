import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/cloud-api/src/server.ts";
import { DemoCloudStore } from "../../packages/e2e-slice/src/cloud.ts";
import { createHttpEdgeCloudClient } from "../../packages/edge-runtime/src/index.ts";

test("HTTP Edge Cloud client uses the existing Cloud API without a second transport", async () => {
  const server = buildServer({ demoMode: true, demoStore: new DemoCloudStore() });
  await server.listen({ host: "127.0.0.1", port: 0 });
  try {
    const address = server.server.address();
    assert.ok(address !== null && typeof address !== "string");
    const client = createHttpEdgeCloudClient(`http://127.0.0.1:${address.port}`);
    const response = await client.get("/v1/demo/manifests/campaign-demo-001");
    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ campaignId: string }>().campaignId, "campaign-demo-001");
  } finally {
    await server.close();
  }
});
