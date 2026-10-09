import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { recordingToReplay, stateToPieces, squareToPosition, positionToSquare } from '../frontend/src/api/replayAdapter.js';
import { parseReplay } from '../frontend/src/replay.js';
const require=createRequire(import.meta.url);
const {server,rooms}=require('../logic/server.js');
const {resetRecording}=require('../logic/recording.js');
const Engine=require('../logic/engine.js');

test('canonical coordinates are independent of backend array rotation',()=>{
 const engine=new Engine();
 assert.deepEqual(stateToPieces(engine.getPublicState('white')),stateToPieces(engine.getPublicState('black')));
 for(let x=0;x<9;x++)for(let y=0;y<9;y++)assert.deepEqual(squareToPosition(positionToSquare(x,y)),{x,y});
 assert.deepEqual(squareToPosition('a1'),{x:0,y:8});
 assert.deepEqual(squareToPosition('i9'),{x:8,y:0});
 assert.throws(()=>squareToPosition('j1'));
});

test('room API records real transitions, captures, resets, forfeit and timeout',async(t)=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 async function api(path,body){const response=await fetch(base+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};}
 try {
 const created=await api('/api/rooms',{clientId:'white-test'});assert.equal(created.status,201);
 const id=created.data.roomId;const root='/api/rooms/'+id;
 assert.equal(created.data.role,'white');
 assert.equal((await api(root+'/join',{clientId:'black-test'})).data.role,'black');
 assert.equal((await api(root+'/state')).data.role,'spectator');
 assert.equal((await api(root+'/move',{clientId:'spectator',from:'b1',to:'a1'})).status,400);
 assert.equal((await api(root+'/move',{clientId:'black-test',from:'h9',to:'i9'})).status,400);
 const initial=(await api(root+'/replay')).data;
 await api(root+'/move',{clientId:'white-test',from:'b1',to:'a1'});
 await api(root+'/move',{clientId:'black-test',from:'h9',to:'i9'});
 const recording=(await api(root+'/replay')).data;
 assert.equal(recording.frames.length,3);
 assert.deepEqual(initial.frames[0],recording.frames[0]);
 const replay=recordingToReplay(recording);
 assert.deepEqual(parseReplay(JSON.stringify(replay)),replay);
 assert.equal(replay.frames[0].pieces.find(p=>p.id==='white-rock-0').x,1);
 assert.equal(replay.frames[1].pieces.find(p=>p.id==='white-rock-0').x,0);
 assert.equal(replay.frames[2].pieces.find(p=>p.id==='black-rock-8').x,8);
 await api(root+'/forfeit',{clientId:'white-test'});
 const final=(await api(root+'/replay')).data;assert.equal(final.frames.at(-1).state.winner,'black');assert.equal(final.frames.length,4);
 assert.equal((await api(root+'/replay')).data.frames.length,4,'polling does not duplicate terminal frames');
 await api(root+'/new',{clientId:'black-test'});
 const reset=(await api(root+'/replay')).data;assert.notEqual(reset.matchId,initial.matchId);assert.equal(reset.frames.length,1);
 // Capture fixtures preserve enough types to exercise original authoritative rules.
 const room=rooms.get(id);
 for(const [attacker,defender,result] of [['rock','scissors','attacker'],['paper','scissors','defender'],['rock','rock','blocked']]) {
 room.game.reset();room.game.board=Array.from({length:9},()=>Array(9).fill(null));
 const pieces=[['white',attacker,'a1'],['black',defender,'b2'],['white','paper','h1'],['white','scissors','h2'],['black','rock','g9'],['black','paper','g8']];
 pieces.forEach(([color,type,square],i)=>{room.game.board[9-Number(square[1])][square.charCodeAt(0)-97]={id:`p${i}`,color,type,square};});
 resetRecording(room);
 const response=await api(root+'/move',{clientId:'white-test',from:'a1',to:'b2'});
 const recorded=(await api(root+'/replay')).data;
 if(result==='blocked'){assert.equal(response.status,400);assert.equal(recorded.frames.length,1);assert.equal(room.game.currentTurn,'white');}
 else {assert.equal(response.status,200);assert.equal(recorded.frames[1].move.result,result);const r=recordingToReplay(recorded);assert.ok(r.frames[0].pieces.some(p=>p.id==='p0'));assert.equal(r.frames[1].pieces.some(p=>p.id==='p0'),result==='attacker');assert.equal(r.frames[1].pieces.some(p=>p.id==='p1'),result==='defender');}
 }
 room.game.reset();resetRecording(room);room.game.clockStarted=true;room.game.whiteTimeMs=1;room.game.turnStartedAt=Date.now()-100;
 const timeout=(await api(root+'/replay')).data;assert.equal(timeout.frames.at(-1).state.winner,'black');assert.equal(timeout.frames.length,2);
 assert.equal((await api('/api/rooms/OTT-MISSING/replay')).status,400);
 assert.equal((await api('/api/missing')).status,404);
 const font=await fetch(base+'/fonts/PixeloidSans.ttf');assert.equal(font.status,200);assert.equal(font.headers.get('content-type'),'font/ttf');assert.ok((await font.arrayBuffer()).byteLength>10000);
 }finally{rooms.clear();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
