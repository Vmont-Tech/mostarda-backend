import type {
  EdgeAsset,
  EdgeCloudClient,
  EdgeManifest,
} from "./cloud-contracts.ts";

export function createHttpEdgeCloudClient(baseUrl: string): EdgeCloudClient {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  return {
    fetchManifest: async (campaignId, slotId) => expectJson<EdgeManifest>(await request(normalizedBaseUrl, "GET", `/v1/edge/campaigns/${encodeURIComponent(campaignId)}/manifest${slotId === undefined ? "" : `?slotId=${encodeURIComponent(slotId)}`}`), "manifest"),
    fetchManifests: async (campaignId) => {
      const response = await request(normalizedBaseUrl, "GET", `/v1/edge/campaigns/${encodeURIComponent(campaignId)}/manifests`);
      const body = expectJson<{ manifests: readonly EdgeManifest[] }>(response, "manifests");
      return body.manifests;
    },
    fetchAsset: async (assetId) => expectJson<EdgeAsset>(await request(normalizedBaseUrl, "GET", `/v1/edge/assets/${encodeURIComponent(assetId)}`), "asset"),
    sendTelemetry: async (event) => { await expectAccepted(await request(normalizedBaseUrl, "POST", "/v1/edge/telemetry", event), "telemetry"); },
    sendPlaybackEvent: async (event) => { await expectAccepted(await request(normalizedBaseUrl, "POST", "/v1/edge/playback-events", event), "PlaybackEvent"); },
    sendEvidence: async (evidence) => { await expectAccepted(await request(normalizedBaseUrl, "POST", "/v1/edge/evidence", evidence), "evidence"); },
    health: async () => (await request(normalizedBaseUrl, "GET", "/health")).statusCode === 200,
  };
}

async function request(
  baseUrl: string,
  method: "GET" | "POST",
  requestPath: string,
  payload?: unknown,
): Promise<HttpResponse> {
  if (!requestPath.startsWith("/")) throw new Error("Cloud request path must be absolute");
  const init: RequestInit = {
    method,
    ...(payload === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }),
  };
  const response = await fetch(new URL(requestPath, baseUrl), init);
  const text = await response.text();
  let parsed: unknown = {};
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error("Cloud response was not JSON", { cause: error });
    }
  }
  return {
    statusCode: response.status,
    body: parsed,
  };
}

interface HttpResponse {
  readonly statusCode: number;
  readonly body: unknown;
}

function expectJson<T>(response: HttpResponse, name: string): T {
  if (response.statusCode !== 200) throw new Error(`${name} request failed: ${response.statusCode}`);
  return response.body as T;
}

function expectAccepted(response: HttpResponse, name: string): void {
  if (response.statusCode >= 300) throw new Error(`${name} request failed: ${response.statusCode}`);
}

function normalizeBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
    return `${url.toString().replace(/\/$/, "")}/`;
  } catch (error) {
    throw new Error("invalid Cloud endpoint", { cause: error });
  }
}
