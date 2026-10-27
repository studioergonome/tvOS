// Development-only checks against this app through LG's local inspector tunnel.
// Usage: node tools/tv-smoke.mjs <local inspector port> [screenshot output path]
import {writeFile} from 'node:fs/promises';
const port=Number(process.argv[2]);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Pass the local ares-inspect port.');
const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target=targets.find(t=>t.url?.includes('/applications/com.tvos.launcher/index.html'));
if(!target)throw new Error('The tvOS app is not running in this inspector.');
const socket=new WebSocket(target.webSocketDebuggerUrl.replace('localhost','127.0.0.1'));
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let id=0;const pending=new Map();
socket.onmessage=event=>{const message=JSON.parse(event.data);const call=pending.get(message.id);if(!call)return;pending.delete(message.id);clearTimeout(call.timer);message.error?call.reject(new Error(message.error.message)):call.resolve(message.result);};
function command(method,params={}){return new Promise((resolve,reject)=>{const current=++id,timer=setTimeout(()=>{pending.delete(current);reject(new Error('TV inspector command timed out: '+method));},12000);pending.set(current,{resolve,reject,timer});socket.send(JSON.stringify({id:current,method,params}));});}
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value;}
async function key(name,keyCode){await command('Input.dispatchKeyEvent',{type:'keyDown',key:name,windowsVirtualKeyCode:keyCode,nativeVirtualKeyCode:keyCode});await command('Input.dispatchKeyEvent',{type:'keyUp',key:name,windowsVirtualKeyCode:keyCode,nativeVirtualKeyCode:keyCode});}
function requireState(ok,message){if(!ok)throw new Error(message);}
try{
 const boot=JSON.parse(await evaluate('JSON.stringify({title:document.title,width:innerWidth,height:innerHeight,dock:document.querySelectorAll(".dock button").length,stage:document.querySelector("#tv").getBoundingClientRect().toJSON(),clock:!!document.querySelector("#clock").textContent})'));
 requireState(boot.title==='tvOS'&&boot.dock===5&&boot.stage.width===1920&&boot.stage.height===1080&&boot.clock,'Home startup/layout failed.');
 await key('h',72);
 await key('ArrowDown',40);for(let n=0;n<4;n++)await key('ArrowRight',39);
 requireState(await evaluate('document.activeElement.getAttribute("aria-label")==="IPTV"'),'Remote arrows did not reach IPTV.');
 await key('Enter',13);
 requireState(await evaluate('document.querySelector("#top-title").textContent==="IPTV"&&document.querySelectorAll("#tile-grid button").length===5'),'IPTV categories did not open.');
 requireState(await evaluate('!document.activeElement.matches("#tile-grid button")'),'First category was automatically focused.');
 await key('ArrowDown',40);await key('ArrowDown',40);await key('ArrowRight',39);await key('ArrowRight',39);await key('Enter',13);
 requireState(await evaluate('document.querySelector("#top-title").textContent==="News"&&document.querySelectorAll(".channel-tile").length>0'),'News channels did not open.');
 requireState(await evaluate('!document.activeElement.matches("#tile-grid button")'),'First channel was automatically focused.');
 const count=await evaluate('window.CHANNELS.News.length');
 requireState(await evaluate('document.querySelectorAll(".channel-tile").length<=65'),'Channel DOM is not bounded.');
 requireState(await evaluate('!document.querySelector("#channel-country")'),'Removed Country selector is still present.');
 // Exercise the actual application listener with LG's Back keycode.
 await evaluate('document.activeElement.dispatchEvent(new KeyboardEvent("keydown",{key:"Unidentified",keyCode:461,bubbles:true}));true');
 requireState(await evaluate('document.querySelector("#top-title").textContent==="IPTV"'),'LG Back event did not return one page.');
 await key('h',72);
 requireState(await evaluate('!document.querySelector("#home").hidden'),'Return Home failed.');
 const rects=await evaluate('JSON.stringify(Array.from(document.querySelectorAll("header .circle,.profile,.dock .tile")).map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute("aria-label")||"Clock",x:r.x,y:r.y,width:r.width,height:r.height};}))');
 await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');
 if(process.argv[3]){const capture=await command('Page.captureScreenshot',{format:'png'});await writeFile(process.argv[3],Buffer.from(capture.data,'base64'));}
 console.log(JSON.stringify({boot,channels:count,navigation:'passed',controls:JSON.parse(rects)},null,2));
}finally{socket.close();for(const call of pending.values())clearTimeout(call.timer);}
