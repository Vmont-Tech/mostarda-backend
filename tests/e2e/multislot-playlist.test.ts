import test from "node:test";
import assert from "node:assert/strict";

import { InMemoryE2ESingleSlotStore } from "../../apps/cloud-api/src/e2e-single-slot-store.ts";
import { buildServer } from "../../apps/cloud-api/src/server.ts";
import { createEdgePlaylistContentServer } from "../../packages/edge-runtime/src/playlist-content-server.ts";
import { createHttpEdgeCloudClient } from "../../packages/edge-runtime/src/cloud-client.ts";
import { EdgePlaylistRuntime } from "../../packages/edge-runtime/src/playlist-runtime.ts";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("lists every assigned slot in deterministic order for a campaign playlist", () => {
  const store = new InMemoryE2ESingleSlotStore();
  store.createCampaign({ campaignId: "campaign-playlist", name: "Playlist lab" });
  store.createSlot({ campaignId: "campaign-playlist", slotId: "slot-002", durationSeconds: 15 });
  store.createSlot({ campaignId: "campaign-playlist", slotId: "slot-001", durationSeconds: 15 });
  store.publishCreative({ creativeId: "creative-1", mediaType: "text/html", content: "<p>one</p>" });
  store.publishCreative({ creativeId: "creative-2", mediaType: "text/html", content: "<p>two</p>" });
  store.assignCreative("slot-002", "creative-2");
  store.assignCreative("slot-001", "creative-1");

  assert.deepEqual(store.manifests("campaign-playlist").map((manifest) => manifest.slotId), ["slot-001", "slot-002"]);
});

test("publishes the playlist through the laboratory Edge surface", async () => {
  const store = new InMemoryE2ESingleSlotStore();
  store.createCampaign({ campaignId: "campaign-api", name: "Playlist API lab" });
  store.createSlot({ campaignId: "campaign-api", slotId: "slot-001", durationSeconds: 15 });
  store.publishCreative({ creativeId: "creative-api", mediaType: "text/html", content: "<p>api</p>" });
  store.assignCreative("slot-001", "creative-api");
  const server = buildServer({ singleSlotStore: store });
  try {
    const response = await server.inject({ method: "GET", url: "/v1/edge/campaigns/campaign-api/manifests" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().manifests.map((manifest: { slotId: string }) => manifest.slotId), ["slot-001"]);
  } finally {
    await server.close();
  }
});

test("syncs and serves every slot through the shared visual Player shell", async () => {
  const store = new InMemoryE2ESingleSlotStore();
  store.createCampaign({ campaignId: "campaign-playback", name: "Playback campaign" });
  store.createSlot({ campaignId: "campaign-playback", slotId: "slot-002", durationSeconds: 15 });
  store.createSlot({ campaignId: "campaign-playback", slotId: "slot-001", durationSeconds: 15 });
  store.publishCreative({ creativeId: "creative-001", mediaType: "text/html", content: "<main>ONE</main>" });
  store.publishCreative({ creativeId: "creative-002", mediaType: "text/html", content: "<main>TWO</main>" });
  store.assignCreative("slot-001", "creative-001");
  store.assignCreative("slot-002", "creative-002");
  const cloud = buildServer({ singleSlotStore: store });
  const root = await mkdtemp(path.join(os.tmpdir(), "mostarda-playlist-runtime-"));
  // The runtime uses the actual local Cloud port below.
  await cloud.listen({ host: "127.0.0.1", port: 0 });
  const address = cloud.server.address();
  if (address === null || typeof address === "string") throw new Error("Cloud did not expose a TCP address");
  const runtime = new EdgePlaylistRuntime({
    edgeId: "edge-playlist-test",
    environment: "test",
    storageRoot: root,
    cloud: createHttpEdgeCloudClient(`http://127.0.0.1:${address.port}`),
  });
  const server = createEdgePlaylistContentServer(runtime);
  try {
    const manifests = await runtime.sync("campaign-playback");
    assert.deepEqual(manifests.map((manifest) => manifest.slotId), ["slot-001", "slot-002"]);
    await new Promise<void>((resolve) => server.listen({ host: "127.0.0.1", port: 0 }, () => resolve()));
    const localAddress = server.address();
    if (localAddress === null || typeof localAddress === "string") throw new Error("Playlist server did not expose a TCP address");
    const playlist = await fetch(`http://127.0.0.1:${localAddress.port}/playlist`);
    assert.equal(playlist.status, 200);
    assert.equal((await playlist.json() as { manifests: readonly unknown[] }).manifests.length, 2);
    assert.equal((await fetch(`http://127.0.0.1:${localAddress.port}/playback/slot-001`, { method: "POST" })).status, 202);
    assert.equal((await fetch(`http://127.0.0.1:${localAddress.port}/playback/slot-002`, { method: "POST" })).status, 202);
    const events = await cloud.inject({ method: "GET", url: "/v1/edge/playback-events" });
    assert.equal(events.statusCode, 200);
    assert.equal((events.json() as { events: readonly unknown[] }).events.length, 0);
    await runtime.flush();
    const flushed = await cloud.inject({ method: "GET", url: "/v1/edge/playback-events" });
    assert.equal((flushed.json() as { events: readonly unknown[] }).events.length, 2);
  } finally {
    await server.close();
    await cloud.close();
    await rm(root, { recursive: true, force: true });
  }
});
