import { buildServer } from "./server.ts";
import { Pool } from "pg";

const port = Number.parseInt(process.env.PORT ?? "3333", 10);
const host = process.env.HOST ?? "127.0.0.1";
const databaseUrl = process.env.DATABASE_URL;
const readinessTimeoutMs = 1000;
const pool = databaseUrl === undefined
  ? null
  : new Pool({
      connectionString: databaseUrl,
      statement_timeout: readinessTimeoutMs,
      query_timeout: readinessTimeoutMs,
      connectionTimeoutMillis: readinessTimeoutMs,
    });
pool?.on("error", (error) => {
  server.log.error(error, "Unexpected PostgreSQL pool error");
});
const server = buildServer({
  eventStoreProbe:
    pool === null
      ? async () => false
      : async () => {
          await pool.query("SELECT 1");
          return true;
        },
  logger: true,
  readinessTimeoutMs,
});

await server.listen({ host, port });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await server.close();
    await pool?.end();
  });
}
