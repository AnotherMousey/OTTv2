const {test}=require('node:test');const assert=require('node:assert/strict');
const {digest,validateManifest,validatePart}=require('../sync/bundle.cjs');
function fixture(){
 const sourceHash='0'.repeat(64),ids=['a','b'];
 const matches=ids.map((id,i)=>({match:{id:'MATCH-fixture-'+i,round:1,whiteId:id,blackId:ids[1-i],whiteSubmissionId:null,blackSubmissionId:null,status:'finished',score:.5,result:{score:.5,reason:'submission-forfeit',administrative:true},runId:null,whiteBefore:1000,blackBefore:1000,whiteDelta:0,blackDelta:0},frames:[]}));
 const m={format:'bot-tournament-bundle',version:2,tournament:{id:'t',name:'Daily',description:'Test',phase:'finished',format:'daily-round-robin',startDate:'2026-10-22',endDate:'2026-10-22',totalRounds:1},participants:ids.map(id=>({id,username:id,name:id,rating:1000,games:2})),submissions:[],matches:matches.map(part=>({id:part.match.id,digest:digest(part)}))};
 return {m,matches};
}
test('daily archive validates full double round robin and explicit administrative outcomes',()=>{const {m,matches}=fixture();assert.match(validateManifest(m),/^[a-f0-9]{64}$/);for(const part of matches)assert.match(validatePart(part,m),/^[a-f0-9]{64}$/);});
test('daily archive rejects missing pairings and mismatched schedule',()=>{const {m}=fixture();assert.throws(()=>validateManifest({...m,matches:m.matches.slice(1)}),{status:400});assert.throws(()=>validateManifest({...m,tournament:{...m.tournament,totalRounds:2}}),{status:400});});
