import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../migrations/001_event_store.sql", import.meta.url);

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

test("outbox references the authoritative Event and preserves pending delivery", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /event_id UUID NOT NULL REFERENCES event_store_events\(event_id\)/);
  assert.match(sql, /published_at TIMESTAMPTZ NULL/);
  assert.match(sql, /WHERE published_at IS NULL/);
});
