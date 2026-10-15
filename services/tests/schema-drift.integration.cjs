// Alters ONLY a disposable _test database, restoring the removed column afterward.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {execFile}=require('node:child_process');
const run=require('node:util').promisify(execFile);
const path=require('node:path');
test('applied migration history cannot hide drift; readiness and CLI identify the missing column',{
 skip:!process.env.TEST_DATABASE_URL,
},async()=>{
 assert.match(new URL(process.env.TEST_DATABASE_URL).pathname,/_test$/);
 process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
 const {prisma}=require('../shared/db.cjs');
 const {checkDatabaseSchema}=require('../shared/readiness.cjs');
 const {createApp}=require('../api/index.cjs');
 const server=createApp().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const cwd=path.resolve(__dirname,'../..');
 let dropped=false;
 try{
  await checkDatabaseSchema(prisma);
  await prisma.$executeRawUnsafe('ALTER TABLE Tournament DROP COLUMN capacity');dropped=true;
  // Reproduce the exact old diagnostic's false success.
  await prisma.user.findFirst({select:{id:true}});
  await prisma.tournament.findFirst({select:{id:true,gameId:true,gameConfig:true,moveTimeLimitMs:true}});
  await prisma.syncReceipt.findFirst({select:{tournamentId:true,digest:true}});
  await prisma.syncPart.findFirst({select:{tournamentId:true,matchId:true}});
  const history=await run(process.execPath,['node_modules/prisma/build/index.js','migrate','status'],{cwd,env:process.env});
  assert.match(history.stdout,/up to date/);
  const drift=await run(process.execPath,['node_modules/prisma/build/index.js','migrate','diff','--from-schema-datasource','prisma/schema.prisma','--to-schema-datamodel','prisma/schema.prisma','--script'],{cwd,env:process.env});
  assert.match(drift.stdout,/ADD COLUMN `capacity`/);
  await assert.rejects(prisma.tournament.findMany(),{code:'P2022'});
  await assert.rejects(checkDatabaseSchema(prisma),error=>error.missing.some(item=>item.table==='Tournament'&&item.column==='capacity'));
  assert.equal((await fetch(base+'/ready')).status,503);
  assert.equal((await fetch(base+'/api/tournaments')).status,503);
  await assert.rejects(run(process.execPath,['scripts/check-deployment.cjs'],{cwd,env:process.env}),error=>{
   assert.match(error.stderr,/capacity/);assert.equal(error.code,1);return true;
  });
  await prisma.$executeRawUnsafe('ALTER TABLE Tournament ADD COLUMN capacity INTEGER NOT NULL DEFAULT 4000');dropped=false;
  assert.equal((await fetch(base+'/ready')).status,200);
  assert.equal((await fetch(base+'/api/tournaments')).status,200);
  const checked=await run(process.execPath,['scripts/check-deployment.cjs','--api',base],{cwd,env:process.env});
  assert.match(checked.stdout,/deployment.remote/);assert.match(checked.stdout,/checks passed/);
 }finally{
  if(dropped)await prisma.$executeRawUnsafe('ALTER TABLE Tournament ADD COLUMN capacity INTEGER NOT NULL DEFAULT 4000');
  await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();
 }
});
