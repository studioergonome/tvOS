import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayback,streamURL} from '../playback.mjs';
class Video extends EventTarget{
 src='';paused=true;loads=0;
 load(){this.loads++;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(name){if(name==='src')this.src='';}
}
test('native playback tries the next source on failure and releases the decoder on Back',()=>{
 const video=new Video();const statuses=[];const player=createPlayback(video,{status:s=>statuses.push(s)});
 player.start({streams:['https://example.com/a.m3u8','https://example.com/b.m3u8']});
 assert.equal(video.src,'https://example.com/a.m3u8');video.dispatchEvent(new Event('error'));
 assert.equal(video.src,'https://example.com/b.m3u8');video.dispatchEvent(new Event('playing'));
 assert.equal(statuses.at(-1),'');player.stop();assert.equal(player.active,false);assert.equal(video.src,'');assert.equal(video.paused,true);
});
test('missing, exhausted and unsafe streams produce an inline-safe error',()=>{
 assert.equal(streamURL('javascript:alert(1)'),null);assert.equal(streamURL('file:///tmp/test'),null);assert.equal(streamURL('https://user:pass@example.com'),null);
 const video=new Video();let failures=0;const player=createPlayback(video,{failed:()=>failures++});
 assert.equal(player.start({streams:[]}),false);player.start({streams:['https://example.com/a']});video.dispatchEvent(new Event('error'));
 assert.equal(failures,2);assert.equal(player.active,false);
});
test('a stalled stream times out and does not leave the player active',async()=>{
 const video=new Video();let failure='';const player=createPlayback(video,{failed:m=>failure=m,timeout:5});
 player.start({streams:['https://example.com/a']});await new Promise(resolve=>setTimeout(resolve,20));assert.equal(player.active,false);assert.match(failure,/unavailable/);
});

test('buffering status has no trailing dots and clears when playback resumes',()=>{
 const video=new Video(),statuses=[];const player=createPlayback(video,{status:s=>statuses.push(s)});
 player.start({streams:['https://example.com/live.m3u8']});video.dispatchEvent(new Event('waiting'));assert.equal(statuses.at(-1),'Buffering');
 video.dispatchEvent(new Event('playing'));assert.equal(statuses.at(-1),'');player.stop();
});
