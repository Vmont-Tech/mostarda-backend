import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createEdgeRuntimeFromSettings, loadEdgeRuntimeSettings } from "../../packages/edge-runtime/src/index.ts";

test("loads external Edge Runtime settings without interpreting the Cloud endpoint", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mostarda-edge-config-"));
  try {
    const file = path.join(root, "edge-runtime.json");
    await writeFile(
      file,
      JSON.stringify({
        schemaVersion: 1,
        edgeId: "edge-config-test-001",
        environment: "test",
        cloudEndpoint: "https://cloud.example.test",
        syncIntervalSeconds: 60,
        cacheDirectory: "./cache",
        telemetryRetry: { maxAttempts: 3, backoffMs: 250 },
        player: { mode: "browser", enabled: true },
      }),
      "utf8",
    );

    const settings = await loadEdgeRuntimeSettings(file);
    assert.deepEqual(settings, {
      schemaVersion: 1,
      edgeId: "edge-config-test-001",
      environment: "test",
      cloudEndpoint: "https://cloud.example.test",
      syncIntervalSeconds: 60,
      cacheDirectory: "./cache",
      telemetryRetry: { maxAttempts: 3, backoffMs: 250 },
      player: { mode: "browser", enabled: true },
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects invalid external Edge Runtime settings instead of guessing defaults", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mostarda-edge-config-"));
  try {
    const file = path.join(root, "edge-runtime.json");
    await writeFile(
      file,
      JSON.stringify({
        schemaVersion: 1,
        edgeId: "edge-config-test-002",
        environment: "test",
        cloudEndpoint: "not-a-url",
        syncIntervalSeconds: 0,
        cacheDirectory: "",
        telemetryRetry: { maxAttempts: 0, backoffMs: -1 },
        player: { mode: "unknown", enabled: true },
      }),
      "utf8",
    );

    await assert.rejects(
      () => loadEdgeRuntimeSettings(file),
      /invalid Edge Runtime settings/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("builds a runtime from external settings with a transport supplied by the environment", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mostarda-edge-config-"));
  try {
    const file = path.join(root, "edge-runtime.json");
    await writeFile(
      file,
      JSON.stringify({
        schemaVersion: 1,
        edgeId: "edge-config-test-003",
        environment: "test",
        cloudEndpoint: "https://cloud.example.test",
        syncIntervalSeconds: 60,
        cacheDirectory: "./cache",
        telemetryRetry: { maxAttempts: 3, backoffMs: 250 },
        player: { mode: "browser", enabled: true },
      }),
      "utf8",
    );
    const runtime = await createEdgeRuntimeFromSettings(file, {
      cloud: {
        fetchManifest: async () => { throw new Error("offline"); },
        fetchAsset: async () => { throw new Error("offline"); },
        sendTelemetry: async () => { throw new Error("offline"); },
        sendEvidence: async () => { throw new Error("offline"); },
        health: async () => false,
      },
    });
    await runtime.start();
    assert.equal((await runtime.diagnostics()).edgeId, "edge-config-test-003");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
