import test from 'node:test';import assert from 'node:assert/strict';
import {motionTiming,transitionPieces} from './motion.js';
test('each playback speed finishes movement before the next frame',()=>{
 for(const speed of [.5,1,2,4]){const t=motionTiming(speed);assert.ok(t.durationMs<t.intervalMs);assert.equal(t.intervalMs,900/speed);}assert.equal(motionTiming(1).durationMs,720);
});
test('losing attacker stays rendered while moving into the defending square',()=>{
 const before=[{id:'a',x:3,y:5,type:'rock',side:'white'},{id:'d',x:4,y:4,type:'paper',side:'black'}];
 const result=transitionPieces(before,[before[1]],{from:'d4',to:'e5'},9,9);
 const attacker=result.find(p=>p.id==='a');assert.equal(attacker.exiting,true);assert.deepEqual([attacker.x,attacker.y],[4,4]);assert.equal(result.find(p=>p.id==='d').exiting,false);
});
test('defeated defender fades in place and timeline jumps do not retain capture ghosts',()=>{
 const before=[{id:'a',x:3,y:5},{id:'d',x:4,y:4}],next=[{id:'a',x:4,y:4}];
 const result=transitionPieces(before,next,{from:'d4',to:'e5'},9,9);assert.equal(result.find(p=>p.id==='d').exiting,true);assert.deepEqual(transitionPieces(before,next,{},9,9,false),[{...next[0],exiting:false}]);
});
