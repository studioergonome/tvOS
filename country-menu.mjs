// Shared glass country chooser; avoids the TV engine's unstyled native select popup.
const controllers=[];
export function closeCountryMenus(){controllers.forEach(c=>c.close(false));}
export function setupCountryMenu(select){
 const host=select.parentElement,trigger=document.createElement('button'),menu=document.createElement('div');
 trigger.type='button';trigger.className='country-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label','Country');
 menu.className='country-menu';menu.id=select.id+'-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Country');menu.hidden=true;trigger.setAttribute('aria-controls',menu.id);
 select.hidden=true;host.insertBefore(trigger,select.nextSibling);host.append(menu);
 let open=false,index=0,rows=[];
 const options=()=>Array.from(select.options);
 function sync(){trigger.textContent=select.selectedOptions[0]?.textContent||'Country';}
 function highlight(next){const old=rows[index];if(old){old.classList.remove('chosen');old.setAttribute('aria-selected','false');}index=Math.max(0,Math.min(rows.length-1,next));const row=rows[index];if(row){row.classList.add('chosen');row.setAttribute('aria-selected','true');}if(row){trigger.setAttribute('aria-activedescendant',row.id);const top=row.offsetTop,bottom=top+row.offsetHeight;if(top<menu.scrollTop)menu.scrollTop=top;else if(bottom>menu.scrollTop+menu.clientHeight)menu.scrollTop=bottom-menu.clientHeight;}}
 function close(restore=true){open=false;menu.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');menu.replaceChildren();rows=[];if(restore&&trigger.isConnected)trigger.focus({preventScroll:true});}
 function choose(next){const option=options()[next];if(!option)return;select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close();}
 function show(){closeCountryMenus();sync();const fragment=document.createDocumentFragment();rows=options().map((option,i)=>{const row=document.createElement('div');row.className='country-option';row.id=select.id+'-option-'+i;row.setAttribute('role','option');row.textContent=option.textContent;row.onclick=()=>choose(i);fragment.append(row);return row;});menu.append(fragment);menu.hidden=false;open=true;trigger.setAttribute('aria-expanded','true');trigger.focus({preventScroll:true});highlight(select.selectedIndex);}
 trigger.onclick=()=>open?close():show();
 const key=event=>{
  if(document.activeElement!==trigger||host.closest('[hidden]'))return;
  if(event.repeat&&event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();return;}
  if(open){
   if(event.key==='ArrowDown')highlight(index+1);else if(event.key==='ArrowUp')highlight(index-1);
   else if(event.key==='Enter'||event.key===' '){choose(index);}
   else if(event.key==='Escape'||event.key==='Backspace'||event.keyCode===461)close();
   else if(event.key==='Tab'){close();return;}
   else if(event.key.length===1&&/[a-z]/i.test(event.key)){const found=options().findIndex((o,i)=>i>index&&o.textContent.toLowerCase().startsWith(event.key.toLowerCase()));if(found>=0)highlight(found);}
   else return;
  }else if(['ArrowDown','ArrowUp','Enter',' '].includes(event.key)){show();}else return;
  event.preventDefault();event.stopImmediatePropagation();
 };
 document.addEventListener('keydown',key,true);
 document.addEventListener('pointerdown',event=>{if(open&&!host.contains(event.target))close(false);},true);
 select.addEventListener('change',sync);new MutationObserver(sync).observe(select,{childList:true,subtree:true});
 controllers.push({close});sync();return {sync,close};
}
