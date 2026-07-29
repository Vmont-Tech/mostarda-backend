import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../migrations/001_event_store.sql", import.meta.url);
const inboxMigrationUrl = new URL("../../migrations/002_inbox.sql", import.meta.url);

test("event store migration enforces append-only identity and revision constraints", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /CONSTRAINT events_event_id_unique UNIQUE \(event_id\)/);
  assert.match(
    sql,
    /CONSTRAINT events_stream_revision_unique UNIQUE \(stream_id, aggregate_revision\)/,
  );
  assert.match(sql, /CREATE OR REPLACE FUNCTION prevent_event_mutation/);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON event_store_events/);
});

test("inbox has one immutable logical receipt per consumer and EventId", async () => {
  const sql = await readFile(inboxMigrationUrl, "utf8");

  assert.match(sql, /PRIMARY KEY \(consumer_name, event_id\)/);
  assert.match(sql, /payload_digest TEXT NOT NULL/);
  assert.match(sql, /effect_result JSONB NOT NULL/);
});

test("PostgreSQL adapters preserve BIGINT revisions without Number coercion", async () => {
  const sources = await Promise.all([
    readFile(
      new URL(
        "../../packages/persistence-postgres/src/postgres-event-store.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../../packages/persistence-postgres/src/postgres-delivery-log.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  for (const source of sources) {
    assert.doesNotMatch(source, /Number\([^)]*(?:revision|aggregate_revision)/i);
    assert.match(source, /BigInt\(row\.aggregate_revision\)/);
  }
});

test("outbox references the authoritative Event and preserves pending delivery", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /event_id UUID NOT NULL REFERENCES event_store_events\(event_id\)/);
  assert.match(sql, /published_at TIMESTAMPTZ NULL/);
  assert.match(sql, /WHERE published_at IS NULL/);
  assert.match(sql, /lease_token TEXT NULL/);
  assert.match(sql, /lease_expires_at TIMESTAMPTZ NULL/);
});
