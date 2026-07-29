import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../migrations/001_event_store.sql", import.meta.url);
const inboxMigrationUrl = new URL("../../migrations/002_inbox.sql", import.meta.url);
const projectionMigrationUrl = new URL(
  "../../migrations/004_projection_store.sql",
  import.meta.url,
);
const projectionInvalidationMigrationUrl = new URL(
  "../../migrations/005_projection_invalidation.sql",
  import.meta.url,
);

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

test("lease evolution is an ordered upgrade-safe migration", async () => {
  const sql = await readFile(
    new URL("../../migrations/003_outbox_leases.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /ALTER TABLE event_store_outbox/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS lease_token/);
  assert.match(sql, /event_store_outbox_claims/);
  assert.match(sql, /lease_token TEXT PRIMARY KEY/);
});

test("projection candidates are complete immutable records with a composite identity", async () => {
  const sql = await readFile(projectionMigrationUrl, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS projection_rebuilds/);
  assert.match(
    sql,
    /PRIMARY KEY \(projection_name, projection_version, rebuild_id\)/,
  );
  assert.match(sql, /state JSONB NOT NULL/);
  assert.match(sql, /checkpoint BIGINT NOT NULL/);
  assert.match(sql, /as_of TIMESTAMPTZ NULL/);
  assert.match(sql, /staleness JSONB NOT NULL/);
  assert.match(sql, /rebuild_status TEXT NOT NULL/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION prevent_projection_rebuild_mutation/);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON projection_rebuilds/);
});

test("projection heads have one current candidate per projection", async () => {
  const sql = await readFile(projectionMigrationUrl, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS projection_heads/);
  assert.match(sql, /projection_name TEXT PRIMARY KEY/);
  assert.match(
    sql,
    /FOREIGN KEY \(projection_name, projection_version, rebuild_id\)\s+REFERENCES projection_rebuilds \(projection_name, projection_version, rebuild_id\)/,
  );
});

test("projection promotion uses a transaction, row locks, and bigint conversion", async () => {
  const source = await readFile(
    new URL(
      "../../packages/persistence-postgres/src/postgres-projection-store.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /client\.query\("BEGIN"\)/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /client\.query\("COMMIT"\)/);
  assert.match(source, /client\.query\("ROLLBACK"\)/);
  assert.match(source, /BigInt\(row\.checkpoint\)/);
  assert.doesNotMatch(source, /Number\([^)]*checkpoint/i);
});

test("projection invalidation is an upgrade-safe tombstone linked to its candidate", async () => {
  const sql = await readFile(projectionInvalidationMigrationUrl, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS projection_invalidations/);
  assert.match(sql, /projection_name TEXT PRIMARY KEY/);
  assert.match(
    sql,
    /FOREIGN KEY \(projection_name, projection_version, rebuild_id\)\s+REFERENCES projection_rebuilds \(projection_name, projection_version, rebuild_id\)/,
  );
});

test("PostgreSQL invalidation is transactional and locked", async () => {
  const source = await readFile(
    new URL(
      "../../packages/persistence-postgres/src/postgres-projection-store.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /async invalidate\(/);
  assert.match(source, /projection_invalidations/);
  assert.match(source, /FOR UPDATE/);
});
