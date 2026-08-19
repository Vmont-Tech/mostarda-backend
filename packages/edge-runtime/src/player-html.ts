/** Shared Browser Player shell for single-manifest and playlist Edge surfaces. */
export const PLAYER_HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mostarda Player</title>
<style>html,body,main,#creative,#video{margin:0;width:100vw;height:100vh;overflow:hidden;background:#000}body{touch-action:none;user-select:none}#creative,#video{position:fixed;inset:0;border:0;display:block;object-fit:contain;pointer-events:none}#video::-webkit-media-controls,#video::-webkit-media-controls-enclosure,#video::-webkit-media-controls-overlay-play-button,#video::-webkit-media-controls-panel{display:none!important}#player-status{position:fixed;left:-10000px;top:-10000px}</style></head>
<body><main id="player-status">LOADING</main><iframe id="creative" title="Mostarda Creative" sandbox=""></iframe><video id="video" muted playsinline hidden></video>
<script>
(async () => {
  const status=document.getElementById('player-status'), frame=document.getElementById('creative'), video=document.getElementById('video');
  const sleep=(seconds)=>new Promise((resolve)=>setTimeout(resolve,Math.max(0,seconds)*1000));
  async function json(url){const response=await fetch(url);if(!response.ok)throw new Error('request failed: '+response.status);return response.json();}
  async function play(entry){
    const assetUrl=entry.assetUrl||('/assets/'+encodeURIComponent(entry.slotId)+'/'+encodeURIComponent(entry.assetId));
    const playbackSlotId=entry.playbackSlotId||entry.slotId;
    if(entry.mediaType==='video/mp4'){
      frame.hidden=true;video.hidden=false;video.style.visibility='hidden';video.autoplay=true;video.controls=false;video.removeAttribute('controls');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.setAttribute('disablepictureinpicture','');video.preload='auto';video.loop=true;video.src=assetUrl;
      const offset=Number(entry.offsetSeconds||0);const segment=Number(entry.segmentDurationSeconds||entry.durationSeconds||15);
      await new Promise((resolve,reject)=>{
        let settled=false;
        let timer;
        const finish=()=>{if(settled)return;settled=true;window.clearTimeout(timer);video.pause();video.loop=false;video.style.visibility='hidden';video.removeEventListener('ended',finish);video.removeEventListener('error',fail);video.removeEventListener('timeupdate',onTime);video.removeEventListener('playing',reveal);resolve();};
        const fail=()=>{if(settled)return;settled=true;reject(new Error('video playback failed'));};
        const onTime=()=>{if(video.currentTime>=offset+segment-0.08)finish();};
        const reveal=()=>{video.style.visibility='visible';};
        video.addEventListener('ended',finish,{once:true});video.addEventListener('error',fail,{once:true});video.addEventListener('timeupdate',onTime);
        video.addEventListener('playing',reveal,{once:true});
        video.addEventListener('loadedmetadata',()=>{try{video.currentTime=offset;}catch{}},{once:true});
        timer=window.setTimeout(finish,Math.max(segment,0.25)*1000);
        void video.play().catch(fail);
      });
    }else{
      video.pause();video.removeAttribute('src');video.load();video.hidden=true;frame.hidden=false;frame.srcdoc=await(await fetch(assetUrl)).text();await sleep(Number(entry.segmentDurationSeconds||entry.durationSeconds||15));
    }
    const playbackKey=entry.playbackKey===undefined?'':('?playbackKey='+encodeURIComponent(entry.playbackKey));
    const response=await fetch('/playback/'+encodeURIComponent(playbackSlotId)+playbackKey,{method:'POST'});if(!response.ok)throw new Error('playback event failed: '+response.status);
  }
  let scheduled;
  try{scheduled=await json('/schedule/current');}catch{scheduled=undefined;}
  if(scheduled){
    try{while(true){const current=await json('/schedule/current');await play({...current.content,playbackSlotId:current.slotId,playbackKey:current.playbackKey,assetUrl:current.assetUrl});const remaining=Math.max(0,(Number(current.slotEndsAt||Date.now())-Date.now())/1000);await sleep(remaining);}}
    catch(error){status.textContent='ERROR '+String(error);return;}
  }
  try{let entries;try{entries=(await json('/playlist')).manifests;}catch{entries=[await json('/manifest')];}if(!Array.isArray(entries)||entries.length===0)throw new Error('playlist is empty');for(const entry of entries)await play(entry);status.textContent='COMPLETED · PlaybackEvent queued';}catch(error){status.textContent='ERROR · '+String(error);}
})();
</script></body></html>`;
