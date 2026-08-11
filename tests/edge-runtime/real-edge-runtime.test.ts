import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildServer } from "../../apps/cloud-api/src/server.ts";
import { createEdgeRuntimeFixtureStore } from "../../apps/cloud-api/src/edge-runtime-store.ts";
import {
  createHttpEdgeCloudClient,
  JsonEdgeStorage,
  RealEdgeRuntime,
  type EdgeCloudClient,
  type EdgeRuntimeClock,
} from "../../packages/edge-runtime/src/index.ts";

class AvailabilityClient implements EdgeCloudClient {
  #available = true;
  readonly delegate: EdgeCloudClient;

  constructor(delegate: EdgeCloudClient) {
    this.delegate = delegate;
  }

  setAvailable(available: boolean): void {
    this.#available = available;
  }

  fetchManifest(campaignId: string) {
    return this.#run(() => this.delegate.fetchManifest(campaignId));
  }

  fetchAsset(assetId: string) {
    return this.#run(() => this.delegate.fetchAsset(assetId));
  }

  sendTelemetry(event: Parameters<EdgeCloudClient["sendTelemetry"]>[0]) {
    return this.#run(() => this.delegate.sendTelemetry(event));
  }

  sendEvidence(evidence: Parameters<EdgeCloudClient["sendEvidence"]>[0]) {
    return this.#run(() => this.delegate.sendEvidence(evidence));
  }

  health() {
    return this.#run(() => this.delegate.health());
  }

  async #run<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.#available) throw new Error("cloud unavailable");
    return operation();
  }
}

class FixedClock implements EdgeRuntimeClock {
  #index = 0;

  next(): string {
    const value = new Date(Date.parse("2026-08-11T13:00:00.000Z") + this.#index * 1000).toISOString();
    this.#index += 1;
    return value;
  }
}

test("RealEdgeRuntime persists identity/content/queue and resumes offline after restart", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mostarda-edge-runtime-"));
  const campaignId = "campaign-runtime-test-001";
  const store = createEdgeRuntimeFixtureStore(campaignId);
  const server = buildServer({ edgeRuntimeStore: store });
  await server.listen({ host: "127.0.0.1", port: 0 });
  const address = server.server.address();
  if (address === null || typeof address === "string") throw new Error("Cloud API did not expose a TCP address");
  const client = new AvailabilityClient(createHttpEdgeCloudClient(`http://127.0.0.1:${address.port}`));

  try {
    const first = new RealEdgeRuntime({
      edgeId: "edge-real-test-001",
      environment: "test",
      storage: new JsonEdgeStorage(root),
      cloud: client,
      clock: new FixedClock(),
    });
    await first.start();
    await first.sync(campaignId);
    client.setAvailable(false);
    const firstPlayback = await first.playCached();
    assert.equal(firstPlayback.status, "COMPLETED");
    assert.equal((await first.diagnostics()).queueSize, 5);

    const restarted = new RealEdgeRuntime({
      edgeId: "edge-real-test-001",
      environment: "test",
      storage: new JsonEdgeStorage(root),
      cloud: client,
      clock: new FixedClock(),
    });
    await restarted.start();
    assert.equal((await restarted.diagnostics()).manifestCached, true);
    assert.equal((await restarted.diagnostics()).assetCached, true);
    const resumedPlayback = await restarted.playCached();
    assert.equal(resumedPlayback.status, "COMPLETED");
    assert.equal((await restarted.diagnostics()).queueSize, 8);

    client.setAvailable(true);
    await restarted.flush();
    assert.equal((await restarted.diagnostics()).queueSize, 0);
    assert.equal(store.evidenceRecords().length, 2);
  } finally {
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("RealEdgeRuntime refuses unverified or mismatched assets", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mostarda-edge-runtime-"));
  const campaignId = "campaign-runtime-integrity-001";
  const store = createEdgeRuntimeFixtureStore(campaignId);
  const server = buildServer({ edgeRuntimeStore: store });
  await server.listen({ host: "127.0.0.1", port: 0 });
  const address = server.server.address();
  if (address === null || typeof address === "string") throw new Error("Cloud API did not expose a TCP address");
  const client = createHttpEdgeCloudClient(`http://127.0.0.1:${address.port}`);
  try {
    const runtime = new RealEdgeRuntime({
      edgeId: "edge-real-test-002",
      environment: "test",
      storage: new JsonEdgeStorage(root),
      cloud: {
        ...client,
        fetchAsset: async (assetId) => ({ ...await client.fetchAsset(assetId), digest: "tampered" }),
      },
      clock: new FixedClock(),
    });
    await assert.rejects(() => runtime.sync(campaignId), /asset integrity check failed/);
  } finally {
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});
