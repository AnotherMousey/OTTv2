// Requires a migrated disposable database; never connects to production by default.
const {test}=require('node:test'),assert=require('node:assert/strict');
test('MySQL/API interrupted sync, concurrent duplicate parts, conflict rollback and archive-only ratings',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 assert.match(new URL(process.env.TEST_DATABASE_URL).pathname,/_test$/);process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
 const {prisma}=require('../shared/db.cjs'),{createApp}=require('../api/index.cjs'),{passwordHash}=require('../shared/domain.cjs'),{fixture}=require('./sync-fixture.cjs');
 for(const table of ['syncPart','syncReceipt','frame','job','entry','submission','match','tournament','session','audit','rateBucket','user'])await prisma[table].deleteMany();
 const hash=await passwordHash('integration-password-123');const judge=await prisma.user.create({data:{username:'judge',name:'Judge',passwordHash:hash,role:'judge'}});const users=[];
 for(const username of ['alice','bob'])users.push(await prisma.user.create({data:{username,name:username,passwordHash:hash}}));
 const server=createApp().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 let token;const call=async(route,body)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 try{
 token=(await call('/api/auth/login',{username:'judge',password:'integration-password-123'})).data.token;
 const {manifest,part}=fixture(),accountMap={'local-a':users[0].id,'local-b':users[1].id},before=await prisma.user.findMany({orderBy:{id:'asc'}});
 assert.equal((await call('/api/sync/begin',{manifest,accountMap})).status,200);assert.equal((await call('/api/sync/'+manifest.tournament.id+'/complete',{})).status,409);
 const replies=await Promise.all([call('/api/sync/'+manifest.tournament.id+'/part',{part}),call('/api/sync/'+manifest.tournament.id+'/part',{part})]);assert.ok(replies.every(r=>r.status===200));assert.equal(await prisma.match.count(),1);assert.equal(await prisma.frame.count(),1);
 const bad=structuredClone(manifest);bad.tournament.name='Conflict';assert.equal((await call('/api/sync/begin',{manifest:bad,accountMap})).status,409);
 assert.equal((await call('/api/sync/'+manifest.tournament.id+'/complete',{})).status,200);assert.equal((await call('/api/sync/begin',{manifest,accountMap})).data.complete,true);
 assert.deepEqual(await prisma.user.findMany({orderBy:{id:'asc'}}),before);assert.equal((await prisma.tournament.findUnique({where:{id:manifest.tournament.id}})).ownerId,judge.id);
 const replay=await fetch(base+'/api/matches/'+part.match.id+'/replay');assert.equal(replay.status,200);assert.equal((await replay.json()).frames.length,1);
 }finally{await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();}
});
