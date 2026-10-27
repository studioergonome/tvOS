import test from 'node:test';
import assert from 'node:assert/strict';
import {fadeArtwork} from '../artwork-transition.mjs';
test('gradual crossfade keeps the previous artwork until the incoming fade completes',async()=>{
 const classes=new Set(),previous={removed:false,remove(){this.removed=true;}},incoming={style:{},classList:{add:c=>classes.add(c),remove:(...names)=>names.forEach(c=>classes.delete(c))}};
 const timers=[];let updated=false,appended=false;
 const pending=fadeArtwork({querySelector:()=>previous,append:()=>{appended=true;}},incoming,{frame:callback=>callback(),delay:(callback,ms)=>timers.push({callback,ms}),onMidpoint:()=>{updated=true;}});
 assert.ok(appended&&classes.has('artwork-visible'));assert.equal(incoming.style.transitionDuration,'1800ms');assert.equal(previous.removed,false);
 assert.deepEqual(timers.map(t=>t.ms),[200,1880]);timers[0].callback();assert.ok(updated);assert.equal(previous.removed,false);
 timers[1].callback();await pending;assert.ok(previous.removed);assert.ok(!classes.has('artwork-visible'));
});
test('reduced motion skips the fade duration',async()=>{
 const previous={remove(){}},incoming={style:{},classList:{add(){},remove(){}}};
 await fadeArtwork({querySelector:()=>previous,append(){}},incoming,{reduced:true,frame:callback=>callback(),delay:(callback,ms)=>{assert.equal(ms,0);callback();}});
 assert.equal(incoming.style.transitionDuration,'0ms');
});

test('first-slide caption is committed before the incoming image becomes visible',async()=>{
 let captionReady=false;const incoming={style:{},classList:{add(){assert.ok(captionReady);},remove(){}}};
 await fadeArtwork({querySelector:()=>null,append(){}},incoming,{onStart:()=>{captionReady=true;},frame:callback=>callback(),delay:callback=>callback()});
 assert.ok(captionReady);
});
