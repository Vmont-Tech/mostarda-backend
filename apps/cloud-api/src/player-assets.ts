export const demoPlayerHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mostarda Player — demonstração</title>
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #111; }
      #screen { width: min(92vw, 960px); min-height: 540px; display: grid; place-items: center; border: 1px solid #494300; background: #191900; }
      #status { position: fixed; left: 1rem; bottom: 1rem; color: #e5d500; font-size: .85rem; }
    </style>
  </head>
  <body>
    <section id="screen" aria-label="Player Mostarda"><p>Carregando campanha...</p></section>
    <output id="status">DEVELOPMENT_SIMULATION</output>
    <script src="/player/player.js" type="module"></script>
  </body>
</html>`;

export const demoPlayerScript = `const screen = document.querySelector('#screen');
const status = document.querySelector('#status');
const json = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error('Cloud request failed: ' + response.status);
  return response.json();
};

const send = (eventId, type, manifest, playbackId, payload) => json('/v1/demo/telemetry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
  environment: 'DEVELOPMENT_SIMULATION', contractOrigin: 'ADAPTER', eventId, type, edgeId: 'browser-demo', occurredAt: new Date().toISOString(),
  campaignId: manifest.campaignId, creativeId: manifest.creativeId, playbackId, manifestVersion: manifest.version, payload
}) });

const main = async () => {
  const manifest = await json('/v1/demo/manifests/campaign-demo-001');
  const asset = await json('/v1/demo/assets/' + encodeURIComponent(manifest.assetId));
  screen.innerHTML = asset.content;
  status.textContent = 'PLAYING · ' + manifest.creativeId + ' · ' + manifest.version;
  const playbackId = 'browser-' + manifest.version;
  await send(playbackId + ':player.started', 'player.started', manifest, playbackId, { source: 'browser-player' });
  await send(playbackId + ':playback.started', 'playback.started', manifest, playbackId, { source: 'browser-player' });
  window.setTimeout(async () => {
    await send(playbackId + ':playback.completed', 'playback.completed', manifest, playbackId, { durationSeconds: manifest.durationSeconds });
    status.textContent = 'COMPLETED · ' + manifest.creativeId + ' · ' + manifest.version;
  }, manifest.durationSeconds * 1000);
};

main().catch((error) => { screen.textContent = 'Conteúdo indisponível'; status.textContent = 'DEGRADED · ' + error.message; });`;
