import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { assetBytes } from "./cloud-contracts.ts";
import type { RealEdgeRuntime } from "./runtime.ts";
import { PLAYER_HTML } from "./player-html.ts";

export function createEdgeLocalContentServer(runtime: RealEdgeRuntime): Server {
  return createServer((request, response) => {
    void handleRequest(runtime, request, response).catch(() => {
      if (!response.headersSent) response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "local_edge_request_failed" }));
    });
  });
}

async function handleRequest(runtime: RealEdgeRuntime, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://edge.local");
  if (method === "GET" && url.pathname === "/player") return send(response, 200, "text/html; charset=utf-8", PLAYER_HTML);
  if (method === "GET" && url.pathname === "/manifest") {
    const manifest = await runtime.localManifest();
    return manifest === undefined ? sendJson(response, 404, { error: "local_manifest_not_found" }) : sendJson(response, 200, manifest);
  }
  if (method === "GET" && url.pathname.startsWith("/assets/")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const assetId = decodeURIComponent(parts.length === 3 ? parts[2]! : url.pathname.slice("/assets/".length));
    const asset = await runtime.localAsset(assetId);
    return asset === undefined ? sendJson(response, 404, { error: "local_asset_not_found" }) : send(response, 200, asset.mediaType, asset.mediaType === "video/mp4" ? assetBytes(asset.mediaType, asset.content) : asset.content);
  }
  if (method === "POST" && (url.pathname === "/playback" || url.pathname.startsWith("/playback/"))) return sendJson(response, 202, await runtime.playCached());
  if (method === "POST" && url.pathname === "/flush") { await runtime.flush(); return sendJson(response, 202, { flushed: true }); }
  if (method === "GET" && url.pathname === "/diagnostics") return sendJson(response, 200, await runtime.diagnostics());
  if (method === "GET" && url.pathname === "/health") return sendJson(response, 200, { status: "ok" });
  return sendJson(response, 404, { error: "not_found" });
}

function sendJson(response: ServerResponse, status: number, value: unknown): void { send(response, status, "application/json; charset=utf-8", JSON.stringify(value)); }
function send(response: ServerResponse, status: number, contentType: string, body: string | Uint8Array): void { response.writeHead(status, { "content-type": contentType, "cache-control": "no-store" }); response.end(body); }
