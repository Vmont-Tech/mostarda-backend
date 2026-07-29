import Fastify, { type FastifyInstance } from "fastify";

export interface ServerOptions {
  readonly eventStoreProbe?: () => Promise<boolean>;
  readonly readinessTimeoutMs?: number;
  readonly logger?: boolean;
}

export function buildServer(options: ServerOptions = {}): FastifyInstance {
  const server = Fastify({
    logger: options.logger ?? false,
  });
  const eventStoreProbe = options.eventStoreProbe ?? (async () => false);
  const readinessTimeoutMs = options.readinessTimeoutMs ?? 1000;

  server.get(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["service", "status"],
            properties: {
              service: { const: "mostarda-cloud-api" },
              status: { const: "ok" },
            },
          },
        },
      },
    },
    async () => ({
      service: "mostarda-cloud-api",
      status: "ok",
    }),
  );

  const readinessSchema = {
    type: "object",
    additionalProperties: false,
    required: ["status", "dependencies"],
    properties: {
      status: { enum: ["ready", "not-ready"] },
      dependencies: {
        type: "object",
        additionalProperties: false,
        required: ["eventStore"],
        properties: {
          eventStore: { enum: ["available", "unavailable"] },
        },
      },
    },
  } as const;

  server.get(
    "/ready",
    {
      schema: {
        response: {
          200: readinessSchema,
          503: readinessSchema,
        },
      },
    },
    async (_request, reply) => {
      const eventStoreReady = await probeWithTimeout(
        eventStoreProbe,
        readinessTimeoutMs,
      );
      const status = eventStoreReady ? "ready" : "not-ready";

      return reply.code(eventStoreReady ? 200 : 503).send({
        status,
        dependencies: {
          eventStore: eventStoreReady ? "available" : "unavailable",
        },
      });
    },
  );

  server.get(
    "/v1/implementation-capabilities",
    {
      schema: {
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: [
              "kernel",
              "governanceCaseAggregate",
              "responsibilityValues",
              "responsibilityDecision",
              "domainCommandsEnabled",
              "reason",
            ],
            properties: {
              kernel: { const: "IMPLEMENTATION_READY" },
              governanceCaseAggregate: { const: "IMPLEMENTATION_PARTIAL" },
              responsibilityValues: { const: "IMPLEMENTATION_READY" },
              responsibilityDecision: {
                const: "BLOCKED_BY_PARTIAL_DEPENDENCY",
              },
              domainCommandsEnabled: { const: false },
              reason: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
    async () => ({
      kernel: "IMPLEMENTATION_READY",
      governanceCaseAggregate: "IMPLEMENTATION_PARTIAL",
      responsibilityValues: "IMPLEMENTATION_READY",
      responsibilityDecision: "BLOCKED_BY_PARTIAL_DEPENDENCY",
      domainCommandsEnabled: false,
      reason:
        "GovernanceCase awaits the five contracts listed in GOVERNANCE_IMPLEMENTATION_GATE_V1.",
    }),
  );

  return server;
}

async function probeWithTimeout(
  probe: () => Promise<boolean>,
  timeoutMs: number,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      probe().catch(() => false),
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
