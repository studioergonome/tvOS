import test from 'node:test';
import assert from 'node:assert/strict';
import {createRotationClock} from '../rotation.mjs';
test('network startup cannot consume a slide dwell period or leave duplicate timers',()=>{
 const timers=new Map();let sequence=0,rotations=0;
 const clock=createRotationClock(()=>rotations++,{setTimer:(callback,delay)=>{const id=++sequence;timers.set(id,{callback,delay});return id;},clearTimer:id=>timers.delete(id)});
 assert.equal(timers.size,0);clock.schedule();assert.equal(timers.get(1).delay,10000);
 clock.schedule();assert.equal(timers.size,1);assert.ok(!timers.has(1));timers.get(2).callback();assert.equal(rotations,1);
 clock.schedule();clock.stop();assert.ok(!timers.has(3));
});
