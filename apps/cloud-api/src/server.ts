import Fastify, { type FastifyInstance } from "fastify";

export interface ServerOptions {
  readonly eventStoreReady?: boolean;
}

export function buildServer(options: ServerOptions = {}): FastifyInstance {
  const server = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });
  const eventStoreReady = options.eventStoreReady ?? false;

  server.get("/health", async () => ({
    service: "mostarda-cloud-api",
    status: "ok",
  }));

  server.get("/ready", async (_request, reply) => {
    const status = eventStoreReady ? "ready" : "not-ready";

    return reply.code(eventStoreReady ? 200 : 503).send({
      status,
      dependencies: {
        eventStore: eventStoreReady ? "available" : "unavailable",
      },
    });
  });

  server.get("/v1/implementation-capabilities", async () => ({
    kernel: "IMPLEMENTATION_READY",
    governanceCaseAggregate: "IMPLEMENTATION_PARTIAL",
    responsibilityValues: "IMPLEMENTATION_READY",
    responsibilityDecision: "BLOCKED_BY_PARTIAL_DEPENDENCY",
    domainCommandsEnabled: false,
    reason:
      "GovernanceCase awaits the five contracts listed in GOVERNANCE_IMPLEMENTATION_GATE_V1.",
  }));

  return server;
}
