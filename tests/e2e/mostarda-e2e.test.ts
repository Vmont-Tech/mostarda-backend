import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/cloud-api/src/server.ts";
import {
  DEMO_CAMPAIGN_ID,
  DEMO_CONTRACT_REGISTRY,
  DEMO_EDGE_ID,
  DemoCloudStore,
  SimulatedEdge,
} from "../../packages/e2e-slice/src/index.ts";
import { runMostardaE2E, createFastifyDemoClient } from "../../packages/e2e-slice/src/e2e.ts";

test("walking skeleton completes Cloud → Edge → Player → Telemetry → Evidence", async () => {
  const result = await runMostardaE2E();

  assert.equal(result.environment, "DEVELOPMENT_SIMULATION");
  assert.equal(result.offlineMode, "in-memory offline simulation");
  assert.equal(result.edgeId, DEMO_EDGE_ID);
  assert.equal(result.campaignId, DEMO_CAMPAIGN_ID);
  assert.equal(result.playback.completed, true);
  assert.deepEqual(result.events.map((event) => event.type), [
    "edge.started",
    "manifest.synced",
    "player.started",
    "playback.started",
    "playback.completed",
    "telemetry.sent",
  ]);
  assert.equal(result.evidence.status, "PLAYBACK_COMPLETED");
  assert.equal(result.evidence.audienceClaim, false);
  assert.equal(result.cloudEvidenceCount, 1);
});

test("cached content continues playing while Cloud is unavailable", async () => {
  const cloud = new DemoCloudStore();
  const server = buildServer({ demoMode: true, demoStore: cloud });
  const edge = new SimulatedEdge({ edgeId: DEMO_EDGE_ID, cloud: createFastifyDemoClient(server) });

  try {
    await edge.start();
    await edge.sync();
    assert.equal(edge.localState().manifestCached, true);
    assert.equal(edge.localState().assetCached, true);
    assert.equal(edge.localState().storageMode, "in-memory offline simulation");

    edge.setCloudAvailability(false);
    const playback = await edge.playCached();

    assert.equal(playback.completed, true);
    assert.equal(edge.localState().queuedTelemetry, 5);
    assert.equal(cloud.telemetryEvents().length, 0);

    edge.setCloudAvailability(true);
    await edge.flushTelemetry();
    assert.equal(cloud.telemetryEvents().length, 6);
    assert.equal(cloud.evidenceRecords().length, 1);
  } finally {
    await server.close();
  }
});

test("demo routes are not exposed when demo mode is disabled", async () => {
  const server = buildServer();
  try {
    const response = await server.inject({
      method: "GET",
      url: `/v1/demo/manifests/${DEMO_CAMPAIGN_ID}`,
    });
    assert.equal(response.statusCode, 404);
  } finally {
    await server.close();
  }
});

test("demo API exposes only the deterministic campaign contract and idempotent telemetry", async () => {
  const store = new DemoCloudStore();
  const server = buildServer({ demoMode: true, demoStore: store });
  try {
    const campaign = await server.inject({ method: "GET", url: "/v1/demo/campaigns/demo" });
    const player = await server.inject({ method: "GET", url: "/player" });
    const playerScript = await server.inject({ method: "GET", url: "/player/player.js" });
    const manifest = await server.inject({ method: "GET", url: `/v1/demo/manifests/${DEMO_CAMPAIGN_ID}` });
    const asset = await server.inject({ method: "GET", url: "/v1/demo/assets/asset-demo-001" });
    assert.equal(campaign.statusCode, 200);
    assert.equal(campaign.json().environment, "DEVELOPMENT_SIMULATION");
    assert.equal(playerScript.statusCode, 200);
    assert.equal(manifest.statusCode, 200);
    assert.equal(asset.statusCode, 200);
    assert.match(player.body, /Mostarda Player/);
    assert.match(playerScript.body, /playback\.completed/);
    assert.equal(manifest.json().creativeId, asset.json().creativeId);

    const event = {
      environment: "DEVELOPMENT_SIMULATION",
      contractOrigin: DEMO_CONTRACT_REGISTRY.DemoTelemetryEvent.origin,
      eventId: "demo:event:1",
      type: "playback.started",
      edgeId: DEMO_EDGE_ID,
      occurredAt: "2026-08-11T12:00:00.000Z",
      payload: { source: "test" },
    };
    const first = await server.inject({ method: "POST", url: "/v1/demo/telemetry", payload: event });
    const duplicate = await server.inject({ method: "POST", url: "/v1/demo/telemetry", payload: event });
    assert.equal(first.statusCode, 202);
    assert.equal(duplicate.statusCode, 202);
    assert.equal(store.telemetryEvents().length, 1);
  } finally {
    await server.close();
  }
});

test("Cloud rejects tampered execution evidence", async () => {
  const store = new DemoCloudStore();
  const server = buildServer({ demoMode: true, demoStore: store });
  try {
    const response = await server.inject({
      method: "POST",
      url: "/v1/demo/evidence",
      payload: {
        environment: "DEVELOPMENT_SIMULATION",
        contractOrigin: DEMO_CONTRACT_REGISTRY.DemoEvidence.origin,
        evidenceId: "evidence-tampered",
        evidenceKind: "PLAYBACK_EXECUTION_OBSERVATION",
        status: "PLAYBACK_COMPLETED",
        campaignId: DEMO_CAMPAIGN_ID,
        creativeId: "creative-demo-001",
        edgeId: DEMO_EDGE_ID,
        playbackId: "playback-tampered",
        manifestVersion: "manifest-v1",
        startedAt: "2026-08-11T12:00:00.000Z",
        completedAt: "2026-08-11T12:00:01.000Z",
        audienceClaim: false,
        evidenceHash: "not-a-valid-hash",
      },
    });
    assert.equal(response.statusCode, 409);
    assert.equal(store.evidenceRecords().length, 0);
  } finally {
    await server.close();
  }
});

test("each demo contract declares its relationship to the existing architecture", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(DEMO_CONTRACT_REGISTRY).map(([name, definition]) => [name, definition.origin])),
    {
      DemoCampaign: "DEMO_ONLY",
      DemoManifest: "DEMO_ONLY",
      DemoAsset: "DEMO_ONLY",
      DemoPlayback: "ADAPTER",
      DemoTelemetryEvent: "ADAPTER",
      DemoEvidence: "ADAPTER",
    },
  );
});
