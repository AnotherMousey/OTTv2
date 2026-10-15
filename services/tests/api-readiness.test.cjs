const {test}=require('node:test'),assert=require('node:assert/strict');
const {prisma}=require('../shared/db.cjs'),{createApp}=require('../api/index.cjs');
test('API exposes game specification and reports missing migrated schema without false readiness',async()=>{
 const saved={user:prisma.user.findFirst,tournament:prisma.tournament.findFirst,list:prisma.tournament.findMany,count:prisma.tournament.count,receipt:prisma.syncReceipt.findFirst,part:prisma.syncPart.findFirst};
 const server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const spec=await fetch(base+'/api/games/current');assert.equal(spec.status,200);assert.equal((await spec.json()).defaultBotConfig.maxTurns,1620);
  prisma.tournament.count=async()=>0;prisma.user.findFirst=async()=>null;prisma.tournament.findFirst=async()=>{throw Object.assign(Error('missing column'),{code:'P2022'});};prisma.tournament.findMany=async()=>{throw Object.assign(Error('missing column'),{code:'P2022'});};
  let response=await fetch(base+'/ready');assert.equal(response.status,503);assert.match((await response.json()).error,/migrations/);
  response=await fetch(base+'/api/tournaments');assert.equal(response.status,503);assert.equal((await response.json()).code,'DATABASE_SCHEMA_OUTDATED');
  prisma.tournament.findFirst=async()=>null;prisma.syncReceipt.findFirst=async()=>null;prisma.syncPart.findFirst=async()=>null;
  response=await fetch(base+'/ready');assert.equal(response.status,200);
 }finally{prisma.user.findFirst=saved.user;prisma.tournament.findFirst=saved.tournament;prisma.tournament.findMany=saved.list;prisma.tournament.count=saved.count;prisma.syncReceipt.findFirst=saved.receipt;prisma.syncPart.findFirst=saved.part;await new Promise(r=>server.close(r));await prisma.$disconnect();}
});
