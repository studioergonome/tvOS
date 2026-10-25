import regions from './region-names.json';
// Small, local compatibility layer for Chromium 68 (LG webOS 5.x).
if(!Intl.DisplayNames)Intl.DisplayNames=class{of(code){return regions[code]||code;}};
if(!Element.prototype.replaceChildren)Element.prototype.replaceChildren=function(...children){while(this.firstChild)this.removeChild(this.firstChild);this.append(...children);};
if(!Array.prototype.flat)Object.defineProperty(Array.prototype,'flat',{value:function(depth=1){return this.reduce((out,value)=>out.concat(Array.isArray(value)&&depth>0?value.flat(depth-1):[value]),[]);},configurable:true,writable:true});
if(!Array.prototype.flatMap)Object.defineProperty(Array.prototype,'flatMap',{value:function(fn,thisArg){return this.map(fn,thisArg).flat();},configurable:true,writable:true});
if(!('inert' in HTMLElement.prototype))Object.defineProperty(HTMLElement.prototype,'inert',{get(){return this.hasAttribute('inert');},set(value){if(value)this.setAttribute('inert','');else this.removeAttribute('inert');},configurable:true});
