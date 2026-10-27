// Prefer exact IMDb identity. Fallback requires matching title, year and media type.
export function omdbCredential(key){
 if(!/^[a-z0-9]{8,32}$/i.test(key))throw new Error('Enter a valid OMDb API key.');
 return key;
}
export async function requestRating(params,key,accept,{fetcher=fetch,signal}={}){
 omdbCredential(key);
 const url=new URL('https://www.omdbapi.com/');url.searchParams.set('apikey',key);for(const [name,value] of Object.entries(params))url.searchParams.set(name,value);
 const controller=new AbortController(),stop=()=>controller.abort(),timer=setTimeout(stop,8000);
 signal?.addEventListener('abort',stop,{once:true});if(signal?.aborted)stop();
 try{
  const response=await fetcher(url.href,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw new Error('OMDb could not load ratings. Check your key or try again later.');
  const data=await response.json();
  if(data.Response==='False'){
   if(/key|limit|request/i.test(data.Error||''))throw new Error('OMDb did not accept the key or its daily request limit was reached.');
   return null;
  }
  if(!accept(data)||!/^\d(?:\.\d)?$|^10(?:\.0)?$/.test(String(data.imdbRating)))return null;
  const rating=Number(data.imdbRating);return rating>=0&&rating<=10?rating.toFixed(1):null;
 }catch(error){
  if(error.name==='AbortError')throw new Error('OMDb took too long to respond.');
  if(error instanceof TypeError)throw new Error('Cannot reach OMDb. Check your internet connection.');
  throw error;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',stop);}
}
export async function omdbRating(imdbId,key,options={}){
 omdbCredential(key);if(!/^tt\d{7,10}$/.test(imdbId))return null;
 return requestRating({i:imdbId},key,data=>data.imdbID===imdbId,options);
}
const normalTitle=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s:.,!?"’“”()–—-]/g,'');
export async function omdbRatingByTitle(item,key,options={}){
 if(!item.title||!/^\d{4}$/.test(item.year||''))return null;
 const type=item.type==='tv'?'series':'movie';
 return requestRating({t:item.title,y:item.year,type},key,data=>/^tt\d{7,10}$/.test(data.imdbID||'')&&normalTitle(data.Title)===normalTitle(item.title)&&String(data.Year).slice(0,4)===item.year&&data.Type===type,options);
}
export function createRatingCache({ttl=86400000,missingTTL=3600000,max=300,now=Date.now}={}){
 const values=new Map();
 return {async get(id,key,load){const cacheKey=key+':'+id,entry=values.get(cacheKey);if(entry&&now()-entry.time<(entry.value===null?Math.min(ttl,missingTTL):ttl))return entry.value;const value=await load();values.set(cacheKey,{time:now(),value});if(values.size>max)values.delete(values.keys().next().value);return value;},clear(){values.clear();}};
}

// Stremio's documented metadata endpoint. Only a public IMDb ID is sent.
export async function cinemetaRating(imdbId,type,{fetcher=fetch,signal}={}){
 if(!/^tt\d{7,10}$/.test(imdbId))return null;
 const kind=type==='tv'?'series':'movie',controller=new AbortController();
 const stop=()=>controller.abort(),timer=setTimeout(stop,6000);
 signal?.addEventListener('abort',stop,{once:true});if(signal?.aborted)stop();
 try{
  const response=await fetcher('https://v3-cinemeta.strem.io/meta/'+kind+'/'+imdbId+'.json',{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(response.status===404)return null;if(!response.ok)throw new Error('Cinemeta ratings are temporarily unavailable.');
  const {meta}=await response.json(),raw=String(meta?.imdbRating??'').trim();
  if(meta?.id!==imdbId||!/^\d(?:\.\d)?$|^10(?:\.0)?$/.test(raw))return null;
  const value=Number(raw);return value>=0&&value<=10?value.toFixed(1):null;
 }catch(error){
  if(error.name==='AbortError')throw new Error('Cinemeta took too long to respond.');
  if(error instanceof TypeError)throw new Error('Cannot reach Cinemeta. Check your internet connection.');
  throw error;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',stop);}
}
export async function lookupIMDbRating(item,omdbKey='',options={}){
 let failure=null;
 if(item.imdbId){try{const value=await cinemetaRating(item.imdbId,item.type,options);if(value)return {value,source:'Cinemeta'};}catch(error){failure=error;}}
 if(omdbKey){const value=item.imdbId?await omdbRating(item.imdbId,omdbKey,options):await omdbRatingByTitle(item,omdbKey,options);if(value)return {value,source:'OMDb'};}
 if(failure)throw failure;return null;
}

// Mac preview only: same-origin endpoint backed by the official daily dataset.
export async function officialPreviewRating(imdbId,{fetcher=fetch}={}){
 if(!/^tt\d{7,10}$/.test(imdbId))return null;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetcher('/api/imdb-rating?i='+imdbId,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw new Error('The local official IMDb ratings cache is unavailable.');
  const data=await response.json(),value=String(data.rating??'');
  if(data.id!==imdbId||!/^\d(?:\.\d)?$|^10(?:\.0)?$/.test(value))return null;
  return {value:Number(value).toFixed(1),source:'IMDb daily dataset',updated:data.updated};
 }finally{clearTimeout(timer);}
}

// Verified identity only: never override a score or an existing external IMDb ID.
// IMDb's Hindi page names tt37626694 "Madam Inspector", original "Birangana".
// The localized TMDB listing has a later release year than the original series.
export function verifiedIMDbIdentity(item){
 return item.type==='tv'&&item.id===339010 ? 'tt37626694' : null;
}

// Resolve missing links using original/localized titles, retaining year/type checks.
export async function cinemetaIdentity(item,{fetcher=fetch}={}){
 if(!item.title||!/^\d{4}$/.test(item.year||''))return null;
 const type=item.type==='tv'?'series':'movie',controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 try{
  const response=await fetcher('https://v3-cinemeta.strem.io/catalog/'+type+'/top/search='+encodeURIComponent(item.title)+'.json',{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)return null;
  const data=await response.json(),titles=[item.title,item.originalTitle,...(item.alternativeTitles||[])].filter(Boolean).map(normalTitle);
  const ids=[...new Set((data.metas||[]).filter(meta=>/^tt\d{7,10}$/.test(meta.id||'')&&(!meta.type||meta.type===type)&&String(meta.releaseInfo||meta.year||'').slice(0,4)===item.year&&titles.includes(normalTitle(meta.name))).map(meta=>meta.id))];
  return ids.length===1?ids[0]:null;
 }catch{return null;}finally{clearTimeout(timer);}
}
