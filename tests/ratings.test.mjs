import test from 'node:test';
import assert from 'node:assert/strict';
import {omdbRating,omdbRatingByTitle,omdbCredential,createRatingCache} from '../ratings.mjs';
test('OMDb uses HTTPS and exact IMDb identity, returns a bare decimal',async()=>{
 const value=await omdbRating('tt0133093','test1234',{fetcher:async(url,options)=>{
  const u=new URL(url);assert.equal(u.origin,'https://www.omdbapi.com');assert.equal(u.searchParams.get('i'),'tt0133093');assert.equal(options.credentials,'omit');
  return {ok:true,json:async()=>({Response:'True',imdbID:'tt0133093',imdbRating:'8.5'})};
 }});assert.equal(value,'8.5');
});
test('unavailable or mismatched ratings are rejected and errors do not reveal a key',async()=>{
 for(const data of [{Response:'False',Error:'Movie not found!'},{Response:'True',imdbID:'tt9999999',imdbRating:'8.5'},{Response:'True',imdbID:'tt0133093',imdbRating:'N/A'}]){
  assert.equal(await omdbRating('tt0133093','test1234',{fetcher:async()=>({ok:true,json:async()=>data})}),null);
 }
 await assert.rejects(omdbRating('tt0133093','test1234',{fetcher:async()=>({ok:true,json:async()=>({Response:'False',Error:'Invalid API key!'})})}),e=>!e.message.includes('test1234'));
 assert.throws(()=>omdbCredential('bad/key'));assert.equal(await omdbRating('not-an-id','test1234'),null);
});
test('rating cache prevents repeated requests and refreshes stale scores',async()=>{
 let time=0,calls=0;const cache=createRatingCache({now:()=>time,ttl:100});const load=async()=>{calls++;return '8.5';};
 await cache.get('tt0133093','test1234',load);await cache.get('tt0133093','test1234',load);assert.equal(calls,1);
 time=101;await cache.get('tt0133093','test1234',load);assert.equal(calls,2);cache.clear();await cache.get('tt0133093','test1234',load);assert.equal(calls,3);
});

test('missing IMDb IDs can use a strict title/year/type match, rejecting remakes and other media',async()=>{
 const item={title:'A New Film',year:'2026',type:'movie'};
 const fetcher=async url=>{const u=new URL(url);assert.equal(u.searchParams.get('t'),item.title);assert.equal(u.searchParams.get('y'),'2026');assert.equal(u.searchParams.get('type'),'movie');return {ok:true,json:async()=>({Response:'True',imdbID:'tt1234567',Title:'A New Film',Year:'2026',Type:'movie',imdbRating:'7.3'})};};
 assert.equal(await omdbRatingByTitle(item,'test1234',{fetcher}),'7.3');
 for(const override of [{Title:'A Different Film'},{Year:'2025'},{Type:'series'}])assert.equal(await omdbRatingByTitle(item,'test1234',{fetcher:async()=>({ok:true,json:async()=>({Response:'True',imdbID:'tt1234567',Title:'A New Film',Year:'2026',Type:'movie',imdbRating:'7.3',...override})})}),null);
});

test('Cinemeta uses movie/series IMDb metadata without receiving API credentials',async()=>{
 const {cinemetaRating}=await import('../ratings.mjs');
 const value=await cinemetaRating('tt0133093','tv',{fetcher:async(url,options)=>{assert.equal(url,'https://v3-cinemeta.strem.io/meta/series/tt0133093.json');assert.equal(options.credentials,'omit');assert.equal(options.headers,undefined);return {ok:true,json:async()=>({meta:{id:'tt0133093',imdbRating:'8.7'}})};}});
 assert.equal(value,'8.7');
 for(const meta of [{id:'tt0133093',imdbRating:''},{id:'tt9999999',imdbRating:'8.7'},{id:'tt0133093',imdbRating:'N/A'}])assert.equal(await cinemetaRating('tt0133093','movie',{fetcher:async()=>({ok:true,json:async()=>({meta})})}),null);
});
test('ratings prefer Cinemeta and use OMDb only as an optional fallback',async()=>{
 const {lookupIMDbRating}=await import('../ratings.mjs');let calls=0;
 const item={imdbId:'tt0133093',type:'movie'};
 assert.deepEqual(await lookupIMDbRating(item,'test1234',{fetcher:async url=>{calls++;assert.equal(new URL(url).hostname,'v3-cinemeta.strem.io');return {ok:true,json:async()=>({meta:{id:'tt0133093',imdbRating:'8.7'}})};}}),{value:'8.7',source:'Cinemeta'});assert.equal(calls,1);
 assert.deepEqual(await lookupIMDbRating(item,'test1234',{fetcher:async url=>({ok:true,json:async()=>new URL(url).hostname==='v3-cinemeta.strem.io'?{meta:{id:'tt0133093',imdbRating:''}}:{Response:'True',imdbID:'tt0133093',imdbRating:'8.5'}})}),{value:'8.5',source:'OMDb'});
});

test('official preview fallback validates ID and renders a real score without credentials',async()=>{
 const {officialPreviewRating}=await import('../ratings.mjs');
 assert.deepEqual(await officialPreviewRating('tt39578551',{fetcher:async(url,options)=>{assert.equal(url,'/api/imdb-rating?i=tt39578551');assert.equal(options.credentials,'omit');return {ok:true,json:async()=>({id:'tt39578551',rating:'7.8',updated:'2026-10-26'})};}}),{value:'7.8',source:'IMDb daily dataset',updated:'2026-10-26'});
 assert.equal(await officialPreviewRating('tt39578551',{fetcher:async()=>({ok:true,json:async()=>({id:'tt9999999',rating:'7.8'})})}),null);
});

test('missing IMDb identity fallback rejects ambiguous names, wrong years and media types',async()=>{
 const {cinemetaIdentity}=await import('../ratings.mjs'),item={title:'Madam Inspector',originalTitle:'Original Title',year:'2026',type:'tv'};
 const lookup=metas=>cinemetaIdentity(item,{fetcher:async()=>({ok:true,json:async()=>({metas})})});
 const valid={id:'tt1234567',name:'Madam Inspector',releaseInfo:'2026',type:'series'};
 assert.equal(await lookup([valid]),'tt1234567');assert.equal(await lookup([{...valid,name:'Original Title'}]),'tt1234567');
 assert.equal(await lookup([valid,{...valid,id:'tt2345678'}]),null);
 for(const override of [{releaseInfo:'2025'},{name:'Different Title'},{type:'movie'}])assert.equal(await lookup([{...valid,...override}]),null);
});

test('verified localized identity is scoped to its stable TMDB type and ID',async()=>{
 const {verifiedIMDbIdentity}=await import('../ratings.mjs');
 assert.equal(verifiedIMDbIdentity({type:'tv',id:339010,title:'Madam Inspector'}),'tt37626694');
 assert.equal(verifiedIMDbIdentity({type:'movie',id:339010}),null);
 assert.equal(verifiedIMDbIdentity({type:'tv',id:123,title:'Madam Inspector'}),null);
});
