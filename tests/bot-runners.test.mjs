import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';import {spawnSync} from 'node:child_process';
import {examples} from '../frontend/src/games/ottv2/botExamples.js';
import {matchLogToReplay} from '../frontend/src/api/replayAdapter.js';
const require=createRequire(import.meta.url), Engine=require('../logic/engine'),{runMatch}=require('../logic/grader'),{server}=require('../logic/server');
const large=JSON.parse(fs.readFileSync(new URL('../samples/maps/large-13.json',import.meta.url)));
for(const language of ['python','cpp','java']) {
 const command=language==='java'?(process.env.OTTV2_JAVAC||'javac'):language==='cpp'?'g++':'python';
 const available=spawnSync(command,['--version']).status===0;
 test(`${language} SDK and grader finish a real 13×13 bot match`,{skip:!available?'Compiler/runtime unavailable in this environment':false},async()=>{
  const log=await runMatch({matchId:`TEST-${language}`,whiteSource:examples[language],blackSource:examples[language],whiteLanguage:language,blackLanguage:language,game:new Engine({...large,maxTurns:2},'bot')});
  assert.equal(log.result.status,'finished');assert.equal(log.result.reason,'move-limit-draw');assert.equal(log.result.turns,2);
  assert.equal(log.result.remaining.white,18);assert.equal(log.result.remaining.black,18);
  const replay=matchLogToReplay(log);assert.equal(replay.boardSize,13);assert.equal(replay.maxMoves,2);assert.equal(replay.frames.at(-1).status,'finished');
 });
}
test('HTTP submission → queued match → grader → replay completes using two Python bots',async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const api=async(path,body)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
 try {
  const white=await api('/api/submissions',{playerId:'w',language:'python',source:examples.python});
  const black=await api('/api/submissions',{playerId:'b',language:'python',source:examples.python});
  assert.equal(white.status,201);assert.equal(black.status,201);
  const match=await api('/api/matches',{whiteSubmissionId:white.data.id,blackSubmissionId:black.data.id,mapId:'small-5',config:{maxTurns:2,firstSide:'black'}});assert.equal(match.status,202);
  let status;
  const deadline=Date.now()+20000;
  do {status=(await api('/api/matches/'+match.data.id)).data;if(['finished','failed'].includes(status.status))break;await new Promise(r=>setTimeout(r,50));}while(Date.now()<deadline);
  assert.equal(status.status,'finished',status.error);assert.equal(status.result.reason,'move-limit-draw');
  const log=(await api('/api/matches/'+match.data.id+'/replay')).data;assert.equal(log.boardSize,5);assert.equal(log.firstSide,'black');assert.equal(matchLogToReplay(log).frames.at(-1).status,'finished');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('invalid bot actions consume turns, count decision and terminal result remain authoritative',async()=>{
 const source='def choose_move(state):\n    return ("a1", "a1")\n';
 const config={boardSize:5,maxTurns:2,initialPieces:[{color:'white',type:'rock',square:'b1'},{color:'white',type:'paper',square:'c1'},{color:'black',type:'paper',square:'d5'}]};
 const log=await runMatch({matchId:'INVALID',whiteSource:source,blackSource:source,whiteLanguage:'python',blackLanguage:'python',game:new Engine(config,'bot')});
 assert.equal(log.result.winner,'white');assert.equal(log.result.reason,'move-limit-more-pieces');assert.equal(log.result.turns,2);assert.equal(log.frames.filter(f=>f.move?.result==='invalid').length,2);
});
