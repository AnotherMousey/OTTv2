const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const crypto=require('node:crypto');
const enabled=process.env.OTT_DAILY_DB_TEST==='1';
if(enabled && !/_test$/.test(new URL(process.env.DATABASE_URL).pathname))throw Error('Use a dedicated database whose name ends with _test.');
test('real SQL: concurrent schedulers, worker recovery, privacy, deterministic publication and multiple days',{skip:!enabled},async t=>{
 const {prisma:db}=require('../shared/db.cjs');const {createApp}=require('../api/index.cjs');
 const scheduler=require('../platform/daily-tournament.cjs'),queue=require('../worker/queue.cjs'),p=require('../platform/daily-policy.cjs');
 const {digest}=require('../shared/domain.cjs');const suffix=crypto.randomBytes(4).toString('hex');
 const ids=['j','a','b','c'].map(v=>v+suffix),[judge,...players]=ids,tid='test-'+suffix;
 const tokens=new Map(ids.map(id=>[id,'test-token-'+id]));
 let server;
 t.after(async()=>{
  if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
  await db.job.deleteMany({where:{match:{tournamentId:tid}}});
  await db.entry.deleteMany({where:{tournamentId:tid}});
  await db.match.deleteMany({where:{tournamentId:tid}});
  await db.submission.deleteMany({where:{tournamentId:tid}});
  await db.dailyBatch.deleteMany({where:{tournamentId:tid}});
  await db.tournament.deleteMany({where:{id:tid}});await db.audit.deleteMany({where:{tournamentId:tid}});
  await db.session.deleteMany({where:{userId:{in:ids}}});await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();
 });
 await db.user.createMany({data:ids.map((id,i)=>({id,username:id,name:id,passwordHash:'test-only',role:i?'player':'judge',rating:1477}))});
 await db.session.createMany({data:ids.map(id=>({userId:id,tokenHash:digest(tokens.get(id)),expiresAt:new Date(Date.now()+3600000)}))});
 await db.tournament.create({data:{id:tid,name:'SQL daily fixture',description:'Isolated test only',ownerId:judge,format:p.FORMAT,startDate:'2026-10-20',endDate:'2026-10-21',totalRounds:2,gameId:'ottv2'}});
 const bots=[];
 for(const userId of players){const bot=await db.submission.create({data:{userId,tournamentId:tid,filename:'bot.py',language:'python',source:'original',sourceHash:digest('original'),status:'ready',readyAt:p.instant('2026-10-20','20:10'),createdAt:p.instant('2026-10-20','20:00')}});bots.push(bot);await db.entry.create({data:{userId,tournamentId:tid,status:'accepted',activeSubmissionId:bot.id}});}
 const at=(day,time)=>p.instant('2026-10-'+day,time);
 // Race several scheduler replicas. One durable batch, six unique matches/jobs.
 await Promise.all(Array.from({length:6},()=>scheduler.tickEvent(tid,at('20','21:00'))));
 assert.equal(await db.dailyBatch.count({where:{tournamentId:tid}}),1);
 assert.equal(await db.match.count({where:{tournamentId:tid}}),6);
 assert.equal(await db.job.count({where:{match:{tournamentId:tid}}}),6);
 const frozen=await db.dailyBatch.findFirst({where:{tournamentId:tid}});
 assert.equal(frozen.bots[0].submissionId,bots.find(b=>b.userId===frozen.bots[0].userId).id);
 const newer=await db.submission.create({data:{userId:players[0],tournamentId:tid,filename:'new.py',language:'python',source:'new',sourceHash:digest('new'),version:2,status:'ready',readyAt:at('20','21:45'),createdAt:at('20','21:40')}});
 await db.entry.update({where:{tournamentId_userId:{tournamentId:tid,userId:players[0]}},data:{activeSubmissionId:newer.id}});
 assert.equal(await db.match.count({where:{batchId:frozen.id,OR:[{whiteSubmissionId:newer.id},{blackSubmissionId:newer.id}]}}),0);
 // Reclaim a lost worker lease. Old claim cannot finish after recovery.
 const lost=await queue.claim();assert.ok(lost);
 await db.job.update({where:{id:lost.id},data:{leaseUntil:new Date(Date.now()-1000)}});await queue.recover();
 assert.equal(await queue.finish(lost,{result:{winner:'white'},metadata:{}}),false);
 await db.job.update({where:{id:lost.id},data:{availableAt:new Date(0)}});
 const claims=await Promise.all(Array.from({length:6},()=>queue.claim()));
 assert.equal(new Set(claims.map(j=>j.id)).size,6);
 for(const job of [...claims].reverse())assert.equal(await queue.finish(job,{result:{winner:'white'},metadata:{test:true}}),true);
 const before=await db.user.findMany({where:{id:{in:players}}});assert.ok(before.every(u=>u.rating===1477&&u.games===0));
 server=createApp().listen(0,'127.0.0.1');await once(server,'listening');
 const get=async(path,as)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}`+path,{headers:as?{Authorization:'Bearer '+tokens.get(as)}:{}});return {status:r.status,body:await r.json()};};
 const mid=claims[0].matchId;
 for(const as of [undefined,players[0]])for(const tail of ['','/live','/replay'])assert.equal((await get('/api/matches/'+mid+tail,as)).status,404);
 assert.equal((await get('/api/matches/'+mid,judge)).status,200);
 let response=await get('/api/matches?status=all&tournamentId='+tid);assert.equal(response.body.total,0);
 response=await get('/api/tournaments/'+tid+'/rounds');assert.equal(response.body.summary[0].total,0);
 response=await get('/api/tournaments/'+tid+'/rankings');assert.ok(response.body.rankings.every(r=>r.rating===1000&&r.games===0));
 // Private Elo can finish early. It still must not become public before 21:30.
 for(let i=0;i<4;i++)await scheduler.tickEvent(tid,at('20','21:29'));
 assert.equal((await db.dailyBatch.findUnique({where:{id:frozen.id}})).state,'ready');
 assert.equal((await db.tournament.findUnique({where:{id:tid}})).publishedBatchId,null);
 await Promise.all(Array.from({length:4},()=>scheduler.tickEvent(tid,at('20','21:30'))));
 assert.equal((await db.tournament.findUnique({where:{id:tid}})).phase,'live');
 assert.equal(await db.audit.count({where:{tournamentId:tid,action:'daily.publish'}}),1);
 response=await get('/api/tournaments/'+tid+'/rankings');assert.ok(response.body.rankings.every(r=>r.games===4&&r.points===2));
 response=await get('/api/matches?status=all&tournamentId='+tid);assert.equal(response.body.total,6);
 response=await get('/api/tournaments/'+tid);assert.equal(response.body.pairs.length,6);assert.ok(response.body.players.every(r=>r.games===4));
 // Missed next-day trigger uses the pre-cutoff history, including the newer bot.
 for(let i=0;i<3;i++)await scheduler.tickEvent(tid,at('21','21:45'));
 const day2=await db.dailyBatch.findFirst({where:{tournamentId:tid,date:'2026-10-21'}});
 assert.ok(day2.bots.some(b=>b.submissionId===newer.id));
 assert.equal(await db.match.count({where:{batchId:day2.id}}),6);
 // A failed infrastructure job holds the entire second batch private until retry.
 const failJob=await queue.claim();
 await db.job.update({where:{id:failJob.id},data:{attempts:3}});await queue.failure(failJob,'isolated infrastructure failure');
 for(let i=0;i<5;i++){const job=await queue.claim();await queue.finish(job,{result:{winner:'black'},metadata:{}});}
 await scheduler.tickEvent(tid,at('21','22:00'));assert.equal((await db.dailyBatch.findUnique({where:{id:day2.id}})).publishedAt,null);
 await db.job.update({where:{id:failJob.id},data:{status:'queued',attempts:0,availableAt:new Date(0)}});
 const retried=await queue.claim();await queue.finish(retried,{result:{winner:'black'},metadata:{}});
 for(let i=0;i<5;i++)await scheduler.tickEvent(tid,at('21','22:05'));
 const final=await db.tournament.findUnique({where:{id:tid}});assert.equal(final.phase,'finished');assert.equal(final.publishedBatchId,day2.id);
 response=await get('/api/tournaments/'+tid+'/rankings');assert.ok(response.body.rankings.every(r=>r.games===8&&r.points===4));
 const last=await db.user.findMany({where:{id:{in:players}}});assert.ok(last.every(u=>u.rating===1477&&u.games===0));
 // Repeated recovery/publication calls cannot change the finalized snapshot.
 const exported=await get('/api/tournaments/'+tid+'/export',judge);assert.equal(exported.status,200);assert.equal(exported.body.version,2);assert.ok(exported.body.participants.every(p=>p.games===8&&p.rating!==1477));
 const ratings=await db.dailyStanding.findMany({where:{batchId:day2.id},orderBy:{userId:'asc'}});
 await scheduler.tickEvent(tid,at('21','23:00'));assert.deepEqual(await db.dailyStanding.findMany({where:{batchId:day2.id},orderBy:{userId:'asc'}}),ratings);
 assert.equal(await db.audit.count({where:{tournamentId:tid,action:'daily.publish'}}),2);
});
