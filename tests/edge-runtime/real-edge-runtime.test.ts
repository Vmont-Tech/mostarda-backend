import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildServer } from "../../apps/cloud-api/src/server.ts";
import { DemoCloudStore } from "../../packages/e2e-slice/src/cloud.ts";
import { createFastifyDemoClient } from "../../packages/e2e-slice/src/e2e.ts";
import { type DemoCloudClient, type DemoHttpResponse } from "../../packages/e2e-slice/src/edge.ts";
import {
  JsonEdgeStorage,
  RealEdgeRuntime,
  type EdgeRuntimeClock,
} from "../../packages/edge-runtime/src/index.ts";

class AvailabilityClient implements DemoCloudClient {
  #available = true;
  readonly delegate: DemoCloudClient;

  constructor(delegate: DemoCloudClient) {
    this.delegate = delegate;
  }

  setAvailable(available: boolean): void {
    this.#available = available;
  }

  get(path: string): Promise<DemoHttpResponse> {
    if (!this.#available) return Promise.reject(new Error("cloud unavailable"));
    return this.delegate.get(path);
  }

  post(path: string, payload: unknown): Promise<DemoHttpResponse> {
    if (!this.#available) return Promise.reject(new Error("cloud unavailable"));
    return this.delegate.post(path, payload);
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
  const store = new DemoCloudStore();
  const server = buildServer({ demoMode: true, demoStore: store });
  const client = new AvailabilityClient(createFastifyDemoClient(server));

  try {
    const firstStorage = new JsonEdgeStorage(root);
    const first = new RealEdgeRuntime({
      edgeId: "edge-real-test-001",
      environment: "test",
      storage: firstStorage,
      cloud: client,
      clock: new FixedClock(),
    });
    await first.start();
    await first.sync();
    client.setAvailable(false);
    const firstPlayback = await first.playCached();
    assert.equal(firstPlayback.completed, true);
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
    assert.equal(resumedPlayback.completed, true);
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
  const store = new DemoCloudStore();
  const server = buildServer({ demoMode: true, demoStore: store });
  const client = createFastifyDemoClient(server);
  try {
    const runtime = new RealEdgeRuntime({
      edgeId: "edge-real-test-002",
      environment: "test",
      storage: new JsonEdgeStorage(root),
      cloud: {
        get: async (url) => {
          const response = await client.get(url);
          if (url.includes("assets")) {
            const asset = response.json<Record<string, unknown>>();
            return { ...response, json: <T>() => ({ ...asset, digest: "tampered" } as T) };
          }
          return response;
        },
        post: client.post.bind(client),
      },
      clock: new FixedClock(),
    });
    await assert.rejects(() => runtime.sync(), /asset integrity check failed/);
  } finally {
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});
