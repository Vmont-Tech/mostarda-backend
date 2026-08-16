import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { RealEdgeRuntime } from "./runtime.ts";

const PLAYER_HTML = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mostarda Player</title></head>
<body><main id="player-status">LOADING</main><iframe id="creative" title="Mostarda Creative" sandbox=""></iframe>
<script>
(async () => {
  const status = document.getElementById('player-status');
  const frame = document.getElementById('creative');
  try {
    const manifest = await (await fetch('/manifest')).json();
    const creative = await (await fetch('/assets/' + encodeURIComponent(manifest.assetId))).text();
    frame.srcdoc = creative;
    status.textContent = 'PLAYING · ' + manifest.campaignId + ' · ' + manifest.slotId;
    await fetch('/playback', { method: 'POST' });
    status.textContent = 'COMPLETED · PlaybackEvent queued';
  } catch (error) {
    status.textContent = 'ERROR · ' + String(error);
  }
})();
</script></body></html>`;

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
  if (method === "GET" && url.pathname === "/player") {
    return send(response, 200, "text/html; charset=utf-8", PLAYER_HTML);
  }
  if (method === "GET" && url.pathname === "/manifest") {
    const manifest = await runtime.localManifest();
    return manifest === undefined
      ? sendJson(response, 404, { error: "local_manifest_not_found" })
      : sendJson(response, 200, manifest);
  }
  if (method === "GET" && url.pathname.startsWith("/assets/")) {
    const assetId = decodeURIComponent(url.pathname.slice("/assets/".length));
    const asset = await runtime.localAsset(assetId);
    return asset === undefined
      ? sendJson(response, 404, { error: "local_asset_not_found" })
      : send(response, 200, "text/html; charset=utf-8", asset.content);
  }
  if (method === "POST" && url.pathname === "/playback") {
    const playback = await runtime.playCached();
    return sendJson(response, 202, playback);
  }
  if (method === "POST" && url.pathname === "/flush") {
    await runtime.flush();
    return sendJson(response, 202, { flushed: true });
  }
  if (method === "GET" && url.pathname === "/diagnostics") {
    return sendJson(response, 200, await runtime.diagnostics());
  }
  if (method === "GET" && url.pathname === "/health") return sendJson(response, 200, { status: "ok" });
  return sendJson(response, 404, { error: "not_found" });
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  send(response, status, "application/json; charset=utf-8", JSON.stringify(value));
}

function send(response: ServerResponse, status: number, contentType: string, body: string): void {
  response.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  response.end(body);
}
