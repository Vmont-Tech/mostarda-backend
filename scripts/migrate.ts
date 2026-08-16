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
  await applySqlMigration(
    pool,
    new URL("../migrations/007_settlement_financial_slice.sql", import.meta.url),
  );
  await applySqlMigration(
    pool,
    new URL("../migrations/008_settlement_integrity_hardening.sql", import.meta.url),
  );
  await applySqlMigration(
    pool,
    new URL("../migrations/009_settlement_split_results.sql", import.meta.url),
  );
  await applySqlMigration(
    pool,
    new URL("../migrations/010_b002_split_result_hardening.sql", import.meta.url),
  );
  await applySqlMigration(
    pool,
    new URL("../migrations/011_e2e_single_slot.sql", import.meta.url),
  );
  process.stdout.write("Applied migrations 001 through 011\n");
} finally {
  await pool.end();
}
