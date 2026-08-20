/** Shared Browser Player shell for single-manifest and playlist Edge surfaces. */
export const PLAYER_HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mostarda Player</title>
<style>html,body,main,#creative,#video{margin:0;width:100vw;height:100vh;overflow:hidden;background:#000}body{touch-action:none;user-select:none}#creative,#video{position:fixed;inset:0;border:0;display:block;object-fit:contain;pointer-events:none}#video::-webkit-media-controls,#video::-webkit-media-controls-enclosure,#video::-webkit-media-controls-overlay-play-button,#video::-webkit-media-controls-panel{display:none!important}#player-status{position:fixed;left:-10000px;top:-10000px}</style></head>
<body><main id="player-status">LOADING</main><iframe id="creative" title="Mostarda Creative" sandbox=""></iframe><video id="video" muted playsinline hidden></video>
<script>
(async () => {
  const status=document.getElementById('player-status'), frame=document.getElementById('creative');
  let video=document.getElementById('video');
  const sleep=(seconds)=>new Promise((resolve)=>setTimeout(resolve,Math.max(0,seconds)*1000));
  async function json(url){const response=await fetch(url);if(!response.ok)throw new Error('request failed: '+response.status);return response.json();}
  async function text(url){const response=await fetch(url);if(!response.ok)throw new Error('request failed: '+response.status);return response.text();}
  const configureVideoSurface=(surface)=>{surface.muted=true;surface.autoplay=true;surface.controls=false;surface.removeAttribute('controls');surface.setAttribute('playsinline','');surface.setAttribute('webkit-playsinline','');surface.setAttribute('disablepictureinpicture','');surface.preload='auto';surface.hidden=true;surface.style.visibility='hidden';surface.style.pointerEvents='none';};
  const teardownVideoSurface=()=>{const previous=video;previous.pause();previous.loop=false;previous.removeAttribute('src');previous.load();previous.hidden=true;previous.style.visibility='hidden';const replacement=document.createElement('video');configureVideoSurface(replacement);previous.replaceWith(replacement);video=replacement;};
  async function retryUntilSlotBoundary(entry){
    const slotEndsAt=Number(entry.slotEndsAt||0);
    while(slotEndsAt<=0||Date.now()<slotEndsAt){
      try{await play(entry);return;}
      catch{teardownVideoSurface();const remaining=slotEndsAt>0?Math.max(0,(slotEndsAt-Date.now())/1000):0;if(remaining<=0)return;await sleep(Math.min(0.25,remaining));}
    }
  }
  async function waitForSchedule(){for(;;){try{return await json('/schedule/current');}catch{await sleep(0.25);}}}
  async function acknowledgePlayback(playbackSlotId,playbackKey){for(;;){try{const query=playbackKey===undefined?'':('?playbackKey='+encodeURIComponent(playbackKey));const response=await fetch('/playback/'+encodeURIComponent(playbackSlotId)+query,{method:'POST'});if(!response.ok)throw new Error('playback event failed: '+response.status);return;}catch{await sleep(0.25);}}}
  async function play(entry){
    const assetUrl=entry.assetUrl||('/assets/'+encodeURIComponent(entry.slotId)+'/'+encodeURIComponent(entry.assetId));
    const playbackSlotId=entry.playbackSlotId||entry.slotId;
    if(entry.mediaType==='video/mp4'){
      frame.hidden=false;teardownVideoSurface();const activeVideo=video;activeVideo.hidden=false;activeVideo.style.visibility='hidden';activeVideo.src=assetUrl;
    const offset=Number(entry.offsetSeconds||0);const segment=Number(entry.segmentDurationSeconds||entry.durationSeconds||15);const slotEndsAt=Number(entry.slotEndsAt||0);const slotBudget=slotEndsAt>0?Math.max(0,(slotEndsAt-Date.now())/1000):segment;const playbackDuration=Math.min(segment,slotBudget);
    if(playbackDuration<=0){teardownVideoSurface();frame.hidden=false;await sleep(0);return false;}
      await new Promise((resolve,reject)=>{
        let settled=false;
        let timer;
        const finish=()=>{if(settled)return;settled=true;window.clearTimeout(timer);activeVideo.pause();activeVideo.loop=false;activeVideo.removeEventListener('ended',finish);activeVideo.removeEventListener('error',fail);activeVideo.removeEventListener('timeupdate',onTime);activeVideo.removeEventListener('playing',reveal);teardownVideoSurface();frame.hidden=false;resolve();};
        const fail=()=>{if(settled)return;settled=true;reject(new Error('video playback failed'));};
        const onTime=()=>{if(activeVideo.currentTime>=offset+playbackDuration-0.08)finish();};
        const reveal=()=>{frame.hidden=true;activeVideo.style.visibility='visible';};
        activeVideo.addEventListener('ended',finish,{once:true});activeVideo.addEventListener('error',fail,{once:true});activeVideo.addEventListener('timeupdate',onTime);
        activeVideo.addEventListener('playing',reveal,{once:true});
        activeVideo.addEventListener('loadedmetadata',()=>{try{activeVideo.currentTime=offset;}catch{}},{once:true});
        timer=window.setTimeout(finish,Math.max(playbackDuration,0.25)*1000);
        void activeVideo.play().catch(fail);
      });
    }else{
      const markup=await text(assetUrl);teardownVideoSurface();frame.hidden=false;frame.srcdoc=markup;const slotEndsAt=Number(entry.slotEndsAt||0);const segment=Number(entry.segmentDurationSeconds||entry.durationSeconds||15);const slotBudget=slotEndsAt>0?Math.max(0,(slotEndsAt-Date.now())/1000):segment;await sleep(Math.min(segment,slotBudget));
    }
    await acknowledgePlayback(playbackSlotId,entry.playbackKey);
  }
  let scheduled;
  try{scheduled=await json('/schedule/current');}catch{scheduled=undefined;}
  if(scheduled){while(true){const current=await waitForSchedule();await retryUntilSlotBoundary({...current.content,playbackSlotId:current.slotId,playbackKey:current.playbackKey,assetUrl:current.assetUrl,slotEndsAt:current.slotEndsAt});const remaining=Math.max(0,(Number(current.slotEndsAt||Date.now())-Date.now())/1000);await sleep(remaining);}}
  try{let entries;try{entries=(await json('/playlist')).manifests;}catch{entries=[await json('/manifest')];}if(!Array.isArray(entries)||entries.length===0)throw new Error('playlist is empty');for(const entry of entries)await play(entry);status.textContent='COMPLETED · PlaybackEvent queued';}catch(error){status.textContent='ERROR · '+String(error);}
})();
</script></body></html>`;
