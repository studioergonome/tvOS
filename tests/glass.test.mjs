import test from 'node:test';
import assert from 'node:assert/strict';
import {coverImageRect} from '../glass.mjs';
test('sampled glass matches centered cover artwork without stretching or empty edges',()=>{
 for(const [iw,ih] of [[1920,1080],[3000,1000],[1000,2000]]){
  const r=coverImageRect(iw,ih,1920,1080);
  assert.ok(r.width>=1920&&r.height>=1080);
  assert.equal(r.x+r.width/2,960);assert.equal(r.y+r.height/2,540);
  assert.ok(Math.abs(r.width/r.height-iw/ih)<.00001);
 }
});
