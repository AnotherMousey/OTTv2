import test from 'node:test';import assert from 'node:assert/strict';
import {readHistory,writeHistory,updateHistoryMatch,matchFailure} from './submissionHistory.js';
const memory=()=>{let data;return{getItem:()=>data,setItem:(key,value)=>{data=value;}}};
test('submission records persist and result updates retain their identity',()=>{
 const storage=memory();writeHistory({id:'s1',matchId:'m1',status:'queued'},storage);updateHistoryMatch('m1',{status:'finished',result:{reason:'bot-error',winner:'black'}},storage);
 const [r]=readHistory(storage);assert.equal(r.id,'s1');assert.equal(r.result.reason,'bot-error');assert.equal(readHistory(storage).length,1);
});
test('blocked or malformed history storage does not crash',()=>{
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};assert.deepEqual(readHistory(blocked),[]);assert.equal(writeHistory({id:'x',matchId:'m'},blocked),false);assert.deepEqual(readHistory({getItem:()=>'{broken'}),[]);
});
test('missing backend executable is diagnosed separately from gameplay results',()=>{
 const replay={result:{reason:'bot-error'},frames:[{event:'white-forfeit: Could not start player: spawn python ENOENT'}]};assert.equal(matchFailure(replay).title,'Bot runtime unavailable');assert.match(matchFailure(replay).detail,/did not start/);assert.equal(matchFailure({result:{reason:'enemy-source-reached'},frames:[]}),null);
});
