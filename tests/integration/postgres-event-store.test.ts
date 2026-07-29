import assert from "node:assert/strict";
import test from "node:test";

import { Pool } from "pg";

import {
  applySqlMigration,
  PostgresEventStore,
} from "../../packages/persistence-postgres/src/index.ts";

const databaseUrl = process.env.DATABASE_URL;

test(
  "PostgreSQL atomically persists Events and outbox",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await applySqlMigration(
        pool,
        new URL("../../migrations/001_event_store.sql", import.meta.url),
      );
      await pool.query(
        "TRUNCATE event_store_outbox, event_store_events RESTART IDENTITY",
      );
      const store = new PostgresEventStore(pool);
      const appended = await store.append(
        "integration-stream",
        -1n,
        [
          {
            eventId: "019b5a9f-8e5b-7000-8000-000000000001",
            eventType: "IntegrationEvent",
            schemaVersion: 1,
            occurredAt: "2026-07-29T12:00:00.000Z",
            producer: "IntegrationTest",
            correlationId: "correlation-1",
            causationId: "command-1",
            payload: { valid: true },
            metadata: {},
          },
        ],
      );
      const outbox = await pool.query<{ event_id: string }>(
        "SELECT event_id::text FROM event_store_outbox WHERE published_at IS NULL",
      );

      assert.equal(appended[0]?.aggregateRevision, 0n);
      assert.deepEqual(outbox.rows, [
        { event_id: "019b5a9f-8e5b-7000-8000-000000000001" },
      ]);
    } finally {
      await pool.end();
    }
  },
);
