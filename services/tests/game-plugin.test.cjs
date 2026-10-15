const {test}=require('node:test'),assert=require('node:assert/strict');
const {registerGame}=require('../../logic/games/registry');
const {freezeConfig,resolveFrozen,normalizedResult}=require('../platform/game-integration.cjs');
const {pairEntries,resultScore,eloDelta}=require('../platform/tournament.cjs');
const plugin=require('../../samples/plugins/take-away.cjs');registerGame(plugin);
test('same pairing and rating logic runs a non-board game without engine or tournament changes',async()=>{
 const entries=['alice','bob'].map(userId=>({userId,user:{rating:1000}}));const [[a,b]]=pairEntries(entries,[],1);assert.equal(a.userId,'alice');assert.equal(b.userId,'bob');
 const frozen=freezeConfig({gameId:'take-away',gameConfig:{stones:7}});assert.equal(frozen._game.id,'take-away');assert.equal(frozen.boardSize,undefined);
 const {plugin,config}=resolveFrozen(frozen);let stopped=0;
 const replay=await plugin.run({id:'fixture',bots:[{source:'1',language:'python'},{source:'1',language:'python'}],config,factory:async()=>({choose:async()=>1}),stop:async()=>stopped++});
 const score=resultScore(normalizedResult(replay.result,frozen));assert.equal(score,1);assert.equal(eloDelta(1000,1000,score),16);assert.equal(stopped,2);assert.equal(replay.frames.at(-1).stones,0);
});
test('frozen library mismatches and malformed scores are rejected',()=>{const frozen=freezeConfig({mapId:'standard-9',firstSide:'white',maxTurns:31,moveTimeLimitMs:2000});assert.equal(normalizedResult({winner:'black'},frozen).score,0);assert.throws(()=>resolveFrozen({...frozen,_game:{...frozen._game,rulesVersion:'other'}}),/identity differs/);assert.throws(()=>resultScore({score:2}));});
