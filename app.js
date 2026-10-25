import {setupCountryMenu,closeCountryMenus} from './country-menu.mjs';
import {createChannelGrid} from './grid.mjs';
import {setupGlass} from './glass.mjs';
import {createPlayback} from './playback.mjs';
import {filterChannels,channelCountries} from './channels.mjs';
import {PageHistory} from './navigation.mjs';
import {createTV} from './tv.mjs';
import {tmdb,fetchCatalogue,credentialKind} from './artwork.mjs';
'use strict';
const $ = s => document.querySelector(s);
const categories = ['News','Sports','Movies','Music','Kids','Entertainment','Documentary','Comedy','Business','Science','Travel'];
const categoryIcons = ['newspaper','cricket.ball','popcorn','music.note.square.stack','teddybear','figure.socialdance','film','theatermasks','suitcase','atom','airplane'];
const categoryPalette=['blue','green','pink','purple'];
const categoryColours=[0,1,2,3,1,3,0,2,0,3,1];
let page = 'home', category = null, beforeDialog = null, libraryFocus = null;
let channelCountry='',logoObserver=null,channelGrid=null,libraryCount=0;
const navigation=new PageHistory();
const previewArtwork=$('#artwork img');
function useFallbackArtwork(){if(previewArtwork.getAttribute('src')==='assets/branding/fallback.svg')return;previewArtwork.src='assets/branding/fallback.svg';previewArtwork.alt='';$('.hero-caption h1').textContent='';$('.hero-caption p').textContent='';$('.hero-caption .eyebrow').textContent='';}
previewArtwork.addEventListener('error',useFallbackArtwork,{once:true});
if(previewArtwork.complete&&!previewArtwork.naturalWidth)useFallbackArtwork();
const TV=createTV(window);
if(TV.available)setTimeout(()=>TV.checkApps().catch(()=>{}),1200);
const glass=setupGlass({stage:$('#tv'),artwork:$('#artwork'),library:$('#library')});
let playerReturn=null;
const player=createPlayback($('#channel-video'),{
 status:message=>{$('#player-status').textContent=message;},
 failed:message=>{closePlayer();$('#device-status').textContent=message;}
});
function openPlayer(channel,button){
 playerReturn=button;$('#device-status').textContent='';$('#player-name').textContent=channel.name||'';
 $('#player').hidden=false;
 $$('header,#home,#library,#settings,#inputs,#artwork-settings').forEach(e=>e.inert=true);
 $('#close-player').focus({preventScroll:true});player.start(channel);
}
function closePlayer(){
 player.stop();$('#player').hidden=true;glass.refresh();
 $$('header,#home,#library,#settings,#inputs,#artwork-settings').forEach(e=>e.inert=false);
 if(playerReturn?.isConnected)playerReturn.focus({preventScroll:true});playerReturn=null;
}
$('#close-player').onclick=closePlayer;
$('#play-pause').onclick=()=>player.toggle();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&player.active)closePlayer();});
let prefs = {motion:true,glass:true,large:false,contrast:false};
try { prefs = {...prefs,...JSON.parse(localStorage.getItem('tvos.preferences') || '{}')}; } catch {}
// Restore glass once for the requested clear-material revision; later choices persist.
if(prefs.materialRevision!==4){prefs.glass=true;prefs.materialRevision=4;}
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function image(src,alt=''){const el=node('img');el.src=src;el.alt=alt;return el;}
function applyPrefs(){document.body.classList.toggle('reduced',!prefs.motion);document.body.classList.toggle('solid',!prefs.glass);document.body.classList.toggle('large',prefs.large);document.body.classList.toggle('contrast',prefs.contrast);try{localStorage.setItem('tvos.preferences',JSON.stringify(prefs));}catch{}}
function tile(label,cls,action){const wrap=node('div','tile-wrap');const button=node('button','tile '+cls);button.setAttribute('aria-label',label);button.onclick=action;const caption=node('span','tile-label',label);wrap.append(button,caption);return {wrap,button};}
const dockApps=[['Apple TV','apple','assets/logos/apple tv logo.png'],['Prime Video','prime','assets/logos/Prime_Video_Logo_Mature_Market_Off_White_RGB.png'],['Netflix','netflix','assets/logos/Netflix_Logo_RGB.png'],['IPTV','iptv','assets/icons/iptv.png'],['Stremio','stremio',null]];
dockApps.forEach(([name,cls,src])=>{const t=tile(name,cls,()=>name==='IPTV'?navigate('categories'):deviceAction(()=>TV.launch(name)));if(src)t.button.append(image(src));else t.button.append(node('span','stremio-mark'));if(name==='IPTV')t.button.append(node('span','iptv-word','IPTV'));$('.dock').append(t.wrap);});
function navigate(target,name,restore=false,record=true){
 if(player.active)closePlayer();
 if(record){const buttons=$$('#tv button');navigation.visit(target,name||null,{focusIndex:buttons.indexOf(document.activeElement),gridIndex:document.activeElement?.dataset.gridIndex===undefined?-1:Number(document.activeElement.dataset.gridIndex),rowIndex:$$('.preferences-page:not([hidden]) .setting-row').indexOf(document.activeElement),scroll:$('#library').scrollTop});}
 $('#device-status').textContent='';
 closeDialog(false);page=target;category=name||null;document.body.classList.toggle('inner',target!=='home');
 $('#home').hidden=target!=='home';$('#library').hidden=!['categories','channels'].includes(target);$('#settings').hidden=target!=='settings';$('#inputs').hidden=target!=='inputs';$('#artwork-settings').hidden=target!=='artwork-settings';
 document.body.classList.toggle('grid-idle',['categories','channels'].includes(target));
 updateHeader();glass.refresh();
 if(target==='categories'||target==='channels')renderLibrary(target,name);
 if(target==='settings')renderSettings();
 if(target==='inputs')renderInputs();
 if(target==='artwork-settings')renderArtwork();
 if(['home','categories','channels'].includes(target)){document.activeElement?.blur();if(target==='home'&&artworkIndex<0)nextArtwork();}
 requestAnimationFrame(()=>{let el=target==='home'?null:target==='artwork-settings'?$('#artwork-rows button'):target==='settings'?$('#settings .setting-row'):target==='inputs'?$('#inputs .setting-row'):null;if(el)el.focus({preventScroll:true});});
}
function $$(s){return [...document.querySelectorAll(s)];}
function renderLibrary(target,name){
 channelGrid?.dispose();channelGrid=null;logoObserver?.disconnect();logoObserver=null;
 if('IntersectionObserver' in window)logoObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){const img=entry.target;img.src=img.dataset.logo;delete img.dataset.logo;logoObserver.unobserve(img);}});},{root:$('#library'),rootMargin:'240px'});
 const channels=target==='channels';
 const list=channels?filterChannels(window.CHANNELS[name]||[],channelCountry):categories;
 $('#channel-empty').hidden=!channels||list.length>0;
 if(channels)renderCountryOptions();
 $('#tile-grid').replaceChildren();$('#library').scrollTop=0;
 libraryCount=list.length;
 function createLibraryTile(item,i){
  const label=channels?(typeof item==='string'?item:item.name):item;
  const t=tile(label,channels?'channel-tile':'category-tile palette-'+categoryPalette[categoryColours[i]],()=>{
   if(channels){openPlayer(item,t.button);}
   else{libraryFocus=i;navigate('channels',label);}
  });
  t.button.dataset.gridIndex=String(i);
  if(channels){
   const fallback=node('span','channel-initials',(label.split(/\s+/).length===1?label.slice(0,6):label.split(/\s+/).slice(0,3).map(w=>w[0]).join('')).toUpperCase());
   t.button.append(fallback);
   if(item.logo){const logo=node('img');logo.alt='';logo.className='channel-logo pending';logo.loading='lazy';logo.decoding='async';logo.referrerPolicy='no-referrer'; 
    logo.onload=()=>{logo.classList.remove('pending');fallback.hidden=true;glass.refreshBand();};logo.onerror=()=>{logo.remove();fallback.hidden=false;};t.button.append(logo);if(logoObserver){logo.dataset.logo=item.logo;logoObserver.observe(logo);}else logo.src=item.logo;
   }
  }else{const icon=node('img','category-icon');icon.src='assets/icons/categories/'+categoryIcons[i]+'.png';icon.alt='';t.button.append(icon);}
  return t.wrap;
 }
 if(channels)channelGrid=createChannelGrid({grid:$('#tile-grid'),scroller:$('#library'),stage:$('#tv'),items:list,create:createLibraryTile,remove:el=>el.querySelectorAll('img').forEach(img=>{logoObserver?.unobserve(img);img.onload=null;img.onerror=null;img.removeAttribute('src');}),onChange:()=>glass.refreshBand()});
 else{const fragment=document.createDocumentFragment();list.forEach((item,i)=>fragment.append(createLibraryTile(item,i)));$('#tile-grid').append(fragment);}
}
function focusLibrary(index){if(channelGrid)channelGrid.focus(index);else{$$('#tile-grid button')[index]?.focus({preventScroll:true});}}
function staticRow(label,value){const el=node('div','setting-row static-row');el.append(node('span','',label));const trail=node('span','row-trailing');trail.append(node('span','row-value',value));el.append(trail);return el;}
function row(label,value,action,chevron=false){
 const b=node('button','setting-row'+(chevron?' navigation-row':''));b.append(node('span','',label));const trail=node('span','row-trailing');if(value)trail.append(node('span','row-value',value));if(chevron){const arrow=image('assets/icons/chevron.right.png');arrow.className='row-chevron';trail.append(arrow);}b.append(trail);b.onclick=action;return b;
}
function renderSettings(){
 const rows=$('#settings-rows');rows.replaceChildren(node('p','setting-group','APPEARANCE'));
 [['Reduce Motion','motion',true],['Reduce Transparency','glass',true],['Text Size','large',false],['Increase Contrast','contrast',false]].forEach(([label,key,invert],i)=>{
  const value=key==='large'?(prefs.large?'Large':'Default'):((invert?!prefs[key]:prefs[key])?'On':'Off');
  rows.append(row(label,value,()=>{prefs[key]=!prefs[key];applyPrefs();renderSettings();$$('#settings-rows button')[i].focus({preventScroll:true});}));
 });
 rows.append(node('p','setting-group','CONTENT'),row('Artwork Rotation','',()=>navigate('artwork-settings'),true));
}
function updateHeader(){
 $('#back-link').hidden=page==='home';$('#top-title').hidden=page==='home';$('#channel-country-wrap').hidden=page!=='channels';document.body.classList.toggle('channel-page',page==='channels');
 $('#top-title').textContent=page==='channels'?category:({settings:'Settings',inputs:'HDMI Inputs',categories:'IPTV','artwork-settings':'Artwork Rotation'}[page]||'');
 const parent=page==='channels'?'Categories':page==='artwork-settings'?'Settings':'Home';
 $('.back-label').textContent=parent;$('.home-symbol').hidden=parent!=='Home';$('#back-link').setAttribute('aria-label','Back to '+parent);
}
function closeDialog(restore=true){
 closeCountryMenus();
 if($('#overlay').hidden)return;
 catalogueAbort?.abort();$('#api-key').value='';$('#overlay').hidden=true;
 $$('header,#home,#library,#settings,#inputs,#artwork-settings').forEach(e=>e.inert=false);
 if(restore&&beforeDialog?.isConnected)beforeDialog.focus({preventScroll:true});
}
async function deviceAction(action){
 $('#device-status').textContent='';try{await action();return true;}catch(e){$('#device-status').textContent=e.message;return false;}
}
function inputs(){navigate('inputs');}
function renderInputs(){
 const rows=$('#input-rows');rows.replaceChildren();
 for(let i=1;i<=4;i++)rows.append(row('HDMI '+i,'',async()=>{const ok=await deviceAction(()=>TV.input(i));if(ok){$$('#input-rows button').forEach(x=>x.removeAttribute('aria-pressed'));rows.children[i-1].setAttribute('aria-pressed','true');}}));
}
$$('[data-action]').forEach(b=>b.onclick=()=>{if(b.dataset.action==='settings')navigate('settings');else if(b.dataset.action==='inputs')inputs();else deviceAction(()=>TV.live());});
$('.scrim').onclick=()=>closeDialog();
$('#back-link').onclick=()=>{if(page==='channels'||page==='artwork-settings')back();else navigate('home');};
function back(){
 if(!$('#player').hidden){closePlayer();return;}
 if(!$('#overlay').hidden){closeDialog();return;}
 const previous=navigation.back();
 if(previous){navigate(previous.page,previous.category,false,false);requestAnimationFrame(()=>{if(previous.gridIndex>=0&&['categories','channels'].includes(page)){focusLibrary(previous.gridIndex);$('#library').scrollTop=previous.scroll||0;return;}let el=previous.gridIndex>=0?null:previous.rowIndex>=0?$$('.preferences-page:not([hidden]) .setting-row')[previous.rowIndex]:null;el?.focus({preventScroll:true});$('#library').scrollTop=previous.scroll||0;});}
 else if(page==='home')TV.platformBack();
}
function visibleButtons(){return $$('header button,header select,#home button,.preferences-page:not([hidden]) button,#overlay button,#overlay select,#overlay input').filter(b=>!b.closest('[hidden]')&&!b.closest('[inert]')&&b.getBoundingClientRect().width>0);}
function spatial(key){
 const active=document.activeElement,inLibrary=['categories','channels'].includes(page);
 if(inLibrary&&active?.dataset.gridIndex!==undefined){
  const index=Number(active.dataset.gridIndex),column=index%5;
  if(key==='ArrowLeft'&&column>0)focusLibrary(index-1);
  else if(key==='ArrowRight'&&column<4&&index+1<libraryCount)focusLibrary(index+1);
  else if(key==='ArrowDown'&&index+5<libraryCount)focusLibrary(index+5);
  else if(key==='ArrowUp'){if(index>=5)focusLibrary(index-5);else $('#back-link').focus({preventScroll:true});}
  return;
 }
 const controls=visibleButtons();
 if(inLibrary&&(!controls.includes(active)||key==='ArrowDown')){focusLibrary(0);return;}
 if(!controls.includes(active)){(page==='home'?$('.dock button'):controls[0])?.focus({preventScroll:true});return;}
 const a=active.getBoundingClientRect(),ax=a.x+a.width/2,ay=a.y+a.height/2;
 const horizontal=key==='ArrowLeft'||key==='ArrowRight',sign=key==='ArrowLeft'||key==='ArrowUp'?-1:1;
 let best=null,score=Infinity;
 for(const button of controls){if(button===active)continue;const r=button.getBoundingClientRect(),dx=r.x+r.width/2-ax,dy=r.y+r.height/2-ay;if((horizontal?dx:dy)*sign<=5)continue;const value=Math.abs(horizontal?dx:dy)+Math.abs(horizontal?dy:dx)*4;if(value<score){best=button;score=value;}}
 best?.focus({preventScroll:true});
}
function activateGrid(){if(document.body.classList.contains('grid-idle'))document.body.classList.remove('grid-idle');}
document.addEventListener('pointermove',activateGrid,{passive:true});
document.addEventListener('keydown',e=>{
 if(e.key.startsWith('Arrow'))activateGrid();
 if(!$('#player').hidden){
  if([461,413].includes(e.keyCode)||['Escape','Backspace'].includes(e.key)){e.preventDefault();if(!e.repeat)closePlayer();}
  else if([179,415,19].includes(e.keyCode)||(['Enter',' '].includes(e.key)&&e.target.id!=='close-player')){e.preventDefault();player.toggle();}
  return;
 }
 const editing=!!e.target.matches?.('input,select,textarea');
 if(e.keyCode===461){e.preventDefault();e.stopPropagation();if(!e.repeat)back();return;}
 if(editing&&e.key!=='Tab'){if(e.key==='Escape'){e.preventDefault();closeDialog();}return;}
 if(e.key==='Tab'&&!$('#overlay').hidden){const controls=$$('#catalogue-form input,#catalogue-form select,#catalogue-form button').filter(e=>!e.disabled&&!e.hidden);const i=controls.indexOf(document.activeElement);e.preventDefault();controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}
 else if(e.key==='Enter'||e.keyCode===13){if(document.activeElement?.tagName==='BUTTON'){e.preventDefault();if(!e.repeat)document.activeElement.click();}}
 else if(e.key.startsWith('Arrow')){e.preventDefault();spatial(e.key);}
 else if(e.key==='Escape'||e.key==='Backspace'){e.preventDefault();if(!e.repeat)back();}
 else if($('#overlay').hidden&&e.key.toLowerCase()==='h')navigate('home');
 else if($('#overlay').hidden&&e.key.toLowerCase()==='f'){if(document.fullscreenElement)document.exitFullscreen();else $('#tv').requestFullscreen?.();}
});
function clock(){ const value=new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:'2-digit'}).format(new Date()).toUpperCase();if($('#clock').textContent!==value)$('#clock').textContent=value; }clock();setInterval(clock,1000);applyPrefs();

