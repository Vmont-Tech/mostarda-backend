import assert from "node:assert/strict";
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
