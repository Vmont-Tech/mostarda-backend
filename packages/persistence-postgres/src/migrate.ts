import { readFile } from "node:fs/promises";

import type { Pool } from "pg";

export async function applySqlMigration(
  pool: Pool,
  migrationUrl: URL,
): Promise<void> {
  const sql = await readFile(migrationUrl, "utf8");
  await pool.query(sql);
}
