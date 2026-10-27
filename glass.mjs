// Artwork sampling for TVs without native backdrop-filter. No pixel readback or export.
export function coverImageRect(imageWidth,imageHeight,boxWidth,boxHeight){
 const scale=Math.max(boxWidth/imageWidth,boxHeight/imageHeight);
 return {x:(boxWidth-imageWidth*scale)/2,y:(boxHeight-imageHeight*scale)/2,width:imageWidth*scale,height:imageHeight*scale};
}
export function setupGlass({stage,artwork,library,force=false}){
 const native=typeof CSS!=='undefined'&&(CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)'));
 if(native&&!force)return {refresh(){},refreshBand(){}};
 document.body.classList.add('legacy-glass');
 const panels=[...stage.querySelectorAll('.dock,.circle,.profile,.back-link,.channel-country-wrap,.dialog,.home-menu')].map(host=>{
  const canvas=document.createElement('canvas');canvas.className='glass-sample';canvas.setAttribute('aria-hidden','true');host.classList.add('glass-sampled');host.insertBefore(canvas,host.firstChild);return {host,canvas};
 });
 const band=document.createElement('canvas');band.className='legacy-header-frost';band.setAttribute('aria-hidden','true');stage.append(band);
 let queued=false,visibleCards=[],panelsDirty=true,bandTimer=null,lastBand=0;
 function draw(canvas,rect,origin,channels){
  const downsample=channels?24:6;
  const width=Math.max(1,Math.ceil(rect.width/downsample)),height=Math.max(1,Math.ceil(rect.height/downsample));
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.scale(canvas.width/rect.width,canvas.height/rect.height);ctx.translate(origin.left-rect.left,origin.top-rect.top);
  const background=ctx.createLinearGradient(0,0,origin.width,origin.height);background.addColorStop(0,'#1d2b43');background.addColorStop(1,'#14252e');ctx.fillStyle=background;ctx.fillRect(0,0,origin.width,origin.height);
  const teal=ctx.createRadialGradient(origin.width*.83,origin.height*.76,0,origin.width*.83,origin.height*.76,origin.width*.65);teal.addColorStop(0,'rgba(22,61,64,.8)');teal.addColorStop(1,'rgba(22,61,64,0)');ctx.fillStyle=teal;ctx.fillRect(0,0,origin.width,origin.height);
  if(!document.body.classList.contains('inner')){
   const images=artwork.querySelectorAll('img');const img=images[images.length-1];
   if(img?.complete&&img.naturalWidth){const r=coverImageRect(img.naturalWidth,img.naturalHeight,origin.width,origin.height);try{ctx.drawImage(img,r.x,r.y,r.width,r.height);}catch{}}
   const shade=ctx.createLinearGradient(0,0,0,origin.height);shade.addColorStop(0,'rgba(0,0,0,.1)');shade.addColorStop(.55,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(5,10,14,.28)');ctx.fillStyle=shade;ctx.fillRect(0,0,origin.width,origin.height);
  }else if(channels){
   // Draw only the cards crossing the header, never the whole channel catalogue.
   const clip=library.getBoundingClientRect();ctx.save();ctx.beginPath();ctx.rect(clip.left-origin.left,clip.top-origin.top,clip.width,clip.height);ctx.clip();
   for(const tile of visibleCards){
    const r=tile.getBoundingClientRect();if(r.bottom<rect.top||r.top>rect.bottom)continue;
    const x=r.left-origin.left,y=r.top-origin.top;const grey=ctx.createLinearGradient(x,y,x+r.width,y+r.height);grey.addColorStop(0,'#929499');grey.addColorStop(1,'#55575c');ctx.fillStyle=grey;ctx.fillRect(x,y,r.width,r.height);
    const img=tile.querySelector('img');if(img?.complete&&img.naturalWidth){const b=img.getBoundingClientRect();const scale=Math.min(b.width/img.naturalWidth,b.height/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;try{ctx.drawImage(img,b.left-origin.left+(b.width-w)/2,b.top-origin.top+(b.height-h)/2,w,h);}catch{}}
   }
   ctx.restore();
  }
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=channels?'rgba(23,38,51,.34)':'rgba(255,255,255,.07)';ctx.fillRect(0,0,canvas.width,canvas.height);
 }
 function render(){
  queued=false;if(document.hidden||document.body.classList.contains('solid')||stage.querySelector('#player')?.hidden===false)return;
  const origin=stage.getBoundingClientRect();if(!origin.width)return;
  const channels=document.body.classList.contains('channel-page');
  visibleCards=[];
  if(channels){
   const cards=library.querySelectorAll('.channel-tile');
   if(cards.length){
    const first=cards[0].getBoundingClientRect(),stride=cards.length>5?cards[5].getBoundingClientRect().top-first.top:first.height;
    const start=Math.max(0,(Math.floor((origin.top-first.top)/Math.max(stride,1))-1)*5);
    // At most four rows intersect the shallow header. Avoid walking offscreen logos.
    visibleCards=Array.prototype.slice.call(cards,start,start+20);
   }
  }
  if(panelsDirty)for(const {host,canvas} of panels){if(host.closest('[hidden]'))continue;const rect=host.getBoundingClientRect();if(rect.width&&rect.height)draw(canvas,rect,origin,false);}
  panelsDirty=false;
  if(channels)draw(band,{left:origin.left,top:origin.top,width:origin.width,height:origin.width*.1345,bottom:origin.top+origin.width*.1345},origin,true);
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(render);}}
 function refresh(){panelsDirty=true;schedule();}
 function refreshBand(){if(bandTimer||!document.body.classList.contains('channel-page'))return;bandTimer=setTimeout(()=>{bandTimer=null;lastBand=performance.now();schedule();},Math.max(0,80-(performance.now()-lastBand)));}
 library.addEventListener('scroll',refreshBand,{passive:true});
 stage.addEventListener('load',event=>{if(event.target.closest?.('#artwork'))refresh();else refreshBand();},true);
 window.addEventListener('resize',refresh);document.addEventListener('visibilitychange',refresh);
 const signature=()=>document.body.className.split(/\s+/).filter(c=>c!=='grid-idle').sort().join(' ');let previous=signature();
 new MutationObserver(()=>{const next=signature();if(next!==previous){previous=next;refresh();}}).observe(document.body,{attributes:true,attributeFilter:['class']});
 new MutationObserver(refresh).observe(artwork,{childList:true});
 refresh();return {refresh,refreshBand};
}
