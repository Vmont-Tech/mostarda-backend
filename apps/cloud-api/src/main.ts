import { buildServer } from "./server.ts";
import { Pool } from "pg";

const port = Number.parseInt(process.env.PORT ?? "3333", 10);
const host = process.env.HOST ?? "127.0.0.1";
const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl === undefined ? null : new Pool({ connectionString: databaseUrl });
const server = buildServer({
  eventStoreProbe:
    pool === null
      ? async () => false
      : async () => {
          await pool.query("SELECT 1");
          return true;
        },
  logger: true,
});

await server.listen({ host, port });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await server.close();
    await pool?.end();
  });
}
