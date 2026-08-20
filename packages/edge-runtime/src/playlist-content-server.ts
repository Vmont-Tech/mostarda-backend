import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { assetBytes } from "./cloud-contracts.ts";
import { PLAYER_HTML } from "./player-html.ts";
import type { EdgePlaylistRuntime } from "./playlist-runtime.ts";

/** Local playlist transport; the Browser Player shell is shared with single-slot playback. */
export function createEdgePlaylistContentServer(runtime: EdgePlaylistRuntime): Server {
  return createServer((request, response) => {
    void handleRequest(runtime, request, response).catch(() => {
      if (!response.headersSent) response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "local_edge_playlist_request_failed" }));
    });
  });
}

async function handleRequest(runtime: EdgePlaylistRuntime, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://edge.local");
  if (method === "GET" && url.pathname === "/player") return send(response, 200, "text/html; charset=utf-8", PLAYER_HTML);
  if (method === "GET" && url.pathname === "/playlist") return sendJson(response, 200, { manifests: await runtime.localManifests() });
  if (method === "GET" && url.pathname === "/manifest") {
    const manifest = (await runtime.localManifests())[0];
    return manifest === undefined ? sendJson(response, 404, { error: "local_manifest_not_found" }) : sendJson(response, 200, manifest);
  }
  if (method === "GET" && url.pathname.startsWith("/assets/")) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 3) return sendJson(response, 404, { error: "local_asset_not_found" });
    const asset = await runtime.localAsset(decodeURIComponent(parts[1]!), decodeURIComponent(parts[2]!));
    return asset === undefined ? sendJson(response, 404, { error: "local_asset_not_found" }) : send(response, 200, asset.mediaType, asset.mediaType === "video/mp4" ? assetBytes(asset.mediaType, asset.content) : asset.content);
  }
  if (method === "POST" && url.pathname.startsWith("/playback/")) {
    const slotId = decodeURIComponent(url.pathname.slice("/playback/".length));
    return sendJson(response, 202, await runtime.playSlot(slotId));
  }
  if (method === "POST" && url.pathname === "/flush") { await runtime.flush(); return sendJson(response, 202, { flushed: true }); }
  if (method === "GET" && url.pathname === "/diagnostics") return sendJson(response, 200, await runtime.diagnostics());
  if (method === "GET" && url.pathname === "/health") return sendJson(response, 200, { status: "ok" });
  return sendJson(response, 404, { error: "not_found" });
}

function sendJson(response: ServerResponse, status: number, value: unknown): void { send(response, status, "application/json; charset=utf-8", JSON.stringify(value)); }
function send(response: ServerResponse, status: number, contentType: string, body: string | Uint8Array): void { response.writeHead(status, { "content-type": contentType, "cache-control": "no-store" }); response.end(body); }
