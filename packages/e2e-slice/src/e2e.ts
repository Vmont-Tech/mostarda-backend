import { buildServer } from "../../../apps/cloud-api/src/server.ts";
import {
  DEMO_CAMPAIGN_ID,
  DEMO_EDGE_ID,
  type DemoEvidence,
  type DemoTelemetryEvent,
  type DemoPlayback,
  DEMO_OFFLINE_STORAGE_MODE,
} from "./contracts.ts";
import { DemoCloudStore } from "./cloud.ts";
import { SimulatedEdge, type DemoCloudClient, type DemoHttpResponse } from "./edge.ts";

class FastifyDemoClient implements DemoCloudClient {
  readonly server: { inject(request: { method: string; url: string; payload?: unknown }): Promise<DemoHttpResponse> };

  constructor(server: { inject(request: { method: string; url: string; payload?: unknown }): Promise<DemoHttpResponse> }) {
    this.server = server;
  }

  get(path: string): Promise<DemoHttpResponse> {
    return this.server.inject({ method: "GET", url: path });
  }

  post(path: string, payload: unknown): Promise<DemoHttpResponse> {
    return this.server.inject({ method: "POST", url: path, payload });
  }
}

export function createFastifyDemoClient(server: FastifyDemoClient["server"]): DemoCloudClient {
  return new FastifyDemoClient(server);
}

export interface MostardaE2EResult {
  readonly environment: "DEVELOPMENT_SIMULATION";
  readonly offlineMode: typeof DEMO_OFFLINE_STORAGE_MODE;
  readonly edgeId: string;
  readonly campaignId: string;
  readonly playback: DemoPlayback;
  readonly events: readonly DemoTelemetryEvent[];
  readonly evidence: DemoEvidence;
  readonly cloudEvidenceCount: number;
}

export async function runMostardaE2E(): Promise<MostardaE2EResult> {
  const store = new DemoCloudStore();
  const server = buildServer({ demoMode: true, demoStore: store });
  try {
    const edge = new SimulatedEdge({ edgeId: DEMO_EDGE_ID, cloud: new FastifyDemoClient(server) });
    await edge.start();
    await edge.sync();
    const playback = await edge.playCached();
    await edge.flushTelemetry();
    const evidence = store.evidenceRecords()[0];
    if (evidence === undefined) throw new Error("E2E did not produce execution evidence");
    return {
      environment: "DEVELOPMENT_SIMULATION",
      offlineMode: DEMO_OFFLINE_STORAGE_MODE,
      edgeId: DEMO_EDGE_ID,
      campaignId: DEMO_CAMPAIGN_ID,
      playback,
      events: store.telemetryEvents(),
      evidence,
      cloudEvidenceCount: store.evidenceRecords().length,
    };
  } finally {
    await server.close();
  }
}

export { DemoCloudStore } from "./cloud.ts";
export { SimulatedEdge } from "./edge.ts";
