import test from 'node:test';
import assert from 'node:assert/strict';
import {credentialKind,backdropURL,tmdb,fetchCatalogue} from '../artwork.mjs';
const key='a'.repeat(32);
test('credentials and image paths reject malformed values',()=>{
 assert.equal(credentialKind(key),'key');assert.equal(credentialKind('abc.def.ghi'),'token');
 assert.throws(()=>credentialKind('invalid'));assert.equal(backdropURL('/safe.jpg'),'https://image.tmdb.org/t/p/original/safe.jpg');
 assert.equal(backdropURL('//evil.example/a.jpg'),null);assert.equal(backdropURL('/../a.jpg'),null);
});
test('token authentication goes in header and only to TMDB',async()=>{
 await tmdb('authentication','abc.def.ghi',{fetcher:async(url,opts)=>{assert.equal(new URL(url).origin,'https://api.themoviedb.org');assert.equal(new URL(url).searchParams.has('api_key'),false);assert.equal(opts.headers.Authorization,'Bearer abc.def.ghi');assert.equal(opts.credentials,'omit');return {ok:true,json:async()=>({success:true})};}});
});
test('new catalogue paginates beyond three titles, filters dates and sends region/provider filters',async()=>{
 const calls=[];
 const fetcher=async url=>{
  const u=new URL(url),p=u.pathname;calls.push(u);let data;
  if(p.endsWith('/authentication'))data={success:true};
  else if(p.includes('/watch/providers/'))data={results:[{provider_id:8,provider_name:'Netflix'},{provider_id:9,provider_name:'Other'}]};
  else if(p.includes('/genre/'))data={genres:[{id:18,name:'Drama'}]};
  else if(p.includes('/discover/')){
   assert.equal(u.searchParams.get('with_watch_providers'),'8');assert.equal(u.searchParams.get('watch_region'),'AU');
   assert.equal(u.searchParams.get('with_watch_monetization_types'),'flatrate');
   const page=Number(u.searchParams.get('page'));
   data={total_pages:2,results:[1,2,3,4].map(n=>({id:n+page*10,title:'Movie '+n,name:'Show '+n,backdrop_path:'/image'+n+'.jpg',overview:'A complete synopsis.',release_date:n===1?'2020-01-01':'2026-10-01',genre_ids:[18],vote_average:7.2}))};
  }else throw new Error('Unexpected endpoint '+p);
  return {ok:true,json:async()=>data};
 };
 const items=await fetchCatalogue(key,'AU',{fetcher,now:'2026-10-26'});
 assert.equal(items.length,12);assert.deepEqual(items.slice(0,4).map(x=>x.type),['movie','tv','movie','tv']);
 assert.deepEqual(items[0].genres,['Drama']);assert.equal(items[0].year,'2026');
 assert.equal(calls.filter(u=>u.pathname.includes('/discover/')).length,4);
 assert.ok(!calls.some(u=>u.pathname.includes('/trending/')));
});
test('authentication failures have no credential in the error',async()=>{
 await assert.rejects(tmdb('authentication',key,{fetcher:async()=>({ok:false,status:401})}),e=>e.message==='TMDB did not accept that key.'&&!e.message.includes(key));
});

test('provider queues give Apple TV early visibility and merge shared titles',async()=>{
 const {interleaveCatalogues}=await import('../artwork.mjs');
 const title=(id,platform,type='movie')=>({id,type,title:String(id),platforms:[platform]});
 const result=interleaveCatalogues([[title(1,'Apple TV')],[title(2,'Apple TV','tv')],[title(3,'Netflix'),title(4,'Netflix'),title(1,'Netflix')],[title(5,'Netflix','tv')],[title(6,'Prime Video')]]);
 assert.deepEqual(result.slice(0,5).map(i=>i.id),[1,2,3,5,6]);assert.equal(result.filter(i=>i.id===1).length,1);assert.deepEqual(result[0].platforms,['Apple TV','Netflix']);assert.equal(result.length,6);
});

test('catalogue fetch isolates subscription providers and rotates Apple movies/shows early',async()=>{
 const ids=[];
 const fetcher=async url=>{const u=new URL(url),p=u.pathname;let data;
  if(p.endsWith('/authentication'))data={success:true};
  else if(p.includes('/watch/providers/'))data={results:[{provider_id:350,provider_name:'Apple TV'},{provider_id:2,provider_name:'Apple TV Store'},{provider_id:8,provider_name:'Netflix'},{provider_id:9,provider_name:'Amazon Prime Video'}]};
  else if(p.includes('/genre/'))data={genres:[]};
  else{const provider=Number(u.searchParams.get('with_watch_providers'));ids.push(provider);assert.equal(u.searchParams.get('with_watch_monetization_types'),'flatrate');data={total_pages:1,results:[{id:provider,title:'Film '+provider,name:'Show '+provider,overview:'A complete synopsis.',release_date:'2026-10-09',first_air_date:'2026-10-10',backdrop_path:'/art.jpg'}]};}
  return {ok:true,json:async()=>data};
 };
 const result=await fetchCatalogue(key,'AU',{fetcher,now:'2026-10-26'});
 assert.deepEqual(result.slice(0,2).map(i=>[i.platforms[0],i.type]),[['Apple TV','movie'],['Apple TV','tv']]);
 assert.equal(result.length,6);assert.deepEqual([...new Set(ids)].sort((a,b)=>a-b),[8,9,350]);assert.deepEqual(result.failures,[]);
});
