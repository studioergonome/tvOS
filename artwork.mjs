// All credentials are sent only to TMDB; callers receive sanitised errors.
export function credentialKind(key) {
  if (/^[a-f0-9]{32}$/i.test(key)) return 'key';
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return 'token';
  throw new Error('Enter a valid TMDB API key or API Read Access Token.');
}
export async function tmdb(path, key, {signal, fetcher = fetch, timeoutMs=12000} = {}) {
  const kind=credentialKind(key), url=new URL('https://api.themoviedb.org/3/'+path);
  if(kind==='key')url.searchParams.set('api_key',key);
  const controller=new AbortController();
  const stop=()=>controller.abort();signal?.addEventListener('abort',stop,{once:true});
  if(signal?.aborted)controller.abort();
  const timeout=setTimeout(stop,timeoutMs);
  try {
    const res=await fetcher(url.toString(),{headers:kind==='token'?{Authorization:'Bearer '+key}:{},signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!res.ok)throw new Error(res.status===401?'TMDB did not accept that key.':res.status===429?'TMDB is busy. Please try again shortly.':'TMDB could not load the catalogue. Please try again.');
    return await res.json();
  } catch(e) {
    if(e.name==='AbortError')throw new Error(signal?.aborted?'Cancelled.':'TMDB took too long to respond. Please try again.');
    if(e instanceof TypeError)throw new Error('Cannot reach TMDB. Check your internet connection.');
    throw e;
  } finally {clearTimeout(timeout);signal?.removeEventListener('abort',stop);}
}
export function backdropURL(path) {
  return typeof path==='string'&&/^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(path)?'https://image.tmdb.org/t/p/original'+path:null;
}
// New means released in the last 90 days, available by subscription in the chosen region.
// Fetch every available discover page (TMDB itself exposes at most 500 pages).
const supported=p=>/^(Netflix|Apple TV\+?|Amazon Prime Video)(?: with Ads| Standard with Ads)?$/i.test(p.provider_name||'');
export function interleaveCatalogues(buckets){
 const all=new Map();
 for(const bucket of buckets)for(const item of bucket){const id=item.type+':'+item.id,known=all.get(id);if(known)known.platforms=[...new Set([...(known.platforms||[]),...(item.platforms||[])])];else all.set(id,{...item,platforms:[...(item.platforms||[])]});}
 const result=[],seen=new Set();
 for(let index=0;index<Math.max(0,...buckets.map(b=>b.length));index++)for(const bucket of buckets){const item=bucket[index];if(!item)continue;const id=item.type+':'+item.id;if(!seen.has(id)){seen.add(id);result.push(all.get(id));}}
 return result;
}
const providerGroup=provider=>/^Apple TV\+?$/.test(provider.provider_name||'')?'Apple TV':/^Netflix(?: Standard with Ads| with Ads)?$/i.test(provider.provider_name||'')?'Netflix':/^Amazon Prime Video(?: with Ads)?$/i.test(provider.provider_name||'')?'Prime Video':null;
export async function fetchCatalogue(key,country,options={}) {
 if(!/^[A-Z]{2}$/.test(country))throw new Error('Choose a country.');
 const request=path=>tmdb(path,key,options),now=options.now?new Date(options.now):new Date();
 const until=now.toISOString().slice(0,10);now.setUTCDate(now.getUTCDate()-90);const since=now.toISOString().slice(0,10);
 await request('authentication');
 const definitions=await Promise.all(['movie','tv'].map(async type=>{
  const [providers,genres]=await Promise.all([request('watch/providers/'+type+'?watch_region='+country),request('genre/'+type+'/list?language=en-US')]);
  return {type,providers:providers.results||[],genres:new Map((genres.genres||[]).map(g=>[g.id,g.name]))};
 }));
 // A separate queue for every service and media type prevents smaller catalogues
 // such as Apple TV from being buried behind hundreds of Netflix/Prime entries.
 const jobs=[];
 for(const service of ['Apple TV','Netflix','Prime Video'])for(const definition of definitions){
  const {type,genres,providers}=definition,ids=providers.filter(p=>providerGroup(p)===service).map(p=>p.provider_id);
  if(!ids.length)continue;
  jobs.push({service,type,load:async()=>{
   const dateKey=type==='movie'?'primary_release_date':'first_air_date';
   const query=new URLSearchParams({watch_region:country,with_watch_providers:ids.join('|'),with_watch_monetization_types:'flatrate',include_adult:'false',language:'en-US',sort_by:'popularity.desc',[dateKey+'.gte']:since,[dateKey+'.lte']:until});
   const result=[],seen=new Set();let pages=1;
   for(let page=1;page<=pages;page++){
    const data=await request('discover/'+type+'?'+query+'&page='+page);pages=Math.min(500,data.total_pages||1);
    for(const item of data.results||[]){
     const date=item.release_date||item.first_air_date||'';
     if(!Number.isInteger(item.id)||seen.has(item.id)||item.adult===true||!backdropURL(item.backdrop_path)||!item.overview||date<since||date>until)continue;
     seen.add(item.id);result.push({id:item.id,type,title:String(item.title||item.name||''),overview:String(item.overview),originalTitle:String(item.original_title||item.original_name||''),image:backdropURL(item.backdrop_path),genres:(item.genre_ids||[]).map(id=>genres.get(id)).filter(Boolean),year:date.slice(0,4),releaseDate:date,platforms:[service]});
    }
   }
   return result.sort((a,b)=>b.releaseDate.localeCompare(a.releaseDate));
  }});
 }
 const loaded=await Promise.all(jobs.map(async job=>{try{return {items:await job.load(),job};}catch(error){return {items:[],job,error};}}));
 if(loaded.length&&loaded.every(x=>x.error))throw loaded[0].error;
 const result=interleaveCatalogues(loaded.map(x=>x.items));
 result.failures=loaded.filter(x=>x.error).map(x=>x.job.service+' '+(x.job.type==='tv'?'shows':'movies'));
 return result;
}
export async function fetchArtworkDetails(item,key,country,options={}){
 if(item.platforms)return item;
 const data=await tmdb(item.type+'/'+item.id+'/watch/providers',key,options);
 item.platforms=[...new Set((data.results?.[country]?.flatrate||[]).filter(supported).map(p=>/netflix/i.test(p.provider_name)?'Netflix':/amazon/i.test(p.provider_name)?'Prime Video':'Apple TV'))];
 return item;
}

export async function fetchIMDbId(item,key,options={}){
 if(item.imdbId!==undefined)return item.imdbId;
 const data=await tmdb(item.type+'/'+item.id+'/external_ids',key,options);
 item.imdbId=/^tt\d{7,10}$/.test(data.imdb_id||'')?data.imdb_id:null;return item.imdbId;
}
