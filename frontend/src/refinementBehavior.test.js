import test from 'node:test';
import assert from 'node:assert/strict';
import {checkBotFile,MAX_BOT_BYTES} from './botUpload.js';
import {directoryMatches,filterMatches,matchStatus} from './matchDirectory.js';
import {previewEvents,saveEventBot} from './tournamentModel.js';
test('basic bot checks reject wrong extension, empty code and oversized files without claiming execution validation',()=>{
 assert.throws(()=>checkBotFile({name:'bot.txt',language:'Python',source:'print(1)'}),/\.py/);
 assert.throws(()=>checkBotFile({name:'bot.py',language:'Python',source:'  '}),/empty/);
 assert.throws(()=>checkBotFile({name:'bot.py',language:'Python',source:'print(1)',size:MAX_BOT_BYTES+1}),/too large/);
 assert.deepEqual(checkBotFile({name:'bot.py',language:'Python',source:'print(1)'}),{name:'bot.py',language:'Python',size:8,fileChecks:'passed'});
});
test('watch directory isolates ongoing/completed demos and filters tournaments and participant names',()=>{
 const matches=directoryMatches(previewEvents());assert.equal(matches.length,12);
 assert.equal(filterMatches(matches,{status:'ongoing'}).length,8);
 assert.equal(filterMatches(matches,{status:'completed'}).length,4);
 assert.equal(filterMatches(matches,{tournament:'campus-cup',status:'all'}).length,4);
 assert.equal(filterMatches(matches,{status:'all',query:'Atlas Team'}).length,3);
 assert.equal(filterMatches(matches,{status:'all',query:'no such player'}).length,0);
 assert.equal(matchStatus(matches[0].pair),'Ongoing demo');assert.equal(matchStatus(matches[0].pair,{demo:false}),'Live');
});
test('competition upload updates only selected entrant and records readiness, file checks and bot version',()=>{
 const event=previewEvents().find(t=>t.phase==='preparation');const previous=event.players.find(p=>p.id==='atlas');
 const updated=saveEventBot(event,'atlas',{name:'new.py',language:'Python',fileChecks:'passed'});
 const current=updated.players.find(p=>p.id==='atlas');assert.equal(current.botName,'new.py');assert.equal(current.botVersion,1);assert.equal(current.fileChecks,'passed');assert.equal(current.botReady,true);assert.equal(previous.botName,'atlas_bot.py');
 assert.equal(updated.players.find(p=>p.id==='byte'),event.players.find(p=>p.id==='byte'));
});
