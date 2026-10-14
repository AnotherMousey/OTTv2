import test from 'node:test';
import assert from 'node:assert/strict';
import {makeEvent,previewEvents,joinEvent,reviewEntry,saveEventBot,advanceEvent,recordResult} from './tournamentModel.js';
test('registration requests wait for approval; closure requires all requests reviewed and two accepted players',()=>{
 let e=makeEvent('test','Test');e=joinEvent(e,'atlas');assert.equal(e.players.find(p=>p.id==='atlas').entry,'pending');assert.equal(e.players.find(p=>p.id==='atlas').joined,false);
 assert.throws(()=>advanceEvent(e),/Review all pending/);
 e=e.players.filter(p=>p.entry==='pending').reduce((s,p)=>reviewEntry(s,p.id,p.id==='atlas'),e);
 e=advanceEvent(e);assert.equal(e.phase,'preparation');assert.throws(()=>joinEvent(e,'byte'),/closed/);assert.throws(()=>reviewEntry(e,'byte',true),/registration/);
});
test('bot preparation requires accepted players and readiness; phase transition locks uploads',()=>{
 let e=makeEvent('test','Test','preparation');e={...e,players:e.players.map(p=>({...p,botReady:false}))};
 assert.throws(()=>advanceEvent(e),/Every accepted player/);
 for(const p of e.players)e=saveEventBot(e,p.id,{name:'bot.py',language:'Python'});
 e=advanceEvent(e);assert.equal(e.phase,'pairing');assert.equal(e.pairs.length,4);
 assert.throws(()=>saveEventBot(e,'atlas',{name:'bot.py',language:'Python'}),/only open/);
 const entrantIds=e.pairs.flatMap(p=>[p.white,p.black]).filter(Boolean);assert.equal(new Set(entrantIds).size,8);
 e=advanceEvent(e);assert.equal(e.phase,'live');assert.throws(()=>advanceEvent(e),/Finish every match/);
});
test('Elo updates once; next-round preparation and final phase retain recorded results',()=>{
 let e=makeEvent('test','Test','live');e={...e,totalRounds:2};
 for(const p of e.pairs){e=recordResult(e,p.id,1);assert.equal(recordResult(e,p.id,0),e);}
 assert.equal(e.history.length,4);e=advanceEvent(e);assert.equal(e.phase,'preparation');assert.equal(e.round,2);assert.equal(e.pairs.length,0);
 e=advanceEvent(advanceEvent(e));for(const p of e.pairs)e=recordResult(e,p.id,.5);
 e=advanceEvent(e);assert.equal(e.phase,'finished');assert.equal(e.history.length,8);assert.throws(()=>advanceEvent(e),/already finished/);
});
test('odd accepted-player count receives one bye and cannot score a bye',()=>{
 let e=makeEvent('test','Test','preparation');e.players=e.players.map((p,i)=>i===0?{...p,entry:'declined',joined:false}:p);e=advanceEvent(e);
 const bye=e.pairs.find(p=>p.status==='bye');assert.ok(bye);assert.equal(recordResult(e,bye.id,1),e);assert.equal(e.pairs.length,4);
});
test('separate tournaments isolate registrations and provide seeded cross-tournament matches',()=>{
 const events=previewEvents(),original=events[1];const open=joinEvent(events[0],'atlas');assert.notDeepEqual(open,events[0]);assert.equal(events[1],original);assert.equal(events.filter(t=>t.phase==='live').length,2);
 const full={...events[0],capacity:1};assert.throws(()=>joinEvent(full,'atlas'),/full/);
});