let catalogueConfig={key:'',country:'AU'},catalogueAbort=null,loadGeneration=0;
let artworkItems=[],artworkIndex=-1,rotationBusy=false,artworkMessage='Connect TMDB to load trending artwork.';
try{const saved=JSON.parse(localStorage.getItem('tvos.catalogue')||'null');if(saved&&typeof saved.key==='string'&&/^[A-Z]{2}$/.test(saved.country))catalogueConfig=saved;}catch{}
const countryCodes='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const regionNames=new Intl.DisplayNames(['en'],{type:'region'});
countryCodes.map(code=>({code,name:regionNames.of(code)})).sort((a,b)=>a.name.localeCompare(b.name)).forEach(({code,name})=>{const option=node('option','',name);option.value=code;$('#country').append(option);});
function renderArtwork(){
 const rows=$('#artwork-rows');rows.replaceChildren();
 rows.append(row('Trending catalogue',catalogueConfig.key?'Connected':'Not configured',openCatalogue),
 staticRow('Country',regionNames.of(catalogueConfig.country)),
 staticRow('Rotate every','30 seconds'),staticRow('Catalogue','3 movies · 3 TV shows'));
 $('#artwork-status').textContent=artworkMessage;
}
function openCatalogue(){
 beforeDialog=document.activeElement;$('#api-key').value='';$('#api-key').placeholder=catalogueConfig.key?'Saved key · enter a new key to replace':'API key or API Read Access Token';
 $('#country').value=catalogueConfig.country;$('#country').dispatchEvent(new Event('change'));$('#form-status').textContent='Your key is saved on this device and sent only to TMDB.';
 $('#save-catalogue').disabled=false;$('#save-catalogue').textContent='Save';
 $('#overlay').hidden=false;$$('header,#home,#library,#settings,#inputs,#artwork-settings').forEach(e=>e.inert=true);$('#api-key').focus();glass.refresh();
}
$('#cancel-catalogue').onclick=()=>closeDialog();
$('#catalogue-form').onsubmit=async event=>{
 event.preventDefault();const key=$('#api-key').value.trim()||catalogueConfig.key,country=$('#country').value;
 try{credentialKind(key);}catch(e){$('#form-status').textContent=e.message;return;}
 catalogueAbort?.abort();catalogueAbort=new AbortController();const signal=catalogueAbort.signal;
 $('#save-catalogue').disabled=true;$('#save-catalogue').textContent='Saving…';$('#form-status').textContent='Checking TMDB…';
 try{
  await tmdb('authentication',key,{signal});if(signal.aborted)return;
  localStorage.setItem('tvos.catalogue',JSON.stringify({key,country}));catalogueConfig={key,country};
  closeDialog(false);artworkMessage='Loading trending artwork…';renderArtwork();$('#artwork-rows button').focus({preventScroll:true});
  loadArtwork();
 }catch(e){if(!signal.aborted){$('#form-status').textContent=e.name==='QuotaExceededError'||e.name==='SecurityError'?'Device storage is unavailable. Your key was not saved.':e.message;$('#save-catalogue').disabled=false;$('#save-catalogue').textContent='Save';}}
};
async function loadArtwork(){
 const generation=++loadGeneration;if(!catalogueConfig.key)return;
 try{
  const items=await fetchCatalogue(catalogueConfig.key,catalogueConfig.country);
  if(generation!==loadGeneration)return;
  artworkItems=items;artworkIndex=-1;
  const movies=items.filter(x=>x.type==='movie').length,shows=items.filter(x=>x.type==='tv').length;
  artworkMessage=items.length?`${movies} movies · ${shows} TV shows available in ${regionNames.of(catalogueConfig.country)}.`:'No matching trending artwork found for these services in your country. Try a different country.';
  if(page==='home')nextArtwork();
 }catch(e){if(generation===loadGeneration)artworkMessage=e.message;}
 if(page==='artwork-settings')renderArtwork();
}
async function nextArtwork(){
 if(rotationBusy||!artworkItems.length||page!=='home'||document.hidden)return;
 rotationBusy=true;const generation=loadGeneration;
 try{
  for(let attempt=0;attempt<artworkItems.length;attempt++){
   artworkIndex=(artworkIndex+1)%artworkItems.length;const item=artworkItems[artworkIndex],img=new Image();img.referrerPolicy='no-referrer';
   try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Image timeout')),10000);img.onload=()=>{clearTimeout(timer);resolve();};img.onerror=()=>{clearTimeout(timer);reject(new Error('Image unavailable'));};img.src=item.image;});}catch{continue;}
   if(generation!==loadGeneration||page!=='home')return;
   const previous=$('#artwork img');img.alt=item.title;img.className='artwork-next';$('#artwork').append(img);
   requestAnimationFrame(()=>requestAnimationFrame(()=>img.classList.add('artwork-visible')));
   setTimeout(()=>{previous?.remove();img.classList.remove('artwork-next','artwork-visible');},700);
   $('.hero-caption h1').textContent=item.title;$('.hero-caption p').textContent=item.overview.length>150?item.overview.slice(0,147)+'…':item.overview;return;
  }
  artworkMessage='Artwork images could not load. Check your connection and try again.';
 }finally{rotationBusy=false;}
}
setInterval(nextArtwork,30000);
setInterval(()=>{if(!document.hidden&&catalogueConfig.key)loadArtwork();},3600000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&page==='home'&&artworkIndex<0)nextArtwork();});
updateHeader();if(catalogueConfig.key)loadArtwork();

function renderCountryOptions(){
 const select=$('#channel-country');if(select.options.length>1){select.value=channelCountry;return;}select.replaceChildren();
 const all=node('option','','Country');all.value='';select.append(all);
 const available=channelCountries(Object.values(window.CHANNELS||{}).flat());
 available.map(code=>({code,name:code==='ZZ'?'Unspecified':regionNames.of(code)})).sort((a,b)=>a.name.localeCompare(b.name)).forEach(({code,name})=>{const option=node('option','',name);option.value=code;select.append(option);});
 select.value=channelCountry;glass.refresh();
}
$('#channel-country').onchange=event=>{channelCountry=event.target.value;renderLibrary('channels',category);$('#channel-country').focus({preventScroll:true});};

setupCountryMenu($('#channel-country'));setupCountryMenu($('#country'));
