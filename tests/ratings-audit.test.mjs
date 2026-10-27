import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCatalogue} from '../ratings-audit.mjs';
test('catalogue audit distinguishes verified scores, unmapped titles, missing data and mismatches',async()=>{
 const items=[{id:1,title:'Fading Grandeur',type:'tv'},{id:2,title:'BTS: The Return',type:'movie'},{id:3,title:'Unmapped',type:'tv'},{id:4,title:'No score',type:'movie'}];
 const report=await auditCatalogue(items,{resolveId:async item=>item.id===3?null:'tt000000'+item.id,official:async id=>id.endsWith('4')?null:{value:id.endsWith('1')?'5.7':'7.8'},resolveRating:async item=>({value:item.id===1?'5.7':'7.0',source:'IMDb daily dataset'})});
 assert.equal(report.checked,4);assert.equal(report.rated,2);assert.equal(report.verified,1);assert.equal(report.mismatches,1);assert.equal(report.unmapped,1);assert.equal(report.rows[3].status,'no_official_score');
});
