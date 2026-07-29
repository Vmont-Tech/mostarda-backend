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
  process.stdout.write("Applied migration 001_event_store.sql\n");
} finally {
  await pool.end();
}
