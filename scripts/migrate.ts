import { Pool } from "pg";

import { applySqlMigration } from "../packages/persistence-postgres/src/index.ts";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://mostarda:mostarda-local-only@127.0.0.1:5432/mostarda";
const pool = new Pool({ connectionString });

try {
  await applySqlMigration(
    pool,
    new URL("../migrations/001_event_store.sql", import.meta.url),
  );
  await applySqlMigration(
    pool,
    new URL("../migrations/002_inbox.sql", import.meta.url),
  );
  await applySqlMigration(
    pool,
    new URL("../migrations/003_outbox_leases.sql", import.meta.url),
  );
  await applySqlMigration(
    pool,
    new URL("../migrations/004_projection_store.sql", import.meta.url),
  );
  await applySqlMigration(
    pool,
    new URL("../migrations/005_projection_invalidation.sql", import.meta.url),
  );
  await applySqlMigration(
    pool,
    new URL(
      "../migrations/006_projection_invalidation_history.sql",
      import.meta.url,
    ),
  );
  process.stdout.write("Applied migrations 001 through 006\n");
} finally {
  await pool.end();
}
