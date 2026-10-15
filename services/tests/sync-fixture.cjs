const {digest}=require('../sync/bundle.cjs');
const {freezeConfig}=require('../platform/game-integration.cjs');
function fixture(){
 const config=freezeConfig({mapId:'standard-9',firstSide:'white',maxTurns:31,moveTimeLimitMs:2000});
 const part={match:{id:'MATCH-fixture',round:1,whiteId:'local-a',blackId:'local-b',whiteSubmissionId:'bot-a',blackSubmissionId:'bot-b',status:'finished',config,runId:'00000000-0000-0000-0000-000000000001',whiteBefore:1000,blackBefore:1000,whiteDelta:16,blackDelta:-16,score:1,result:{winner:'white',score:1},metadata:{gameId:'ottv2'},snapshot:{},revision:1},frames:[{seq:0,payload:{event:'start'}}]};
 const manifest={format:'bot-tournament-bundle',version:1,tournament:{id:'sync-fixture',name:'Offline Cup',description:'Fixture',phase:'finished',round:1,totalRounds:1,capacity:4000,gameId:'ottv2',gameConfig:{},mapId:'standard-9',firstSide:'white',maxTurns:31,moveTimeLimitMs:2000},gameIdentity:config._game,participants:[{id:'local-a',username:'alice',name:'Alice',rating:1016,games:1,lastDelta:16},{id:'local-b',username:'bob',name:'Bob',rating:984,games:1,lastDelta:-16}],submissions:['a','b'].map(s=>({id:'bot-'+s,userId:'local-'+s,filename:'bot.py',language:'python',sourceHash:'a'.repeat(64),version:1,status:'ready',createdAt:'2026-10-14T00:00:00.000Z'})),matches:[{id:part.match.id,digest:digest(part)}]};return {manifest,part};
}
module.exports={fixture};
