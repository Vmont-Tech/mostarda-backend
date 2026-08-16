import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildServer } from "../../apps/cloud-api/src/server.ts";
import { InMemoryE2ESingleSlotStore } from "../../apps/cloud-api/src/e2e-single-slot-store.ts";
import {
  createEdgeLocalContentServer,
  createHttpEdgeCloudClient,
  JsonEdgeStorage,
  RealEdgeRuntime,
  type EdgeCloudClient,
} from "../../packages/edge-runtime/src/index.ts";

class AvailabilityClient implements EdgeCloudClient {
  #available = true;
  readonly #delegate: EdgeCloudClient;

  constructor(delegate: EdgeCloudClient) {
    this.#delegate = delegate;
  }

  setAvailable(available: boolean): void {
    this.#available = available;
  }

  fetchManifest(campaignId: string) {
    return this.#run(() => this.#delegate.fetchManifest(campaignId));
  }

  fetchAsset(assetId: string) {
    return this.#run(() => this.#delegate.fetchAsset(assetId));
  }

  sendTelemetry(event: Parameters<EdgeCloudClient["sendTelemetry"]>[0]) {
    return this.#run(() => this.#delegate.sendTelemetry(event));
  }

  sendPlaybackEvent(event: Parameters<EdgeCloudClient["sendPlaybackEvent"]>[0]) {
    return this.#run(() => this.#delegate.sendPlaybackEvent(event));
  }

  sendEvidence(evidence: Parameters<EdgeCloudClient["sendEvidence"]>[0]) {
    return this.#run(() => this.#delegate.sendEvidence(evidence));
  }

  async health() {
    return this.#available && this.#delegate.health();
  }

  async #run<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.#available) throw new Error("cloud unavailable");
    return operation();
  }
}

test("single-slot E2E persists and replays PlaybackEvents across an offline interval", async () => {
  const cloudStore = new InMemoryE2ESingleSlotStore();
  const cloud = buildServer({ singleSlotStore: cloudStore });
  await cloud.listen({ host: "127.0.0.1", port: 0 });
  const cloudAddress = cloud.server.address();
  if (cloudAddress === null || typeof cloudAddress === "string") throw new Error("Cloud did not expose a TCP address");

  const root = await mkdtemp(path.join(os.tmpdir(), "mostarda-e2e-single-slot-"));
  const runtimeClient = new AvailabilityClient(createHttpEdgeCloudClient(`http://127.0.0.1:${cloudAddress.port}`));
  const runtime = new RealEdgeRuntime({
    edgeId: "edge-lab-001",
    environment: "test",
    storage: new JsonEdgeStorage(root),
    cloud: runtimeClient,
  });
  const localPlayer = createEdgeLocalContentServer(runtime);

  try {
    assert.equal((await cloud.inject({
      method: "POST",
      url: "/v1/e2e/campaigns",
      payload: { campaignId: "campaign-lab-001", name: "Lab campaign" },
    })).statusCode, 201);
    assert.equal((await cloud.inject({
      method: "POST",
      url: "/v1/e2e/campaigns/campaign-lab-001/slots",
      payload: { slotId: "slot-lab-001", durationSeconds: 15 },
    })).statusCode, 201);
    assert.equal((await cloud.inject({
      method: "POST",
      url: "/v1/e2e/creatives",
      payload: {
        creativeId: "creative-lab-001",
        mediaType: "text/html",
        content: "<main data-testid=creative>Mostarda física</main>",
      },
    })).statusCode, 201);
    assert.equal((await cloud.inject({
      method: "POST",
      url: "/v1/e2e/slots/slot-lab-001/creative",
      payload: { creativeId: "creative-lab-001" },
    })).statusCode, 200);

    await runtime.start();
    await runtime.sync("campaign-lab-001");

    await new Promise<void>((resolve) => localPlayer.listen({ host: "127.0.0.1", port: 0 }, () => resolve()));
    const localAddress = localPlayer.address();
    if (localAddress === null || typeof localAddress === "string") throw new Error("Local Player did not expose a TCP address");
    const player = await fetch(`http://127.0.0.1:${localAddress.port}/player`);
    const manifest = await fetch(`http://127.0.0.1:${localAddress.port}/manifest`);
    assert.equal(player.status, 200);
    assert.match(await player.text(), /PlaybackEvent/);
    assert.equal(manifest.status, 200);
    const manifestBody = await manifest.json() as { assetId: string };
    const asset = await fetch(`http://127.0.0.1:${localAddress.port}/assets/${manifestBody.assetId}`);
    assert.equal(asset.status, 200);
    assert.match(await asset.text(), /Mostarda física/);

    const onlinePlayback = await fetch(`http://127.0.0.1:${localAddress.port}/playback`, { method: "POST" });
    assert.equal(onlinePlayback.status, 202);

    runtimeClient.setAvailable(false);
    const offlinePlayback = await fetch(`http://127.0.0.1:${localAddress.port}/playback`, { method: "POST" });
    assert.equal(offlinePlayback.status, 202);
    assert.equal((await runtime.diagnostics()).playbackEventQueueSize, 2);

    runtimeClient.setAvailable(true);
    await runtime.flush();
    const events = await cloud.inject({ method: "GET", url: "/v1/edge/playback-events" });
    assert.equal(events.statusCode, 200);
    assert.equal((events.json() as { events: readonly unknown[] }).events.length, 2);

    const replay = (await runtimeClient.sendPlaybackEvent((events.json() as { events: any[] }).events[0]));
    assert.equal(replay, undefined);
    const afterReplay = await cloud.inject({ method: "GET", url: "/v1/edge/playback-events" });
    assert.equal((afterReplay.json() as { events: readonly unknown[] }).events.length, 2);
  } finally {
    await localPlayer.close();
    await cloud.close();
    await rm(root, { recursive: true, force: true });
  }
});
