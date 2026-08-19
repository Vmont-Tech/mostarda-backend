/** Shared Browser Player shell for single-manifest and playlist Edge surfaces. */
export const PLAYER_HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mostarda Player</title>
<style>html,body,main,#creative,#video{margin:0;width:100vw;height:100vh;overflow:hidden;background:#000}body{touch-action:none;user-select:none}#creative,#video{position:fixed;inset:0;border:0;display:block;object-fit:contain;pointer-events:none}#video::-webkit-media-controls{display:none!important}#player-status{position:fixed;left:-10000px;top:-10000px}</style></head>
<body><main id="player-status">LOADING</main><iframe id="creative" title="Mostarda Creative" sandbox=""></iframe><video id="video" muted playsinline hidden></video>
<script>
(async () => {
  const status=document.getElementById('player-status'), frame=document.getElementById('creative'), video=document.getElementById('video');
  const sleep=(seconds)=>new Promise((resolve)=>setTimeout(resolve,Math.max(0,seconds)*1000));
  async function json(url){const response=await fetch(url);if(!response.ok)throw new Error('request failed: '+response.status);return response.json();}
  async function play(entry){
    if(entry.mediaType==='video/mp4'){
      frame.hidden=true;video.hidden=false;video.autoplay=true;video.controls=false;video.src='/assets/'+encodeURIComponent(entry.slotId)+'/'+encodeURIComponent(entry.assetId);
      await new Promise((resolve,reject)=>{video.addEventListener('ended',resolve,{once:true});video.addEventListener('error',()=>reject(new Error('video playback failed')),{once:true});});
    }else{
      video.pause();video.removeAttribute('src');video.load();video.hidden=true;frame.hidden=false;frame.srcdoc=await(await fetch('/assets/'+encodeURIComponent(entry.slotId)+'/'+encodeURIComponent(entry.assetId))).text();await sleep(entry.durationSeconds);
    }
    const response=await fetch('/playback/'+encodeURIComponent(entry.slotId),{method:'POST'});if(!response.ok)throw new Error('playback event failed: '+response.status);
  }
  try{let entries;try{entries=(await json('/playlist')).manifests;}catch{entries=[await json('/manifest')];}if(!Array.isArray(entries)||entries.length===0)throw new Error('playlist is empty');for(const entry of entries)await play(entry);status.textContent='COMPLETED · PlaybackEvent queued';}catch(error){status.textContent='ERROR · '+String(error);}
})();
</script></body></html>`;
