import Fastify, { type FastifyInstance } from "fastify";
import { DemoCloudStore } from "../../../packages/e2e-slice/src/cloud.ts";
import { demoPlayerHtml, demoPlayerScript } from "./player-assets.ts";
import type { EdgeRuntimeStore } from "./edge-runtime-store.ts";
import type { E2ESingleSlotStore } from "./e2e-single-slot-store.ts";

export interface ServerOptions {
  readonly eventStoreProbe?: (signal: AbortSignal) => Promise<boolean>;
  readonly readinessTimeoutMs?: number;
  readonly logger?: boolean;
  readonly demoMode?: boolean;
  readonly demoStore?: DemoCloudStore;
  readonly edgeRuntimeStore?: EdgeRuntimeStore;
  readonly singleSlotStore?: E2ESingleSlotStore;
}

export function buildServer(options: ServerOptions = {}): FastifyInstance {
  const server = Fastify({
    logger: options.logger ?? false,
  });
  const demoStore = options.demoStore ?? new DemoCloudStore();
  const eventStoreProbe = options.eventStoreProbe ?? (async () => false);
  const readinessTimeoutMs = options.readinessTimeoutMs ?? 1000;
  let activeProbe: Promise<boolean> | null = null;

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

  if (options.demoMode === true) {
    server.get("/player", async (_request, reply) =>
      reply.type("text/html; charset=utf-8").send(demoPlayerHtml),
    );
    server.get("/player/player.js", async (_request, reply) =>
      reply.type("text/javascript; charset=utf-8").send(demoPlayerScript),
    );
    server.get("/v1/demo/campaigns/demo", async () => demoStore.campaign());
    server.get("/v1/demo/manifests/:campaignId", async (request, reply) => {
      const { campaignId } = request.params as { campaignId: string };
      const manifest = demoStore.manifest(campaignId);
      return manifest === undefined
        ? reply.code(404).send({ error: "campaign_not_found" })
        : reply.send(manifest);
    });
    server.get("/v1/demo/assets/:assetId", async (request, reply) => {
      const { assetId } = request.params as { assetId: string };
      const asset = demoStore.asset(assetId);
      return asset === undefined
        ? reply.code(404).send({ error: "asset_not_found" })
        : reply.send(asset);
    });
    server.post("/v1/demo/telemetry", async (request, reply) => {
      try {
        demoStore.acceptTelemetry(request.body);
        return reply.code(202).send({ accepted: true });
      } catch (error) {
        return reply.code(409).send({ error: error instanceof Error ? error.message : "telemetry_rejected" });
      }
    });
    server.post("/v1/demo/evidence", async (request, reply) => {
      try {
        demoStore.acceptEvidence(request.body);
        return reply.code(202).send({ accepted: true });
      } catch (error) {
        return reply.code(409).send({ error: error instanceof Error ? error.message : "evidence_rejected" });
      }
    });
    server.get("/v1/demo/telemetry", async () => ({ events: demoStore.telemetryEvents() }));
    server.get("/v1/demo/evidence", async () => ({ evidence: demoStore.evidenceRecords() }));
  }

  if (options.edgeRuntimeStore !== undefined) {
    const edgeStore = options.edgeRuntimeStore;
    server.get("/v1/edge/campaigns/:campaignId/manifest", async (request, reply) => {
      const { campaignId } = request.params as { campaignId: string };
      const manifest = edgeStore.manifest(campaignId);
      return manifest === undefined
        ? reply.code(404).send({ error: "campaign_manifest_not_found" })
        : reply.send(manifest);
    });
    server.get("/v1/edge/assets/:assetId", async (request, reply) => {
      const { assetId } = request.params as { assetId: string };
      const asset = edgeStore.asset(assetId);
      return asset === undefined
        ? reply.code(404).send({ error: "edge_asset_not_found" })
        : reply.send(asset);
    });
    server.post("/v1/edge/telemetry", async (request, reply) => {
      try {
        edgeStore.acceptTelemetry(request.body);
        return reply.code(202).send({ accepted: true });
      } catch (error) {
        return reply.code(409).send({ error: error instanceof Error ? error.message : "edge_telemetry_rejected" });
      }
    });
    server.post("/v1/edge/evidence", async (request, reply) => {
      try {
        edgeStore.acceptEvidence(request.body);
        return reply.code(202).send({ accepted: true });
      } catch (error) {
        return reply.code(409).send({ error: error instanceof Error ? error.message : "edge_evidence_rejected" });
      }
    });
    server.get("/v1/edge/telemetry", async () => ({ events: edgeStore.telemetryEvents() }));
    server.get("/v1/edge/evidence", async () => ({ evidence: edgeStore.evidenceRecords() }));
    server.post("/v1/edge/playback-events", async (request, reply) => {
      try {
        edgeStore.acceptPlaybackEvent(request.body);
        return reply.code(202).send({ accepted: true });
      } catch (error) {
        return reply.code(409).send({ error: error instanceof Error ? error.message : "playback_event_rejected" });
      }
    });
    server.get("/v1/edge/playback-events", async () => ({ events: edgeStore.playbackEvents() }));
  }

  if (options.singleSlotStore !== undefined) {
    // This is the explicitly bounded single-slot laboratory surface. It is
    // not the production Campaign/Slot API and has no authentication yet.
    const store = options.singleSlotStore;
    server.post("/v1/e2e/campaigns", async (request, reply) => {
      try {
        const body = request.body as { campaignId?: unknown; name?: unknown };
        if (typeof body?.campaignId !== "string" || typeof body.name !== "string") {
          return reply.code(400).send({ error: "invalid_campaign" });
        }
        return reply.code(201).send(await store.createCampaign({ campaignId: body.campaignId, name: body.name }));
      } catch (error) {
        return reply.code(409).send({ error: error instanceof Error ? error.message : "campaign_rejected" });
      }
    });
    server.get("/v1/e2e/campaigns/:campaignId", async (request, reply) => {
      const { campaignId } = request.params as { campaignId: string };
      const campaign = await store.campaign(campaignId);
      return campaign === undefined ? reply.code(404).send({ error: "campaign_not_found" }) : reply.send(campaign);
    });
    server.post("/v1/e2e/campaigns/:campaignId/slots", async (request, reply) => {
      try {
        const { campaignId } = request.params as { campaignId: string };
        const body = request.body as { slotId?: unknown; durationSeconds?: unknown };
        if (typeof body?.slotId !== "string" || typeof body.durationSeconds !== "number") {
          return reply.code(400).send({ error: "invalid_slot" });
        }
        return reply.code(201).send(await store.createSlot({
          slotId: body.slotId,
          campaignId,
          durationSeconds: body.durationSeconds,
        }));
      } catch (error) {
        return reply.code(409).send({ error: error instanceof Error ? error.message : "slot_rejected" });
      }
    });
    server.get("/v1/e2e/slots/:slotId", async (request, reply) => {
      const { slotId } = request.params as { slotId: string };
      const slot = await store.slot(slotId);
      return slot === undefined ? reply.code(404).send({ error: "slot_not_found" }) : reply.send(slot);
    });
    server.post("/v1/e2e/creatives", async (request, reply) => {
      try {
        const body = request.body as { creativeId?: unknown; mediaType?: unknown; content?: unknown };
        if (typeof body?.creativeId !== "string" || body.mediaType !== "text/html" || typeof body.content !== "string") {
          return reply.code(400).send({ error: "invalid_creative" });
        }
        return reply.code(201).send(await store.publishCreative({
          creativeId: body.creativeId,
          mediaType: "text/html",
          content: body.content,
        }));
      } catch (error) {
        return reply.code(409).send({ error: error instanceof Error ? error.message : "creative_rejected" });
      }
    });
    server.post("/v1/e2e/slots/:slotId/creative", async (request, reply) => {
      try {
        const { slotId } = request.params as { slotId: string };
        const body = request.body as { creativeId?: unknown };
        if (typeof body?.creativeId !== "string") return reply.code(400).send({ error: "invalid_assignment" });
        return reply.send(await store.assignCreative(slotId, body.creativeId));
      } catch (error) {
        return reply.code(409).send({ error: error instanceof Error ? error.message : "assignment_rejected" });
      }
    });
    server.get("/v1/edge/campaigns/:campaignId/manifest", async (request, reply) => {
      const { campaignId } = request.params as { campaignId: string };
      const manifest = await store.manifest(campaignId);
      return manifest === undefined
        ? reply.code(404).send({ error: "campaign_manifest_not_found" })
        : reply.send(manifest);
    });
    server.get("/v1/edge/assets/:assetId", async (request, reply) => {
      const { assetId } = request.params as { assetId: string };
      const asset = await store.asset(assetId);
      return asset === undefined
        ? reply.code(404).send({ error: "edge_asset_not_found" })
        : reply.send(asset);
    });
    server.post("/v1/edge/telemetry", async (request, reply) => {
      try {
        await store.acceptTelemetry(request.body);
        return reply.code(202).send({ accepted: true });
      } catch (error) {
        return reply.code(409).send({ error: error instanceof Error ? error.message : "edge_telemetry_rejected" });
      }
    });
    server.get("/v1/edge/telemetry", async () => ({ events: await store.telemetryEvents() }));
    server.post("/v1/edge/playback-events", async (request, reply) => {
      try {
        await store.acceptPlaybackEvent(request.body);
        return reply.code(202).send({ accepted: true });
      } catch (error) {
        return reply.code(409).send({ error: error instanceof Error ? error.message : "playback_event_rejected" });
      }
    });
    server.get("/v1/edge/playback-events", async () => ({ events: await store.playbackEvents() }));
  }

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
      if (activeProbe === null) {
        const controller = new AbortController();
        const operation = eventStoreProbe(controller.signal).catch(() => false);
        activeProbe = operation.finally(() => {
          if (activeProbe === operation || activeProbe !== null) activeProbe = null;
        });
        setTimeout(() => controller.abort(), readinessTimeoutMs).unref();
      }
      const eventStoreReady = await waitWithTimeout(activeProbe, readinessTimeoutMs);
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

async function waitWithTimeout(
  operation: Promise<boolean>,
  timeoutMs: number,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
