import test from 'node:test';
import assert from 'node:assert/strict';
import {credentialKind,backdropURL,tmdb,fetchCatalogue} from '../artwork.mjs';
const key='a'.repeat(32);
test('credentials and image paths reject malformed values',()=>{
 assert.equal(credentialKind(key),'key');assert.equal(credentialKind('abc.def.ghi'),'token');
 assert.throws(()=>credentialKind('invalid'));assert.equal(backdropURL('/safe.jpg'),'https://image.tmdb.org/t/p/w1280/safe.jpg');
 assert.equal(backdropURL('//evil.example/a.jpg'),null);assert.equal(backdropURL('/../a.jpg'),null);
});
test('token authentication goes in header and only to TMDB',async()=>{
 await tmdb('authentication','abc.def.ghi',{fetcher:async(url,opts)=>{assert.equal(new URL(url).origin,'https://api.themoviedb.org');assert.equal(new URL(url).searchParams.has('api_key'),false);assert.equal(opts.headers.Authorization,'Bearer abc.def.ghi');assert.equal(opts.credentials,'omit');return {ok:true,json:async()=>({success:true})};}});
});
test('catalogue selects three of each, excludes unsupported services and preserves rank',async()=>{
 const fetcher=async url=>{
  const u=new URL(url),p=u.pathname;let data;
  if(p.endsWith('/authentication'))data={success:true};
  else if(p.includes('/watch/providers/'))data={results:[{provider_id:8,provider_name:'Netflix'},{provider_id:9,provider_name:'Other'}]};
  else if(p.includes('/trending/'))data={total_pages:1,results:[1,2,3,4,5].map(id=>({id,title:'Movie '+id,name:'Show '+id,backdrop_path:'/image'+id+'.jpg'}))};
  else {const id=+p.split('/')[3];data={results:{AU:{flatrate:[{provider_id:id===1?9:8}]},US:{flatrate:[{provider_id:9}]}}};}
  return {ok:true,json:async()=>data};
 };
 const items=await fetchCatalogue(key,'AU',{fetcher});assert.equal(items.length,6);assert.deepEqual(items.map(x=>x.id),[2,2,3,3,4,4]);assert.deepEqual(items.map(x=>x.type),['movie','tv','movie','tv','movie','tv']);
 assert.equal((await fetchCatalogue(key,'US',{fetcher})).length,0);
});
test('authentication failures have no credential in the error',async()=>{
 await assert.rejects(tmdb('authentication',key,{fetcher:async()=>({ok:false,status:401})}),e=>e.message==='TMDB did not accept that key.'&&!e.message.includes(key));
});
