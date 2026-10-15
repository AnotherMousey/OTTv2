const Engine=require('./engine');
const {normalizeConfig}=require('./config');
const {runMatch,requestMove}=require('../../grader');
const fs=require('node:fs'),path=require('node:path');
const identity={id:'ottv2',libraryVersion:'1',rulesVersion:'ottv2-configurable-v2',protocolVersion:2,rendererVersion:'1'};
function maps(){const dir=process.env.GAME_MAP_DIR||path.resolve(__dirname,'../../../samples/maps');return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort().map(file=>({id:file.replace(/\.json$/,''),config:JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'))})):[];}
function configure(input={},mode='bot'){
 const {mapId,...config}=input;let base={};if(mapId){const map=maps().find(m=>m.id===mapId);if(!map)throw Error('Map not found.');base=map.config;}
 return normalizeConfig({...base,...config},mode);
}
function score(result){if(!result||![null,'white','black'].includes(result.winner))throw Error('Invalid OTTv2 result.');return result.winner==='white'?1:result.winner==='black'?0:.5;}
async function validate({bot,id,config,factory,stop,signal}){
 const game=new Engine({...config,firstSide:'white'},'bot');let player;
 try{if(signal?.aborted)throw Error('Execution cancelled.');player=await factory(bot.source,bot.language,id,'white');const move=await requestMove(player,game.serializeBotState('white'),game.config.moveTimeLimitMs);game.movePiece(move.from,move.to);return {detail:'Compiled and produced a legal initial move for the configured map.'};}finally{await stop(player);}
}
async function run({id,bots,config,factory,stop,onFrame,signal}){const replay=await runMatch({matchId:id,whiteSource:bots[0].source,blackSource:bots[1].source,whiteLanguage:bots[0].language,blackLanguage:bots[1].language,game:new Engine(config,'bot'),playerFactory:factory,playerStop:stop,onFrame,signal});return {...replay,result:{...replay.result,score:score(replay.result)}};}
function specification(){return {protocolVersion:2,gameId:'ottv2',rendererVersion:'1',rulesVersion:identity.rulesVersion,title:'OTTv2',board:{kind:'grid',minSize:5,maxSize:26},pieceTypes:['rock','paper','scissors'],players:['white','black'],languages:['java','cpp','python'],defaultBotConfig:normalizeConfig({},'bot'),maps:maps(),rules:{movement:'one-square-eight-directions',capture:'rock > scissors > paper > rock; same type blocks',victory:'Reach opponent source or eliminate pieces according to config',limit:'More remaining pieces wins; equal counts draw',invalidBotMove:'Consumes one turn; room invalid moves are rejected without consuming a turn'}};}
module.exports={identity,configure,score,validate,run,specification,create:(config={},mode='room')=>new Engine(config,mode),deadlineMs:config=>70000+config.maxTurns*(config.moveTimeLimitMs+250)};
