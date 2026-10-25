// All credentials are sent only to TMDB; callers receive sanitised errors.
export function credentialKind(key) {
  if (/^[a-f0-9]{32}$/i.test(key)) return 'key';
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return 'token';
  throw new Error('Enter a valid TMDB API key or API Read Access Token.');
}
export async function tmdb(path, key, {signal, fetcher = fetch} = {}) {
  const kind=credentialKind(key), url=new URL('https://api.themoviedb.org/3/'+path);
  if(kind==='key')url.searchParams.set('api_key',key);
  const controller=new AbortController();
  const stop=()=>controller.abort();signal?.addEventListener('abort',stop,{once:true});
  if(signal?.aborted)controller.abort();
  const timeout=setTimeout(stop,12000);
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
  return typeof path==='string'&&/^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(path)?'https://image.tmdb.org/t/p/w1280'+path:null;
}
export async function fetchCatalogue(key,country,options={}) {
  if(!/^[A-Z]{2}$/.test(country))throw new Error('Choose a country.');
  const request=path=>tmdb(path,key,options);
  await request('authentication');
  const groups=await Promise.all(['movie','tv'].map(async type=>{
    const providers=await request('watch/providers/'+type+'?watch_region='+country);
    const ids=new Set((providers.results||[]).filter(p=>/^(Netflix|Apple TV\+?|Amazon Prime Video)(?: with Ads| Standard with Ads)?$/i.test(p.provider_name||'')).map(p=>p.provider_id));
    if(!ids.size)return [];
    const matches=[];
    for(let page=1;page<=3&&matches.length<3;page++){
      const trending=await request('trending/'+type+'/week?page='+page);
      const candidates=(trending.results||[]).filter(x=>Number.isInteger(x.id)&&x.adult!==true&&backdropURL(x.backdrop_path));
      // Four simultaneous provider lookups, preserving trending order.
      for(let offset=0;offset<candidates.length&&matches.length<3;offset+=4){
        const batch=await Promise.all(candidates.slice(offset,offset+4).map(async item=>{
          const availability=await request(type+'/'+item.id+'/watch/providers');
          const region=availability.results?.[country];
          if(!(region?.flatrate||[]).some(p=>ids.has(p.provider_id)))return null;
          return {id:item.id,type,title:String(item.title||item.name||''),overview:String(item.overview||''),image:backdropURL(item.backdrop_path)};
        }));
        matches.push(...batch.filter(Boolean));
      }
      if(page>=(trending.total_pages||1))break;
    }
    return matches.slice(0,3);
  }));
  return groups[0].flatMap((item,i)=>[item,groups[1][i]].filter(Boolean)).concat(groups[1].slice(groups[0].length));
}
