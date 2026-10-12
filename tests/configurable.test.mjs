import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
import {parseReplay} from '../frontend/src/replay.js';
import {recordingToReplay,matchLogToReplay,stateToPieces} from '../frontend/src/api/replayAdapter.js';
const require=createRequire(import.meta.url), Engine=require('../logic/engine'),{server,rooms}=require('../logic/server');

test('all saved samples reproduce their terminal result through the engine',()=>{
 for(const file of fs.readdirSync(new URL('../samples/scenarios/',import.meta.url))) {
  const scenario=JSON.parse(fs.readFileSync(new URL('../samples/scenarios/'+file,import.meta.url)));
  const game=new Engine(scenario.config,'bot');
  const replay=parseReplay(fs.readFileSync(new URL('../samples/matches/'+file,import.meta.url),'utf8'));
  assert.deepEqual(stateToPieces(game.getPublicState()), replay.frames[0].pieces.sort((a,b)=>a.id.localeCompare(b.id)));
  scenario.moves.forEach(([from,to],i)=>{game.movePiece(from,to);assert.deepEqual(stateToPieces(game.getPublicState()),replay.frames[i+1].pieces.sort((a,b)=>a.id.localeCompare(b.id)));});
  assert.equal(game.status,'finished',file);assert.equal(game.winner,scenario.expected.winner,file);assert.equal(game.endReason,scenario.expected.reason,file);
  assert.equal(replay.frames.at(-1).status,'finished');assert.equal(replay.result.winner,game.winner);
  assert.throws(()=>game.movePiece(...scenario.moves[0]),/finished/);
 }
});
test('invalid config fails, default setup/reset remains legacy-compatible and multi-digit coordinates round-trip',()=>{
 for(const config of [{boardSize:4},{boardSize:27},{maxTurns:0},{firstSide:'red'},{initialPieces:[]},{targets:{white:'z99',black:'a1'}}])assert.throws(()=>new Engine(config));
 const game=new Engine();assert.equal(game.countPieces('white'),9);assert.equal(game.config.maxTurns,null);game.movePiece('b1','a1');game.reset();assert.equal(game.turnsPlayed,0);assert.equal(game.getPiece('b1').type,'rock');
 const large=JSON.parse(fs.readFileSync(new URL('../samples/maps/large-13.json',import.meta.url)));
 const g=new Engine({...large,maxTurns:1,firstSide:'black'},'bot');assert.equal(g.getPiece('l13').square,'l13');g.movePiece('l13','m12');assert.equal(g.status,'finished');assert.equal(g.winner,null);
 assert.deepEqual(stateToPieces(g.getPublicState('white')),stateToPieces(g.getPublicState('black')));
});
test('configured room API, specification, cursor replay and reset work without breaking full replay',async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const api=async(path,body)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
 try{
  const spec=(await api('/api/games/current')).data;assert.equal(spec.maps.length,3);assert.deepEqual(spec.languages,['java','cpp','python']);
  assert.equal((await api('/api/rooms',{clientId:'x',mapId:'unknown'})).status,400);
  const {data}=await api('/api/rooms',{clientId:'w',mapId:'large-13',config:{maxTurns:2,firstSide:'black'}});const root='/api/rooms/'+data.roomId;
  await api(root+'/join',{clientId:'b'});
  const first=(await api(root+'/replay?afterSeq=-1&limit=1')).data;assert.equal(first.frames[0].seq,0);assert.equal(first.config.boardSize,13);
  assert.equal((await api(root+'/move',{clientId:'b',from:'l13',to:'m12'})).status,200);
  const delta=(await api(root+`/replay?afterSeq=0&limit=1&recordingId=${first.matchId}`)).data;assert.equal(delta.frames[0].seq,1);
  await api(root+'/move',{clientId:'w',from:'b1',to:'a2'});
  const full=(await api(root+'/replay')).data;const replay=recordingToReplay(full);assert.equal(replay.maxMoves,2);assert.equal(replay.firstSide,'black');assert.equal(replay.result.reason,'move-limit-draw');assert.equal(replay.boardSize,13);
  const unchanged=(await api(root+`/replay?afterSeq=2&recordingId=${first.matchId}`)).data;assert.equal(unchanged.frames.length,0);
  await api(root+'/new',{clientId:'w'});
  const reset=(await api(root+`/replay?afterSeq=2&recordingId=${first.matchId}`)).data;assert.equal(reset.reset,true);assert.equal(reset.frames[0].seq,0);assert.equal(reset.config.boardSize,13);
  assert.equal((await api(root+'/replay?afterSeq=-5')).status,400);
 }finally{rooms.clear();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
