// This is the only platform boundary allowed to know legacy OTTv2 settings.
const {resolveGame}=require('../../logic/games/registry');
function freezeConfig(event,{validation=false,randomInt=require('node:crypto').randomInt}={}){
 const plugin=resolveGame(event.gameId||'ottv2');
 const input=plugin.identity.id==='ottv2'?{mapId:event.mapId,firstSide:validation?'white':event.firstSide==='random'?(randomInt(2)?'white':'black'):event.firstSide,timeTurnLimit:event.moveTimeLimitMs??1000}:event.gameConfig||{};
 let config;try{config=plugin.configure(input,'bot');}catch(error){error.status=400;throw error;}return {...config,_game:{...plugin.identity}};
}
function resolveFrozen(config){
 const identity=config?._game;const plugin=resolveGame(identity?.id||'ottv2');
 if(identity&&Object.keys(plugin.identity).some(key=>identity[key]!==plugin.identity[key]))throw Error('Installed game identity differs from frozen match. Install the exact library version.');
 const {_game,...input}=config||{};return {plugin,config:plugin.configure(input,'bot')};
}
function normalizedResult(result,config){const {plugin}=resolveFrozen(config);return {...result,score:plugin.score(result)};}
function executionDeadline(config){const resolved=resolveFrozen(config);const ms=resolved.plugin.deadlineMs(resolved.config);if(!Number.isFinite(ms)||ms<1000||ms>86400000)throw Error('Game execution deadline must be 1 second–24 hours.');return ms;}
function settingsUpdate(event,body){
 const {int,text,fail}=require('../shared/domain.cjs');
 if(event.gameId!=='ottv2'){const data={gameConfig:body.gameConfig||{}};freezeConfig({...event,...data});return {data,revalidate:true,generic:true};}
 const data={mapId:text(body.mapId,3,32,'Map'),firstSide:body.firstSide,moveTimeLimitMs:int(body.moveTimeLimitMs??event.moveTimeLimitMs,100,10000,'Thinking limit (ms)')};
 if(!['white','black','random'].includes(data.firstSide))fail(400,'First side must be white, black or random.');
 const config=freezeConfig({...event,...data,firstSide:data.firstSide==='random'?'white':data.firstSide});data.maxTurns=config.maxTurns;return {data,revalidate:data.mapId!==event.mapId||data.moveTimeLimitMs!==event.moveTimeLimitMs,generic:false};
}
module.exports={settingsUpdate,freezeConfig,resolveFrozen,normalizedResult,executionDeadline};
