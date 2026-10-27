import {auditCatalogue} from './ratings-audit.mjs';
import {createRotationClock} from './rotation.mjs';
import {fadeArtwork} from './artwork-transition.mjs?v=32';
import {omdbRating,omdbCredential,createRatingCache,lookupIMDbRating,officialPreviewRating,cinemetaIdentity,verifiedIMDbIdentity} from './ratings.mjs?v=32';
import {setupCountryMenu,closeCountryMenus} from './country-menu.mjs';
import {createChannelGrid} from './grid.mjs';
import {setupGlass} from './glass.mjs';
import {createPlayback} from './playback.mjs';
import {PageHistory} from './navigation.mjs';
import {createTV} from './tv.mjs';
import {tmdb,fetchCatalogue,fetchArtworkDetails,fetchIMDbId,credentialKind} from './artwork.mjs?v=32';
'use strict';
const $ = s => document.querySelector(s);
const categories = ['Business','Entertainment','News','Sports','Travel'];
const categoryIcons = ['suitcase','figure.socialdance','newspaper','cricket.ball','airplane'];
const categoryPalette=['blue','green','pink','purple'];
const categoryColours=[0,3,0,1,1];
let page = 'home', category = null, beforeDialog = null, libraryFocus = null;
let logoObserver=null,channelGrid=null,libraryCount=0;
const navigation=new PageHistory();
const previewArtwork=$('#artwork img');
function useFallbackArtwork(){if(previewArtwork.getAttribute('src')==='assets/branding/fallback.svg')return;previewArtwork.src='assets/branding/fallback.svg';previewArtwork.alt='';$('.hero-caption h1').textContent='';$('.hero-caption p').textContent='';$('.hero-metadata').hidden=true;}
previewArtwork.addEventListener('error',useFallbackArtwork,{once:true});
if(previewArtwork.complete&&!previewArtwork.naturalWidth)useFallbackArtwork();
const TV=createTV(window);
const previewLogos=!TV.available&&new URLSearchParams(location.search).get('preview')==='logos';
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
 $$('header,#home,#app-dock,#library,#settings,#inputs,#artwork-settings').forEach(e=>e.inert=true);
 document.activeElement?.blur();$('#player').classList.remove('controls-visible');player.start(channel);
}
function closePlayer(){
 clearTimeout(controlsTimer);player.stop();$('#player').hidden=true;glass.refresh();
 $$('header,#home,#app-dock,#library,#settings,#inputs,#artwork-settings').forEach(e=>e.inert=false);
 document.activeElement?.blur();document.body.classList.add('grid-idle');playerReturn=null;
}
$('#close-player').onclick=closePlayer;
let controlsTimer;
function showPlayerControls(){if($('#player').hidden)return;$('#player').classList.add('controls-visible');clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>{$('#player').classList.remove('controls-visible');if(document.activeElement.closest?.('#player'))document.activeElement.blur();},2500);}
$('#player').addEventListener('pointermove',showPlayerControls,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&player.active)closePlayer();});
let prefs = {motion:true,glass:true,large:false,contrast:false};
try { prefs = {...prefs,...JSON.parse(localStorage.getItem('tvos.preferences') || '{}')}; } catch {}
prefs.large=false;prefs.contrast=false;
// Restore glass once for the requested clear-material revision; later choices persist.
if(prefs.materialRevision!==4){prefs.glass=true;prefs.materialRevision=4;}
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function image(src,alt=''){const el=node('img');el.src=src;el.alt=alt;return el;}
function applyPrefs(){document.body.classList.toggle('reduced',!prefs.motion);document.body.classList.toggle('solid',!prefs.glass);document.body.classList.toggle('large',prefs.large);document.body.classList.toggle('contrast',prefs.contrast);try{localStorage.setItem('tvos.preferences',JSON.stringify(prefs));}catch{}}
function tile(label,cls,action){const wrap=node('div','tile-wrap');const button=node('button','tile '+cls);button.setAttribute('aria-label',label);button.onclick=action;const caption=node('span','tile-label',label);wrap.append(button,caption);return {wrap,button};}
const dockApps=[['Apple TV','apple','assets/logos/providers/apple-tv.png'],['Netflix','netflix','assets/logos/Netflix_Logo_RGB.png'],['Prime Video','prime','assets/logos/Prime_Video_Logo_Mature_Market_Off_White_RGB.png'],['Stremio','stremio','assets/logos/stremio-logotype-light-theme.png'],['IPTV','iptv','assets/icons/iptv-live.png?v=33']];
dockApps.forEach(([name,cls,src])=>{const t=tile(name,cls,()=>name==='IPTV'?navigate('categories'):deviceAction(()=>TV.launch(name)));t.button.append(image(src));$('.dock').append(t.wrap);});
function updateDockShortcut(){
 const settings=['categories','channels'].includes(page),wrap=$('#app-dock .tile-wrap:last-child'),button=wrap.querySelector('button');
 const label=settings?'Settings':'IPTV';button.className='tile '+(settings?'settings-tile':'iptv');button.setAttribute('aria-label',label);
 button.querySelector('img').src=settings?'assets/icons/settings.png':'assets/icons/iptv-live.png?v=33';wrap.querySelector('.tile-label').textContent=label;
 button.onclick=()=>navigate(settings?'settings':'categories');
}


