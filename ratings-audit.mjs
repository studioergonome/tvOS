// Audit the complete catalogue against the same official snapshot used in preview.
export async function auditCatalogue(items,{resolveId,official,resolveRating,concurrency=4,onProgress=()=>{}}){
 const rows=new Array(items.length);let next=0,done=0;
 async function worker(){while(next<items.length){const index=next++,item=items[index];let id=null;
  try{id=await resolveId(item);const expected=id?await official(id):null;let actual=null;
   if(expected)actual=await resolveRating(item);
   rows[index]={title:item.title,type:item.type,tmdbId:item.id,imdbId:id,official:expected?.value||null,displayed:actual?.value||null,source:actual?.source||null,status:!id?'unmapped':!expected?'no_official_score':actual?.value===expected.value?'verified':'mismatch'};
  }catch(error){rows[index]={title:item.title,type:item.type,tmdbId:item.id,imdbId:id,status:'error',error:error.message};}
  onProgress(++done,items.length);
 }}
 await Promise.all(Array.from({length:Math.min(concurrency,items.length)},worker));
 return {checked:rows.length,rated:rows.filter(r=>r.official).length,verified:rows.filter(r=>r.status==='verified').length,mismatches:rows.filter(r=>r.status==='mismatch').length,unmapped:rows.filter(r=>r.status==='unmapped').length,errors:rows.filter(r=>r.status==='error').length,rows};
}
