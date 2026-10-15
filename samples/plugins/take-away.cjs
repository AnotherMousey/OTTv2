// A non-board integration fixture. Production use needs a matching bot SDK/renderer.
// factory below must implement the plugin's raw input protocol; OTTv2 SDK is not compatible.
const identity={id:'take-away',libraryVersion:'1',rulesVersion:'normal-play-v1',protocolVersion:1,rendererVersion:'counter-v1'};
function configure(input={}){const stones=input.stones??9;if(!Number.isInteger(stones)||stones<1||stones>100)throw Error('stones must be 1–100.');return {stones};}
function score(result){if(![0,.5,1].includes(result?.score))throw Error('Invalid take-away score.');return result.score;}
async function run({id,bots,config,factory,stop,onFrame=async()=>{},signal}){
 const players=[],frames=[];let stones=config.stones,slot=0;
 try{
  for(let i=0;i<2;i++)players.push(await factory(bots[i].source,bots[i].language,id,String(i)));
  const publish=async()=>{const frame={stones,slot};frames.push(frame);await onFrame(frame,{gameId:identity.id,gameIdentity:identity,config});};await publish();
  while(stones>0){if(signal?.aborted)throw Error('Cancelled.');const move=await players[slot].choose(stones);if(!Number.isInteger(move)||move<1||move>3||move>stones)return {frames,result:{score:slot===0?0:1,reason:'invalid'}};stones-=move;await publish();if(stones===0)return {frames,result:{score:slot===0?1:0,reason:'last-stone'}};slot=1-slot;}
 }finally{await Promise.all(players.map(stop));}
}
async function validate({bot,id,config,factory,stop}){let player;try{player=await factory(bot.source,bot.language,id,'0');const n=await player.choose(config.stones);if(!Number.isInteger(n)||n<1||n>Math.min(3,config.stones))throw Error('Invalid take-away move.');return {detail:'Valid initial removal.'};}finally{await stop(player);}}
module.exports={identity,configure,score,run,validate,deadlineMs:()=>60000,specification:()=>({gameId:identity.id,title:'Take away',rendererVersion:'counter-v1',protocolVersion:1})};
