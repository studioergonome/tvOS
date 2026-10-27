// Verify focus behaviour and sample frame pacing on the actual target TV.
import {connectTV} from './tv-client.mjs';
import {writeFile} from 'node:fs/promises';
const tv=await connectTV(Number(process.argv[2]));
try{
 const result=await tv.evaluate(`(async()=>{
 const $=s=>document.querySelector(s),assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
 const key=name=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:name,bubbles:true}));
 const home=()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}));
 const frame=()=>new Promise(r=>requestAnimationFrame(r));
 home();assert(!document.activeElement.matches('.tile'),'Home automatically selected a tile.');
 $('#back-link').click();assert(!$('#home-menu').hidden,'Home menu missing');key('ArrowDown');assert(document.activeElement.dataset.action==='inputs','Menu arrow navigation');key('Escape');assert($('#home-menu').hidden,'Menu Back failed');
 $('[data-action="settings"]').click();await frame();await frame();
 const rows=Array.from(document.querySelectorAll('#settings-rows button'));
 const normal=getComputedStyle(rows[1].firstChild);const before={weight:normal.fontWeight,size:normal.fontSize};
 rows[1].focus();const after=getComputedStyle(rows[1].firstChild);
 assert(before.weight===after.fontWeight&&before.size===after.fontSize&&after.transform==='none','Settings text changes typography on focus');
 if(document.fonts)await document.fonts.ready;for(let n=0;n<12;n++)await frame();
 const frames=[];let previous=await frame();
 for(let i=0;i<45;i++){rows[i%rows.length].focus({preventScroll:true});const stamp=await frame();frames.push(stamp-previous);previous=stamp;}
 home();$('.dock [aria-label="IPTV"]').click();assert(!document.activeElement.matches('.tile'),'Category auto-focus');
 $('#tile-grid button').click();assert(!document.activeElement.matches('.tile'),'Channel auto-focus');
 key('Escape');assert(!document.activeElement.matches('.tile'),'Back restored selected tile');
 home();await frame();
 const sorted=frames.slice().sort((a,b)=>a-b);
 return {fixedSettingsTypography:before,noInitialFocus:'passed',homeMenu:'passed',settingsFrames:{median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted[sorted.length-1]}};
})()`);
 console.log(JSON.stringify(result,null,2));
 if(process.argv[3]){await tv.evaluate(`document.querySelector('#back-link').click();true`);const shot=await tv.command('Page.captureScreenshot',{format:'png'});await writeFile(process.argv[3],Buffer.from(shot.data,'base64'));await tv.evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true`);}
}finally{tv.close();}
