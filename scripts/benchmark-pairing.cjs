const {pairEntries}=require('../services/platform/tournament.cjs');
const entries=Array.from({length:4000},(_,i)=>({userId:'student-'+String(i).padStart(4,'0'),user:{rating:1000+i%200}}));
const history=[],rounds=[];for(let round=1;round<=10;round++){const started=performance.now();const pairs=pairEntries(entries,history,round);rounds.push({round,matches:pairs.length,ms:performance.now()-started});history.push(...pairs.map(([a,b])=>({whiteId:a.userId,blackId:b?.userId})));}
console.log(JSON.stringify({node:process.version,participants:4000,scope:'pure in-memory pairing; excludes DB, compilation, bots, HTTP and replay',rounds},null,2));
