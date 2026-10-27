export function gridWindow(count,scrollTop,stride,viewport,padding=0,columns=5,buffer=3){
 const rows=Math.ceil(count/columns),row=Math.max(0,Math.floor((scrollTop-padding)/stride));
 const start=Math.max(0,row-buffer),end=Math.min(rows,row+Math.ceil(viewport/stride)+buffer+1);
 return {start:start*columns,end:Math.min(count,end*columns),rows};
}
// Keep channel DOM bounded while retaining the full native scroll range.
export function createChannelGrid({grid,scroller,items,create,remove=()=>{},stage,onChange=()=>{}}){
 let first=0,last=0,stride=1,gap=0,tileHeight=1,padding=0,gridPadding=0,viewport=0,stageWidth=0,frame=0,disposed=false;
 const nodes=new Map(),top=document.createElement('div'),bottom=document.createElement('div');
 top.className=bottom.className='grid-spacer';top.setAttribute('aria-hidden','true');bottom.setAttribute('aria-hidden','true');grid.append(top,bottom);
 function paint(start,end){
  const active=document.activeElement;
  for(const [index,el] of nodes)if(index<start||index>=end){remove(el);el.remove();nodes.delete(index);}
  let cursor=top.nextSibling;
  for(let i=start;i<end;i++){
   let el=nodes.get(i);if(!el){el=create(items[i],i);nodes.set(i,el);}
   if(el!==cursor)grid.insertBefore(el,cursor||bottom);
   cursor=el.nextSibling;
  }
  first=start;last=end;
  const before=Math.floor(start/5),after=Math.ceil(items.length/5)-Math.ceil(end/5);
  top.hidden=!before;bottom.hidden=!after;
  top.style.height=Math.max(0,before*stride-gap)+'px';bottom.style.height=Math.max(0,after*stride-gap)+'px';
  if(active?.isConnected&&document.activeElement!==active)active.focus({preventScroll:true});
  onChange();
 }
 function measure(){
  const tile=grid.querySelector('.tile'),style=getComputedStyle(grid);
  gap=parseFloat(style.rowGap||style.gridRowGap)||stage.clientWidth*.035;
  stageWidth=stage.clientWidth;viewport=scroller.clientHeight;gridPadding=parseFloat(style.paddingTop)||0;
  tileHeight=tile?parseFloat(getComputedStyle(tile).height):stageWidth*.08952381;stride=tileHeight+gap;
  padding=parseFloat(getComputedStyle(scroller).paddingTop)||0;
 }
 function update(){frame=0;if(disposed)return;const w=gridWindow(items.length,scroller.scrollTop,stride,scroller.clientHeight,padding);if(w.start!==first||w.end!==last)paint(w.start,w.end);}
 function scroll(){if(!frame)frame=requestAnimationFrame(update);}
 function resize(){measure();paint(first,last);update();}
 paint(0,Math.min(items.length,35));measure();paint(first,last);update();
 scroller.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',resize);
 return {
  get count(){return items.length;},
  focus(index){
   index=Math.max(0,Math.min(items.length-1,index));if(!items.length)return;
   if(index<first||index>=last){const row=Math.floor(index/5);paint(Math.max(0,row-3)*5,Math.min(items.length,(row+7)*5));}
   const button=nodes.get(index)?.querySelector('button');if(!button)return;
   const rowTop=padding+gridPadding+Math.floor(index/5)*stride,scroll=scroller.scrollTop;
   if(rowTop<scroll+padding+6)scroller.scrollTop=Math.max(0,rowTop-padding-6);
   else if(rowTop+tileHeight>scroll+viewport-stageWidth*.02)scroller.scrollTop=rowTop+tileHeight-viewport+stageWidth*.02;
   // No geometry reads after focus: transforms remain on the compositor path.
   button.focus({preventScroll:true});
  },
  dispose(){disposed=true;cancelAnimationFrame(frame);scroller.removeEventListener('scroll',scroll);window.removeEventListener('resize',resize);for(const node of nodes.values())remove(node);nodes.clear();}
 };
}
