import test from 'node:test';
import assert from 'node:assert/strict';
import {gridWindow} from '../grid.mjs';
test('large channel catalogues render a bounded window of complete rows',()=>{
 for(const scrollTop of [0,800,10000,32000]){
  const w=gridWindow(3931,scrollTop,239,1080,226);
  assert.equal(w.start%5,0);assert.ok(w.end-w.start<=65);assert.ok(w.end<=3931);assert.ok(w.start>=0);
 }
});
test('final partial row and empty country filters stay within the catalogue',()=>{
 assert.deepEqual(gridWindow(0,0,239,1080,226),{start:0,end:0,rows:0});
 const last=gridWindow(11,478,239,1080,226);assert.equal(last.end,11);assert.equal(last.rows,3);
});
