import { buildServer } from "./server.ts";

const port = Number.parseInt(process.env.PORT ?? "3333", 10);
const host = process.env.HOST ?? "127.0.0.1";
const server = buildServer({ eventStoreReady: false });

await server.listen({ host, port });
