// Short native-player checks. Never log stream URLs or saved credentials.
import {connectTV} from './tv-client.mjs';
import {writeFile} from 'node:fs/promises';
const tv=await connectTV(Number(process.argv[2]));
const results=[];
try{
 for(const [category,channel] of [['Sports','Sky Sports Cricket UK HD'],['News','CNN HD'],['Business','CNBC TV18 Prime HD']]){
  const result=await tv.evaluate(`(async()=>{
   const category=${JSON.stringify(category)},channel=${JSON.stringify(channel)},$=s=>document.querySelector(s);
   const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}));await frame();
   $('#app-dock .tile-wrap:last-child button').click();await frame();
   Array.from(document.querySelectorAll('#tile-grid button')).find(b=>b.getAttribute('aria-label')===category).click();await frame();
   const button=Array.from(document.querySelectorAll('#tile-grid button')).find(b=>b.getAttribute('aria-label')===channel);
   if(!button)return {category,channel,playing:false,reason:'Missing channel tile'};
   button.click();const video=$('#channel-video'),start=video.currentTime,deadline=Date.now()+11000;
   while(Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,250));
    if(video.videoWidth>0&&video.readyState>=2&&!video.paused&&video.currentTime>start+.3)return {category,channel,playing:true,width:video.videoWidth,height:video.videoHeight,decodedFrames:video.webkitDecodedFrameCount||0};
    if($('#player').hidden)return {category,channel,playing:false,reason:$('#device-status').textContent};
   }
   return {category,channel,playing:false,width:video.videoWidth,height:video.videoHeight,readyState:video.readyState,error:video.error?video.error.code:null};
  })()`);
  results.push(result);console.log(JSON.stringify(result));
  await tv.evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}));true`);
 }
 if(process.argv[3])await writeFile(process.argv[3],JSON.stringify(results,null,2)+'\n');
}finally{
 try{await tv.evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}));true`);}catch{}
 tv.close();
}
