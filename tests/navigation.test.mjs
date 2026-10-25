import test from 'node:test';
import assert from 'node:assert/strict';
import {PageHistory} from '../navigation.mjs';
import {createTV} from '../tv.mjs';
test('remote Back follows the visited pages including shortcut detours',()=>{
 const h=new PageHistory();h.visit('categories');h.visit('channels','News',{gridIndex:0,scroll:200});h.visit('settings');h.visit('artwork-settings');h.visit('inputs');
 assert.equal(h.back().page,'artwork-settings');assert.equal(h.back().page,'settings');assert.equal(h.back().page,'channels');
 const previous=h.back();assert.equal(previous.page,'categories');assert.equal(previous.gridIndex,0);assert.equal(previous.scroll,200);
 assert.equal(h.back().page,'home');assert.equal(h.back(),null);
});
test('Home resets history and repeated visits do not duplicate pages',()=>{
 const h=new PageHistory();h.visit('settings');h.visit('settings');assert.equal(h.stack.length,1);h.visit('home');assert.equal(h.back(),null);
});
test('LG bridge launches discovered app IDs, live TV and HDMI through application manager',async()=>{
 const calls=[];let platformBack=0;
 const tv=createTV({webOS:{platformBack:()=>platformBack++,service:{request:(uri,opts)=>{
  calls.push({uri,method:opts.method,parameters:opts.parameters});queueMicrotask(()=>opts.onSuccess(opts.method==='listLaunchPoints'?{returnValue:true,launchPoints:[{id:'installed.stremio.id',title:'Stremio'}]}:{returnValue:true}));return {};
 }}}});
 await tv.launch('Stremio');await tv.live();await tv.input(2);tv.platformBack();
 assert.deepEqual(calls.filter(c=>c.method==='launch').map(c=>c.parameters.id),['installed.stremio.id','com.webos.app.livetv','com.webos.app.hdmi2']);assert.equal(platformBack,1);
 await assert.rejects(tv.input(5),/Invalid/);
});
test('failed LG launch reports failure rather than fake success',async()=>{
 const tv=createTV({webOS:{service:{request:(uri,opts)=>{queueMicrotask(()=>opts.onFailure({}));return {};}}}});
 await assert.rejects(tv.live(),/could not complete/);
 const browser=createTV({});assert.equal(browser.available,false);await assert.rejects(browser.input(1),/LG TV/);
});
test('Stremio opens by verified ID when LG denies app enumeration, and resolution is cached',async()=>{
 const calls=[];const tv=createTV({webOS:{service:{request:(uri,opts)=>{
  calls.push(opts);queueMicrotask(()=>opts.method==='listLaunchPoints'?opts.onFailure({}):opts.onSuccess(opts.method==='getAppLoadStatus'?{returnValue:true,exist:opts.parameters.appId==='io.strem.tv'}:{returnValue:true}));return {};
 }}}});
 await tv.launch('Stremio');await tv.launch('Stremio');
 assert.equal(calls.filter(c=>c.method==='getAppLoadStatus').length,1);
 assert.equal(calls.filter(c=>c.method==='listLaunchPoints').length,0);
 assert.deepEqual(calls.filter(c=>c.method==='launch').map(c=>c.parameters.id),['io.strem.tv','io.strem.tv']);
});
