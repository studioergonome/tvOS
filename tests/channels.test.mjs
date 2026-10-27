import test from 'node:test';
import assert from 'node:assert/strict';
import {filterChannels,channelCountries} from '../channels.mjs';
const items=[{name:'AU',countries:['AU']},{name:'US',countries:['US']},{name:'Both',countries:['AU','US']},{name:'Unknown',countries:[]}];
test('country filter includes multi-country channels and isolates unclassified entries',()=>{
 assert.equal(filterChannels(items).length,4);
 assert.deepEqual(filterChannels(items,'AU').map(c=>c.name),['AU','Both']);
 assert.deepEqual(filterChannels(items,'US').map(c=>c.name),['US','Both']);
 assert.deepEqual(filterChannels(items,'ZZ').map(c=>c.name),['Unknown']);
 assert.equal(filterChannels(items,'NZ').length,0);
 assert.deepEqual(channelCountries(items).sort(),['AU','US','ZZ']);
});
