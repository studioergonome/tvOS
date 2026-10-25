// Native webOS media playback: one video decoder, bounded retries, no HTML injection.
export function streamURL(value){
 try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||!u.hostname)return null;return u.href;}catch{return null;}
}
export function createPlayback(video,{status=()=>{},playing=()=>{},failed=()=>{},timeout=20000}={}){
 let sources=[],index=-1,timer=null,active=false,generation=0;
 const clear=()=>{clearTimeout(timer);timer=null;};
 function stop(){active=false;generation++;clear();video.pause();video.removeAttribute('src');video.load();}
 function next(){
  if(!active)return;clear();index++;
  if(index>=sources.length){stop();failed('This channel is unavailable or uses a format this TV cannot play.');return;}
  const current=++generation;
  status('Loading channel…');video.src=sources[index];video.load();
  timer=setTimeout(()=>{if(current===generation)next();},timeout);
  const result=video.play();if(result?.catch)result.catch(()=>{if(current===generation)next();});
 }
 video.addEventListener('error',()=>{if(active)next();});
 video.addEventListener('playing',()=>{if(active){clear();status('');playing();}});
 video.addEventListener('waiting',()=>{if(active){status('Buffering…');clear();const current=generation;timer=setTimeout(()=>{if(current===generation)next();},timeout);}});
 return {get active(){return active;},start(channel){stop();sources=[...new Set((channel.streams||[]).map(streamURL).filter(Boolean))];if(!sources.length){failed('No playable stream is configured for this channel.');return false;}active=true;index=-1;next();return true;},stop,toggle(){if(!active)return;if(video.paused){const result=video.play();result?.catch?.(()=>status('Press Play to resume.'));}else{video.pause();status('Paused');}}};
}