function navigate(target,name,restore=false,record=true){
 if(player.active)closePlayer();
 closeHomeMenu(false);
 if(record){const buttons=$$('#tv button');navigation.visit(target,name||null,{focusIndex:buttons.indexOf(document.activeElement),gridIndex:document.activeElement?.dataset.gridIndex===undefined?-1:Number(document.activeElement.dataset.gridIndex),rowIndex:$$('.preferences-page:not([hidden]) .setting-row').indexOf(document.activeElement),scroll:$('#library').scrollTop});}
 $('#device-status').textContent='';
 closeDialog(false);page=target;category=name||null;document.body.classList.toggle('inner',target!=='home');
 $('#app-dock').hidden=!['home','categories','channels'].includes(target);document.body.classList.toggle('library-page',['categories','channels'].includes(target));
 $('#home').hidden=target!=='home';$('#library').hidden=!['categories','channels'].includes(target);$('#settings').hidden=target!=='settings';$('#inputs').hidden=target!=='inputs';$('#artwork-settings').hidden=target!=='artwork-settings';
 document.body.classList.add('grid-idle');
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
 const list=channels?(window.CHANNELS[name]||[]):categories;
 $('#channel-empty').hidden=!channels||list.length>0;
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
 [['Reduce Motion','motion',true],['Reduce Transparency','glass',true]].forEach(([label,key,invert],i)=>{
  const value=key==='large'?(prefs.large?'Large':'Default'):((invert?!prefs[key]:prefs[key])?'On':'Off');
  rows.append(row(label,value,()=>{prefs[key]=!prefs[key];applyPrefs();const value=key==='large'?(prefs.large?'Large':'Default'):((invert?!prefs[key]:prefs[key])?'On':'Off');$$('#settings-rows .row-value')[i].textContent=value;}));
 });
 rows.append(node('p','setting-group','CONTENT'),row('Artwork Rotation','',()=>navigate('artwork-settings'),true));
}
function updateHeader(){
 updateDockShortcut();
 $('#back-link').hidden=false;$('#back-arrow').hidden=page==='home';$('#top-title').hidden=page==='home';document.body.classList.toggle('channel-page',page==='channels');
 $('#top-title').textContent=page==='channels'?category:({settings:'Settings',inputs:'HDMI Inputs',categories:'IPTV','artwork-settings':'Artwork Rotation'}[page]||'');
 const parent=page==='channels'?'Categories':page==='artwork-settings'?'Settings':'Home';
 $('#back-link').classList.toggle('text-only',parent!=='Home');$('.back-label').textContent=parent;$('.home-symbol').hidden=parent!=='Home';$('#back-link').setAttribute('aria-label',page==='home'?'Home menu':'Back to '+parent);$('#back-link').setAttribute('aria-haspopup',page==='home'?'menu':'false');
}
function closeDialog(restore=true){
 closeCountryMenus();
 if($('#overlay').hidden)return;
 catalogueAbort?.abort();$('#api-key').value='';$('#omdb-key').value='';$('#overlay').hidden=true;
 $$('header,#home,#app-dock,#library,#settings,#inputs,#artwork-settings').forEach(e=>e.inert=false);
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
$$('[data-action]').forEach(b=>b.onclick=()=>{closeHomeMenu(false);if(b.dataset.action==='settings')navigate('settings');else if(b.dataset.action==='inputs')inputs();else deviceAction(()=>TV.live());});
$('.scrim').onclick=()=>closeDialog();
function closeHomeMenu(restore=true){const open=!$('#home-menu').hidden;$('#home-menu').hidden=true;$('#back-link').setAttribute('aria-expanded','false');if(open&&restore)$('#back-link').focus({preventScroll:true});return open;}
$('#back-link').onclick=()=>{if(page==='home'){if(!closeHomeMenu()){ $('#home-menu').hidden=false;$('#back-link').setAttribute('aria-expanded','true');glass.refresh();$('#home-menu button').focus({preventScroll:true});}}else if(page==='channels'||page==='artwork-settings')back();else navigate('home');};

document.addEventListener('pointerdown',e=>{if(!e.target.closest('#home-menu,#back-link'))closeHomeMenu(false);});
function back(){
 if(closeHomeMenu())return;
 if(!$('#player').hidden){closePlayer();return;}
 if(!$('#overlay').hidden){closeDialog();return;}
 const previous=navigation.back();
 if(previous){navigate(previous.page,previous.category,false,false);requestAnimationFrame(()=>{if(['home','categories','channels'].includes(page)){document.activeElement?.blur();document.body.classList.add('grid-idle');$('#library').scrollTop=previous.scroll||0;return;}let el=previous.gridIndex>=0?null:previous.rowIndex>=0?$$('.preferences-page:not([hidden]) .setting-row')[previous.rowIndex]:null;el?.focus({preventScroll:true});$('#library').scrollTop=previous.scroll||0;});}
 else if(page==='home')TV.platformBack();
}
function visibleButtons(){return $$('header button,header select,#app-dock button,.preferences-page:not([hidden]) button,#overlay button,#overlay select,#overlay input').filter(b=>!b.closest('[hidden]')&&!b.closest('[inert]')&&b.getBoundingClientRect().width>0);}
function spatial(key){
 const active=document.activeElement,inLibrary=['categories','channels'].includes(page);
 if(inLibrary&&active?.dataset.gridIndex!==undefined){
  const index=Number(active.dataset.gridIndex),column=index%5;
  if(key==='ArrowLeft'&&column>0)focusLibrary(index-1);
  else if(key==='ArrowRight'&&column<4&&index+1<libraryCount)focusLibrary(index+1);
  else if(key==='ArrowDown'&&index+5<libraryCount)focusLibrary(index+5);
  else if(key==='ArrowUp'){if(index>=5)focusLibrary(index-5);else $$('.dock button')[Math.min(column,4)]?.focus({preventScroll:true});}
  return;
 }
 const controls=visibleButtons();
 if(inLibrary&&active?.closest('#app-dock')){
  const buttons=$$('#app-dock button'),index=buttons.indexOf(active);
  if(key==='ArrowLeft'&&index>0)buttons[index-1].focus({preventScroll:true});
  else if(key==='ArrowRight'&&index<buttons.length-1)buttons[index+1].focus({preventScroll:true});
  else if(key==='ArrowDown'&&libraryCount)focusLibrary(Math.min(index,libraryCount-1));
  else if(key==='ArrowUp')$('#back-link').focus({preventScroll:true});
  return;
 }
 if(inLibrary&&(!controls.includes(active)||key==='ArrowDown')){$('#app-dock button')?.focus({preventScroll:true});return;}
 if(!controls.includes(active)){(page==='home'?$('.dock button'):controls[0])?.focus({preventScroll:true});return;}
 const a=active.getBoundingClientRect(),ax=a.x+a.width/2,ay=a.y+a.height/2;
 const horizontal=key==='ArrowLeft'||key==='ArrowRight',sign=key==='ArrowLeft'||key==='ArrowUp'?-1:1;
 let best=null,score=Infinity;
 for(const button of controls){if(button===active)continue;const r=button.getBoundingClientRect(),dx=r.x+r.width/2-ax,dy=r.y+r.height/2-ay;if((horizontal?dx:dy)*sign<=5)continue;const value=Math.abs(horizontal?dx:dy)+Math.abs(horizontal?dy:dx)*4;if(value<score){best=button;score=value;}}
 best?.focus({preventScroll:true});
}
function activateGrid(){if(document.body.classList.contains('grid-idle'))document.body.classList.remove('grid-idle');}
// Ignore a parked Magic Remote pointer when a page opens; require deliberate movement.
let pointerX=null,pointerY=null;
document.addEventListener('pointermove',e=>{if(pointerX!==null&&(Math.abs(e.clientX-pointerX)+Math.abs(e.clientY-pointerY)>3))activateGrid();pointerX=e.clientX;pointerY=e.clientY;},{passive:true});
document.body.classList.add('grid-idle');
document.addEventListener('keydown',e=>{
 if(!$('#home-menu').hidden){
 if(['Escape','Backspace'].includes(e.key)||e.keyCode===461){e.preventDefault();closeHomeMenu();return;}
 if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const items=$$('#home-menu button'),i=items.indexOf(document.activeElement);items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus({preventScroll:true});return;}
 }
 if(e.key.startsWith('Arrow'))activateGrid();
 if(!$('#player').hidden){
  if([461,413].includes(e.keyCode)||['Escape','Backspace'].includes(e.key)){e.preventDefault();if(!e.repeat)closePlayer();}
  else if(e.key.startsWith('Arrow')){e.preventDefault();showPlayerControls();$('#close-player').focus({preventScroll:true});}
  else if((e.key==='Enter'||e.keyCode===13)&&e.target.id==='close-player'){e.preventDefault();closePlayer();}
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

let catalogueConfig={key:'',country:'AU',omdbKey:''},catalogueAbort=null,loadGeneration=0;
let ratingsMessage='IMDb ratings use Cinemeta, with optional OMDb fallback.';
let artworkItems=[],artworkIndex=-1,rotationBusy=false,artworkMessage='Connect TMDB to load new release artwork.';
try{const saved=JSON.parse(localStorage.getItem('tvos.catalogue')||'null');if(saved&&typeof saved.key==='string'&&/^[A-Z]{2}$/.test(saved.country))catalogueConfig={...catalogueConfig,...saved};}catch{}
ratingsMessage='IMDb ratings use Cinemeta'+(catalogueConfig.omdbKey?' with OMDb fallback.':'.');
const countryCodes='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const regionNames=new Intl.DisplayNames(['en'],{type:'region'});
countryCodes.map(code=>({code,name:regionNames.of(code)})).sort((a,b)=>a.name.localeCompare(b.name)).forEach(({code,name})=>{const option=node('option','',name);option.value=code;$('#country').append(option);});
function renderArtwork(){
 const rows=$('#artwork-rows');rows.replaceChildren();
 rows.append(row('New releases catalogue',catalogueConfig.key?'Connected':'Not configured',openCatalogue),
 staticRow('Country',regionNames.of(catalogueConfig.country)),
 staticRow('Rotate every','10 seconds'),staticRow('Catalogue','New movies · TV shows'),staticRow('IMDb ratings',TV.available?'Cinemeta':'Cinemeta + IMDb cache'));
 $('#artwork-status').textContent=artworkMessage;$('#rating-status').textContent=ratingsMessage;
}
function openCatalogue(){
 beforeDialog=document.activeElement;$('#api-key').value='';$('#omdb-key').value='';$('#omdb-key').placeholder=catalogueConfig.omdbKey?'Saved key · enter a new key to replace':'Enter your OMDb API key';$('#api-key').placeholder=catalogueConfig.key?'Saved key · enter a new key to replace':'API key or API Read Access Token';
 $('#country').value=catalogueConfig.country;$('#country').dispatchEvent(new Event('change'));$('#form-status').textContent='Keys stay on this device. TMDB and OMDb each receive only their own key.';
 $('#save-catalogue').disabled=false;$('#save-catalogue').textContent='Save';
 $('#overlay').hidden=false;$$('header,#home,#app-dock,#library,#settings,#inputs,#artwork-settings').forEach(e=>e.inert=true);$('#api-key').focus();glass.refresh();
}
$('#cancel-catalogue').onclick=()=>closeDialog();
$('#catalogue-form').onsubmit=async event=>{
 event.preventDefault();const key=$('#api-key').value.trim()||catalogueConfig.key,country=$('#country').value,omdbKey=$('#omdb-key').value.trim()||catalogueConfig.omdbKey||'';
 try{credentialKind(key);if(omdbKey)omdbCredential(omdbKey);}catch(e){$('#form-status').textContent=e.message;return;}
 catalogueAbort?.abort();catalogueAbort=new AbortController();const signal=catalogueAbort.signal;
 $('#save-catalogue').disabled=true;$('#save-catalogue').textContent='Saving…';$('#form-status').textContent='Checking TMDB…';
 try{
  await tmdb('authentication',key,{signal});if(omdbKey)await omdbRating('tt0133093',omdbKey,{signal});if(signal.aborted)return;
  localStorage.setItem('tvos.catalogue',JSON.stringify({key,country,omdbKey}));catalogueConfig={key,country,omdbKey};ratingCache.clear();
  if(previewLogos){location.search='?preview=1';return;}
  closeDialog(false);artworkMessage='Loading new release artwork…';renderArtwork();$('#artwork-rows button').focus({preventScroll:true});
  loadArtwork();
 }catch(e){if(!signal.aborted){$('#form-status').textContent=e.name==='QuotaExceededError'||e.name==='SecurityError'?'Device storage is unavailable. Your key was not saved.':e.message;$('#save-catalogue').disabled=false;$('#save-catalogue').textContent='Save';}}
};
async function loadArtwork(){
 const generation=++loadGeneration;if(!catalogueConfig.key||previewLogos)return;
 try{
  const items=await fetchCatalogue(catalogueConfig.key,catalogueConfig.country);
  if(generation!==loadGeneration)return;
  artworkItems=items;artworkIndex=-1;
  const movies=items.filter(x=>x.type==='movie').length,shows=items.filter(x=>x.type==='tv').length;
  artworkMessage=items.length?`${movies} movies · ${shows} TV shows available in ${regionNames.of(catalogueConfig.country)}.`:'No matching new release artwork found for these services in your country. Try a different country.';
  artworkMessage+=' Apple TV: '+items.filter(x=>x.platforms?.includes('Apple TV')&&x.type==='movie').length+' movies · '+items.filter(x=>x.platforms?.includes('Apple TV')&&x.type==='tv').length+' shows.';
  if(items.failures?.length)artworkMessage+=' Temporarily unavailable: '+items.failures.join(', ')+'.';
  if(!TV.available&&new URLSearchParams(location.search).get('preview')==='ratings-audit'){navigate('artwork-settings');runRatingsAudit(items);}
  else if(page==='home')nextArtwork();
 }catch(e){if(generation===loadGeneration)artworkMessage=e.message;}
 if(page==='artwork-settings')renderArtwork();
}
async function nextArtwork(){
 if(rotationBusy)return;
 if(!artworkItems.length||page!=='home'||document.hidden){rotationClock.schedule();return;}
 rotationBusy=true;const generation=loadGeneration;
 try{
  for(let attempt=0;attempt<artworkItems.length;attempt++){
   const candidate=(artworkIndex+1+attempt)%artworkItems.length;const item=artworkItems[candidate],ratingPromise=resolveItemRating(item).then(result=>({result})).catch(error=>({error})),img=new Image();img.referrerPolicy='no-referrer';img.decoding='async';img.alt=item.title;
   try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Image timeout')),10000);img.onload=()=>{clearTimeout(timer);resolve();};img.onerror=()=>{clearTimeout(timer);reject(new Error('Image unavailable'));};img.src=item.image;});}catch{continue;}
   if(generation!==loadGeneration||page!=='home')return;
   if(img.decode)try{await img.decode();}catch{}
   const details=await fetchArtworkDetails(item,catalogueConfig.key,catalogueConfig.country).catch(()=>item);if(generation!==loadGeneration||page!=='home')return;
   const caption=$('.hero-caption');
   const reduced=!prefs.motion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const first=!document.body.classList.contains('artwork-ready');
   if(!reduced&&!first)caption.classList.add('caption-changing');
   const commit=()=>{
    if(generation!==loadGeneration)return;
    artworkIndex=candidate;
    $('.hero-caption h1').textContent=item.title;
    $('.hero-caption p').textContent=conciseOverview(item.overview);
    renderPlatformLogos(details.platforms||[]);
    $('.hero-facts').textContent=[item.type==='tv'?'TV Show':'Movie',...(item.genres||[]).slice(0,2),item.year].filter(Boolean).join(' · ');
    const host=$('.hero-rating');host.replaceChildren(node('span','','—'),image('assets/logos/imdb.png','IMDb'));host.hidden=false;host.setAttribute('aria-label','IMDb rating not available yet');host.title='No IMDb score returned by the configured metadata services yet';
    $('.hero-metadata').hidden=false;caption.classList.remove('caption-changing');document.body.classList.add('artwork-ready');updateIMDbRating(item,generation,ratingPromise);
   };
   await fadeArtwork($('#artwork'),img,{reduced,onStart:()=>{if(first)commit();},onMidpoint:()=>{if(!first)commit();}});
   caption.classList.remove('caption-changing');glass.refresh();return;
  }
  artworkMessage='Artwork images could not load. Check your connection and try again.';
 }finally{rotationBusy=false;rotationClock.schedule();}
}
export function conciseOverview(text){const clean=String(text||'').trim();const sentences=clean.match(/[^.!?]+[.!?]+(?:[”'"])?(?=\s|$)/g);return sentences?.length?sentences[0].trim():clean;}
const rotationClock=createRotationClock(nextArtwork);
setInterval(()=>{if(!document.hidden&&catalogueConfig.key)loadArtwork();},3600000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&page==='home'&&artworkIndex<0)nextArtwork();});
updateHeader();if(catalogueConfig.key)loadArtwork();

setupCountryMenu($('#country'));

const providerLogos={'Apple TV':['apple-tv-transparent','Apple TV'],'Netflix':['netflix','Netflix'],'Prime Video':['prime-video-circle','Prime Video']};
function renderPlatformLogos(platforms){
 const host=$('.hero-platforms');host.replaceChildren();
 for(const name of [...new Set(platforms)]){const entry=providerLogos[name];if(!entry)continue;const bubble=node('span','provider-bubble provider-'+entry[0]+' tvos-glass-element');bubble.setAttribute('aria-label',entry[1]);bubble.title=entry[1];bubble.append(image('assets/logos/providers/'+entry[0]+'.png',entry[1]));host.append(bubble);}
 host.hidden=!host.children.length;
}
const ratingCache=createRatingCache();
function ratingStatus(message){ratingsMessage=message;$('#rating-status').textContent=message;}
async function resolveItemIdentity(item){
 if(item.identityChecked)return item.imdbId;
 let id=await fetchIMDbId(item,catalogueConfig.key);
 if(!id)id=verifiedIMDbIdentity(item);
 if(!id)id=await cinemetaIdentity(item);
 item.imdbId=id;item.identityChecked=true;return id;
}
async function resolveItemRating(item){
 const id=await resolveItemIdentity(item);
 return ratingCache.get(id||item.type+':'+item.title+':'+item.year,catalogueConfig.omdbKey||'cinemeta',async()=>{
  // The Mac's official cache is both quicker and more complete for recent titles.
  if(id&&!TV.available&&location.protocol==='http:'&&['127.0.0.1','localhost'].includes(location.hostname)){
   try{const official=await officialPreviewRating(id);if(official)return official;}catch{}
  }
  return lookupIMDbRating({...item,imdbId:id},catalogueConfig.omdbKey);
 });
}
async function updateIMDbRating(item,generation,prepared){
 if(!catalogueConfig.key)return;
 const current=()=>generation===loadGeneration&&artworkItems[artworkIndex]===item;
 ratingStatus('Loading IMDb rating for '+item.title+'…');
 try{
  const outcome=prepared?await prepared:{result:await resolveItemRating(item)};
  if(outcome.error)throw outcome.error;
  const result=outcome.result,value=result?.value;
  if(!current())return;
  if(!value){ratingStatus('No score was returned for '+item.title+' by the configured ratings sources.');return;}
  const host=$('.hero-rating');host.replaceChildren(node('span','',value),image('assets/logos/imdb.png','IMDb'));host.hidden=false;host.setAttribute('aria-label','IMDb rating '+value);host.title='IMDb rating '+value+' · '+result.source+(result.updated?' · Snapshot refreshed '+new Date(result.updated).toLocaleString():'');
  ratingStatus('IMDb rating from '+result.source+' loaded for '+item.title+'.'+(result.updated?' Snapshot refreshed '+new Date(result.updated).toLocaleString()+'. Daily scores can differ from the live IMDb page.':''));
 }catch(error){if(current())ratingStatus(error.message);}
}
// Explicit Mac layout preview. No fabricated ratings or provider-availability claims.
if(new URLSearchParams(location.search).has('preview')&&!TV.available&&(!catalogueConfig.key||previewLogos)){
 document.body.classList.add('artwork-ready');$('.hero-caption h1').textContent='Artwork preview';$('.hero-caption p').textContent='Preview the provider logos, title layout and app tiles. Add your TMDB and OMDb keys in Settings to load live artwork and IMDb ratings. The dash means a rating is not connected.';
 $('.hero-rating').replaceChildren(node('span','','—'),image('assets/logos/imdb.png','IMDb'));$('.hero-rating').hidden=false;renderPlatformLogos(['Apple TV','Netflix','Prime Video']);$('.hero-facts').textContent='Movie · Drama · 2026';$('.hero-metadata').hidden=false;
}





async function runRatingsAudit(items){
 const report=await auditCatalogue(items,{resolveId:resolveItemIdentity,official:id=>officialPreviewRating(id),resolveRating:resolveItemRating,onProgress:(done,total)=>ratingStatus('Checking IMDb ratings: '+done+' / '+total)});
 try{await fetch('/api/ratings-audit',{method:'POST',headers:{'Content-Type':'application/json','X-TVOS-Preview':'audit'},body:JSON.stringify(report),credentials:'omit'});}catch{}
 ratingStatus('Audit complete: '+report.checked+' titles; '+report.rated+' have official scores; '+report.verified+' verified; '+report.mismatches+' mismatches; '+report.unmapped+' missing IMDb IDs; '+report.errors+' errors.');
 $('#audit-report')?.remove();const unresolved=node('div','audit-report');for(const item of report.rows.filter(item=>['unmapped','no_official_score'].includes(item.status)))unresolved.append(node('p','',item.title+' | '+item.type+' | '+(item.imdbId||'no IMDb ID')+' | '+item.status));unresolved.id='audit-report';$('#artwork-settings .settings-panel').append(unresolved);
 const fading=report.rows.filter(item=>/fading grandeur/i.test(item.title));
 if(fading.length)$('#artwork-status').textContent=fading.map(item=>item.title+' ('+item.type+'): '+item.imdbId+' · IMDb '+(item.official||'no score')+' · '+item.status).join(' | ');
 $('#artwork-rows').append(row('Download ratings audit','',()=>{
  const blob=new Blob([JSON.stringify({checkedAt:new Date().toISOString(),...report},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='tvos-ratings-audit.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }));
}
