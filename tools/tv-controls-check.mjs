import {connectTV} from './tv-client.mjs';
import {writeFile} from 'node:fs/promises';
const tv=await connectTV(Number(process.argv[2]));
try{
 const result=await tv.evaluate(`(async()=>{
 const assert=(ok,message)=>{if(!ok)throw new Error(message);};
 const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const key=name=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:name,bubbles:true}));
 const home=()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}));
 const inside=(parent,child)=>{const p=parent.getBoundingClientRect(),c=child.getBoundingClientRect();return c.left>=p.left&&c.right<=p.right&&c.top>=p.top&&c.bottom<=p.bottom;};
 home();assert(document.querySelector('.hero-caption h1').textContent==='','Home fallback title remains.');
 for(const circle of document.querySelectorAll('header .circle')){const a=circle.getBoundingClientRect(),b=circle.querySelector('img').getBoundingClientRect();assert(Math.abs(a.x+a.width/2-b.x-b.width/2)<.5&&Math.abs(a.y+a.height/2-b.y-b.height/2)<.5,'Shortcut icon is not centred.');}
 document.querySelector('.dock [aria-label="IPTV"]').click();document.querySelector('#tile-grid button').click();
 const host=document.querySelector('#channel-country-wrap'),trigger=host.querySelector('.country-trigger');
 assert(inside(host,host.querySelector('.country-chevron')),'Country chevron escapes bubble.');
 trigger.click();assert(!host.querySelector('.country-menu').hidden,'Country menu failed to open.');
 Array.from(host.querySelectorAll('.country-option')).find(o=>o.textContent==='Australia').click();
 assert(document.querySelector('#channel-country').value==='AU'&&document.querySelectorAll('.channel-tile').length===11,'Country menu failed to filter.');
 trigger.click();key('Escape');assert(host.querySelector('.country-menu').hidden,'Escape failed to close country menu.');
 trigger.click();host.querySelector('.country-option').click();await frame();
 const scroller=document.querySelector('#library');scroller.scrollTop=scroller.scrollHeight;await frame();await frame();
 assert(!!document.querySelector('#tile-grid button[data-grid-index="772"]'),'Final channel is unreachable.');
 assert(document.querySelectorAll('.channel-tile').length<=65,'Channel window is unbounded.');
 scroller.scrollTop=0;await frame();assert(!!document.querySelector('#tile-grid button[data-grid-index="0"]'),'First row failed to return.');
 home();document.querySelector('[data-action="settings"]').click();
 Array.from(document.querySelectorAll('#settings-rows button')).find(b=>b.textContent.includes('Artwork Rotation')).click();document.querySelector('#artwork-rows button').click();
 const field=document.querySelector('.country-select-field');field.querySelector('.country-trigger').click();
 assert(inside(field,field.querySelector('.country-chevron')),'TMDB country chevron escapes field.');
 key('Escape');assert(field.querySelector('.country-menu').hidden&&!document.querySelector('#overlay').hidden,'Country Escape closed the settings dialog.');
 document.querySelector('#cancel-catalogue').click();home();await frame();
 return JSON.stringify({icons:'centred',countryMenu:'passed',tmdbCountryMenu:'passed',lastChannel:'reachable',homeTitle:'removed'});
})()`);
 console.log(result);
 if(process.argv[3]){const shot=await tv.command('Page.captureScreenshot',{format:'png'});await writeFile(process.argv[3],Buffer.from(shot.data,'base64'));}
}finally{tv.close();}
