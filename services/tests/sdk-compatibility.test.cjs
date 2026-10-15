const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {runtimes}=require('../../logic/runtime');const {compilePlayer,stopPlayer,runMatch}=require('../../logic/grader');const {resolveGame}=require('../../logic/games/registry');
const Engine=require('../../logic/games/ottv2/engine');
const configuration={length:10,width:12,timeTurnLimit:2000,initialPieces:[{color:'white',type:'paper',square:'b10'},{color:'black',type:'rock',square:'c11'}]};
const sources={
 python:'def choose_move(state):\n    assert state.getLength() == 10 and state.getWidth() == 12\n    assert state.getTeam().getFlag().getXCor() == 0\n    return ("b10", "c11")\n',
 cpp:'#include "ottv2.hpp"\nottv2::Move choose_move(const ottv2::State& state) { if(state.getWidth()!=12 || state.getTeam().getFlag().getXCor()!=0) throw std::runtime_error("state mismatch"); return {"b10","c11"}; }',
 java:'import ottv2.sdk.*; public class RobotPlayer { public static void run(RobotController rc) throws Exception { while(true) { if(rc.getGameEngine().getWidth()!=12 || rc.getTeam().getFlag().getXCor()!=0 || rc.getEnemyTeam().getFlag().getYCor()!=11) throw new RuntimeException("state mismatch"); rc.submitMove(new Move("b10","c11")); rc.yieldTurn(); } } }'
};
for(const language of ['python','cpp','java']){
 test(language+' current SDK executes a real rectangular match and decodes flags',{skip:!runtimes()[language].available},async()=>{
  const replay=await runMatch({matchId:'sdk-'+language,game:new Engine(configuration,'bot'),whiteSource:sources[language],blackSource:sources[language],whiteLanguage:language,blackLanguage:language});
  assert.equal(replay.result.winner,'white');assert.equal(replay.result.reason,'all-pieces-eliminated');assert.equal(replay.result.turns,1);assert.equal(replay.board.width,10);assert.equal(replay.board.height,12);
 });
 test(language+' shipped legacy sample compiles and makes a legal initial move',{skip:!runtimes()[language].available},async()=>{
  const filename={python:'simple_bot.py',cpp:'simple_bot.cpp',java:'RobotPlayer.java'}[language];const source=fs.readFileSync(path.resolve(__dirname,'../../samples/bots',filename),'utf8');
  const result=await resolveGame().validate({bot:{source,language},id:'legacy-'+language,config:configuration,factory:compilePlayer,stop:stopPlayer});assert.match(result.detail,/legal initial move/);
 });
}
