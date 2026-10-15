const {test}=require('node:test');const assert=require('node:assert/strict');
const Engine=require('../../logic/games/ottv2/engine');
const {resolveConfig,specification}=require('../../logic/games/registry');
const {freezeConfig,executionDeadline,settingsUpdate}=require('../platform/game-integration.cjs');
const {runMatch,playTurn}=require('../../logic/grader');
const {metadata}=require('../../logic/protocol');
function fakePlayer(answers){let i=0;const player={output:'',errors:'',child:{exitCode:null,killed:false,stdin:{write(){player.output+=answers[Math.min(i++,answers.length-1)]+'\n';}}}};return player;}
test('published game config, frozen jobs and settings agree on current rules',()=>{
 const spec=specification();assert.equal(spec.rulesVersion,'ottv2-rules-v1');assert.ok(!spec.maps.some(m=>m.id==='small-5'));
 const config=resolveConfig('standard-9',{moveTimeLimitMs:250,maxTurns:31},'bot');assert.equal(config.maxTurns,1620);assert.equal(config.timeTurnLimit,250);assert.equal(config.moveTimeLimitMs,250);
 const frozen=freezeConfig({mapId:'standard-9',moveTimeLimitMs:250});assert.equal(executionDeadline(frozen),880000);
 const change=settingsUpdate({gameId:'ottv2',mapId:'standard-9',moveTimeLimitMs:1000},{mapId:'large-13',firstSide:'white',maxTurns:31,moveTimeLimitMs:250});assert.equal(change.data.maxTurns,3380);assert.equal(change.revalidate,true);
 assert.throws(()=>resolveConfig('small-5',{},'bot'),{status:400});
});
test('polling cannot extend a turn and the next player receives a fresh clock',()=>{
 const realNow=Date.now;let now=100000;Date.now=()=>now;
 try{const game=new Engine();game.movePiece('b1','a2');now+=400;game.getPublicState();now+=700;assert.equal(game.getPublicState().status,'finished');assert.equal(game.winner,'white');
 const second=new Engine();second.movePiece('b1','a2');now+=200;second.movePiece('f7','e6');assert.equal(second.currentTurn,'white');assert.equal(second.whiteTimeMs,1000);
 }finally{Date.now=realNow;}
});
test('illegal output retries in the same turn before a legal move',async()=>{
 const game=new Engine({timeTurnLimit:100});const player=fakePlayer(['bad','a1 a1','b1 a2']);const result=await playTurn(player,game);assert.equal(result.invalidAttempts,2);assert.equal(game.turnsPlayed,1);assert.equal(game.currentTurn,'black');
});
test('infinite illegal output forfeits without consuming turns or flooding replay',async()=>{
 const game=new Engine({timeTurnLimit:30});const replay=await runMatch({matchId:'invalid-deadline',game,playerFactory:async()=>fakePlayer(['a1 a1']),playerStop:async()=>{}});
 assert.equal(replay.result.winner,'black');assert.equal(replay.result.reason,'move-timeout');assert.equal(replay.result.turns,0);assert.ok(replay.frames.length<=3);
});
test('rectangular board metadata contains finite dimensions and canonical goals',()=>{
 const game=new Engine({length:10,width:12,initialPieces:[{color:'white',type:'rock',square:'b10'},{color:'black',type:'paper',square:'j12'}]});const m=metadata(game);assert.equal(m.board.width,10);assert.equal(m.board.height,12);assert.deepEqual(m.board.goals,[{x:9,y:0},{x:0,y:11}]);assert.ok(!JSON.stringify(m).includes('null'));
});
test('piece-distance tie breaker measures distance to the enemy flag',()=>{
 const game=new Engine({initialPieces:[{color:'white',type:'rock',square:'b1'},{color:'black',type:'rock',square:'i7'}]});game.turnsPlayed=game.config.maxTurns;game.finishAtLimit();assert.equal(game.winner,'black');assert.equal(game.endReason,'move-limit-nearest-flag');
});
