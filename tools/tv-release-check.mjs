// Version 1.0 hardware checks against the launcher's own local inspector only.
import {connectTV} from './tv-client.mjs';
import {writeFile} from 'node:fs/promises';
const tv=await connectTV(Number(process.argv[2]));
try{
 const result=await tv.evaluate(`(async()=>{
 const $=s=>document.querySelector(s),all=s=>Array.from(document.querySelectorAll(s));
 const assert=(ok,message)=>{if(!ok)throw new Error(message);};
 const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const key=name=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:name,bubbles:true}));
 const home=()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}));
 const labels=()=>all('#app-dock button').map(b=>b.getAttribute('aria-label'));
 home();await frame();assert(labels().join('|')==='Apple TV|Netflix|Prime Video|Stremio|IPTV','Home dock order');
 $('#app-dock .tile-wrap:last-child button').click();await frame();
 const categories=all('#tile-grid button').map(b=>b.getAttribute('aria-label'));
 assert(categories.join('|')==='Business|Entertainment|News|Sports|Travel','Category order');
 assert(labels().join('|')==='Apple TV|Netflix|Prime Video|Stremio|Settings','IPTV dock shortcut');
 const dock=$('#app-dock').getBoundingClientRect(),first=$('#tile-grid button').getBoundingClientRect();
 assert(dock.bottom<first.top,'Dock overlaps category tiles');
 assert(!document.activeElement.matches('.tile'),'Category initial focus');
 $('#app-dock .tile-wrap:last-child button').click();await frame();assert(!$('#settings').hidden,'Dock Settings link');
 key('Escape');await frame();assert(!$('#library').hidden,'Back from Settings');
 const expected={Business:2,Entertainment:0,News:10,Sports:1,Travel:0},counts={};
 for(const name of categories){
  all('#tile-grid button').find(b=>b.getAttribute('aria-label')===name).click();await frame();
  counts[name]=window.CHANNELS[name].length;assert(counts[name]===expected[name],name+' channel count');
  assert(!document.activeElement.matches('.tile'),name+' initial focus');
  assert(!$('#app-dock').hidden,name+' dock visibility');
  assert(!$('#channel-country'),name+' old country selector');
  if(counts[name]){key('ArrowDown');assert(document.activeElement.closest('#app-dock'),'Remote enters dock');key('ArrowDown');assert(document.activeElement.matches('#tile-grid button'),'Remote enters grid');key('ArrowUp');assert(document.activeElement.closest('#app-dock'),'Remote returns to dock');}
  key('Escape');await frame();assert($('#top-title').textContent==='IPTV','Back to categories');
 }
 home();await frame();
 let configured=false;try{configured=!!JSON.parse(localStorage.getItem('tvos.catalogue')||'{}').key;}catch{}
 return {categories,counts,dockSettings:'passed',dockGridSpacing:'passed',remoteDockGrid:'passed',initialFocus:'none',tmdbConfigured:configured};
})()`);
 console.log(JSON.stringify(result,null,2));
 if(process.argv[3])await writeFile(process.argv[3],JSON.stringify(result,null,2)+'\n');
}finally{tv.close();}
