import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Pool } from "pg";

import { PostgresE2ESingleSlotStore } from "../../apps/cloud-api/src/e2e-single-slot-store.ts";
import { buildServer } from "../../apps/cloud-api/src/server.ts";

const databaseUrl = process.env.DATABASE_URL;

test("PostgreSQL persists the single-slot Campaign/Slot/Creative and idempotent PlaybackEvent", { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const store = new PostgresE2ESingleSlotStore(pool);
  const server = buildServer({ singleSlotStore: store });
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const campaignId = `campaign-pg-${suffix}`;
  const slotId = `slot-pg-${suffix}`;
  const creativeId = `creative-pg-${suffix}`;
  const event = {
    contractVersion: "edge-cloud-v1" as const,
    playbackEventId: `playback-event-pg-${suffix}`,
    campaignId,
    slotId,
    creativeId,
    edgeId: `edge-pg-${suffix}`,
    sessionId: `session-pg-${suffix}`,
    playbackId: `playback-pg-${suffix}`,
    manifestVersion: `manifest-e2e-v1:${slotId}`,
    startedAt: "2026-08-16T12:00:00.000Z",
    completedAt: "2026-08-16T12:00:15.000Z",
    durationSeconds: 15,
    status: "COMPLETED" as const,
  };

  try {
    await server.ready();
    const baseline = await server.inject({ method: "GET", url: "/v1/edge/playback-events" });
    const baselineCount = (baseline.json() as { events: readonly unknown[] }).events.length;
    assert.equal((await server.inject({ method: "POST", url: "/v1/e2e/campaigns", payload: { campaignId, name: "Postgres lab" } })).statusCode, 201);
    assert.equal((await server.inject({ method: "POST", url: `/v1/e2e/campaigns/${campaignId}/slots`, payload: { slotId, durationSeconds: 15 } })).statusCode, 201);
    assert.equal((await server.inject({ method: "POST", url: "/v1/e2e/creatives", payload: { creativeId, mediaType: "text/html", content: "<main>PG</main>" } })).statusCode, 201);
    assert.equal((await server.inject({ method: "POST", url: `/v1/e2e/slots/${slotId}/creative`, payload: { creativeId } })).statusCode, 200);
    assert.equal((await server.inject({ method: "POST", url: "/v1/edge/playback-events", payload: event })).statusCode, 202);
    assert.equal((await server.inject({ method: "POST", url: "/v1/edge/playback-events", payload: event })).statusCode, 202);
    assert.equal((await server.inject({
      method: "POST",
      url: "/v1/edge/playback-events",
      payload: { ...event, durationSeconds: 14 },
    })).statusCode, 409);
    const events = await server.inject({ method: "GET", url: "/v1/edge/playback-events" });
    assert.equal(events.statusCode, 200);
    assert.equal((events.json() as { events: readonly unknown[] }).events.length, baselineCount + 1);

    const client = await pool.connect();
    try {
      await assert.rejects(
        () => client.query("TRUNCATE e2e_playback_events"),
        /E2E PlaybackEvent is append-only/,
      );
      await client.query("ROLLBACK").catch(() => undefined);
    } finally {
      client.release();
    }
  } finally {
    await server.close();
    await pool.end();
  }
});

test("PostgreSQL persists and serves a verified video/mp4 creative", { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const store = new PostgresE2ESingleSlotStore(pool);
  const server = buildServer({ singleSlotStore: store });
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const campaignId = `campaign-video-pg-${suffix}`;
  const slotId = `slot-video-pg-${suffix}`;
  const creativeId = `creative-video-pg-${suffix}`;
  const content = (await readFile(path.resolve("tests/fixtures/media/mostarda-e2e-720p-h264.mp4"))).toString("base64");

  try {
    await server.ready();
    assert.equal((await server.inject({ method: "POST", url: "/v1/e2e/campaigns", payload: { campaignId, name: "Postgres video lab" } })).statusCode, 201);
    assert.equal((await server.inject({ method: "POST", url: `/v1/e2e/campaigns/${campaignId}/slots`, payload: { slotId, durationSeconds: 8 } })).statusCode, 201);
    const creative = await server.inject({
      method: "POST",
      url: "/v1/e2e/creatives",
      payload: { creativeId, mediaType: "video/mp4", content },
    });
    assert.equal(creative.statusCode, 201);
    assert.equal((await server.inject({ method: "POST", url: `/v1/e2e/slots/${slotId}/creative`, payload: { creativeId } })).statusCode, 200);
    const manifestResponse = await server.inject({ method: "GET", url: `/v1/edge/campaigns/${campaignId}/manifest` });
    assert.equal(manifestResponse.statusCode, 200);
    assert.equal((manifestResponse.json() as { mediaType: string }).mediaType, "video/mp4");
    const assetResponse = await server.inject({ method: "GET", url: `/v1/edge/assets/${creativeId}:asset` });
    assert.equal(assetResponse.statusCode, 200);
    assert.equal((assetResponse.json() as { mediaType: string; content: string }).mediaType, "video/mp4");
    assert.equal((assetResponse.json() as { content: string }).content, content);
  } finally {
    await server.close();
    await pool.end();
  }
});
