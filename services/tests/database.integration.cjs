// Destructive integration checks. Use an EMPTY disposable database ending in _test.
const {test}=require('node:test');const assert=require('node:assert/strict');
const {prisma}=require('../shared/db.cjs');const queue=require('../worker/queue.cjs');const {passwordHash}=require('../shared/domain.cjs');const {createApp}=require('../api/index.cjs');
test('MySQL auth, tournament workflow, leases and exactly-once ratings',async()=>{
assert.match(new URL(process.env.DATABASE_URL).pathname,/_test$/,'Only a disposable _test database is allowed.');
for(const table of ['frame','job','entry','submission','match','tournament','session','audit','rateBucket','user'])await prisma[table].deleteMany();
const hash=await passwordHash('integration-password-123');const users={};for(const [username,role] of [['judge','judge'],['otherjudge','judge'],['alice','player'],['bob','player']])users[username]=await prisma.user.create({data:{username,name:username,passwordHash:hash,role}});
const server=await new Promise(resolve=>{const s=createApp().listen(0,'127.0.0.1',()=>resolve(s));});const base='http://127.0.0.1:'+server.address().port;const tokens={};
const call=async(path,user,body,method=body===undefined?'GET':'POST')=>{const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+tokens[user]}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,data:await response.json()};};
try{
assert.equal((await call('/api/auth/login',null,{username:'alice',password:'bad'})).status,401);
assert.equal((await call('/health')).data.apiVersion,'history-actions-v2');const preflight=await fetch(base+'/api/practice/history/delete',{method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});assert.equal(preflight.status,204);assert.match(preflight.headers.get('access-control-allow-methods'),/POST/);
for(const name of Object.keys(users)){const r=await call('/api/auth/login',null,{username:name,password:'integration-password-123'});assert.equal(r.status,200);tokens[name]=r.data.token;}
assert.equal((await call('/api/tournaments','alice',{name:'Unauthorized'})).status,403);
const created=await call('/api/tournaments','judge',{name:'Integration Cup',totalRounds:1,capacity:2});assert.equal(created.status,201);const id=created.data.id;const path='/api/tournaments/'+id;
assert.equal((await call(path+'/advance','otherjudge',{})).status,403);
const joins=await Promise.all([call(path+'/join','alice',{}),call(path+'/join','alice',{}),call(path+'/join','bob',{})]);assert.ok(joins.every(r=>r.status===200));assert.equal(await prisma.entry.count(),2);
assert.equal((await call(path+'/advance','judge',{})).status,409);
assert.equal((await call(path+'/review','judge',{all:true,accept:true})).status,200);
assert.equal((await call(path+'/advance','judge',{})).status,200);
assert.equal((await call(path+'/join','alice',{})).status,409);
for(const name of ['alice','bob'])assert.equal((await call(path+'/bot',name,{filename:'bot.py',language:'python',source:'print("fixture")'})).status,202);
assert.equal((await call(path+'/advance','judge',{})).status,409);
const claimed=(await Promise.all([queue.claim(),queue.claim(),queue.claim()])).filter(Boolean);while(claimed.length<2){const next=await queue.claim();assert.ok(next);claimed.push(next);}assert.equal(claimed.length,2);assert.equal(new Set(claimed.filter(Boolean).map(j=>j.id)).size,2);
for(const j of claimed.filter(Boolean))assert.equal(await queue.finish(j,{type:'validated'}),true);
assert.equal((await call(path+'/settings','judge',{mapId:'small-5',firstSide:'white',maxTurns:31,moveTimeLimitMs:250})).status,200);assert.equal((await call(path+'/advance','judge',{})).status,409);let validation;while((validation=await queue.claim()))await queue.finish(validation,{type:'validated'});
const directory=await call('/api/tournaments?phase=preparation');assert.equal(directory.data.total,1);assert.deepEqual(directory.data.events[0].counts,{accepted:2,pending:0,botsReady:2});
assert.equal((await call(path+'/advance','judge',{})).status,200);
assert.equal((await call(path+'/bot','alice',{filename:'bot.py',language:'python',source:'print(1)'})).status,409);
assert.equal((await call(path+'/advance','judge',{})).status,200);
const job=await queue.claim();assert.equal(job.type,'match');assert.equal((await prisma.match.findUnique({where:{id:job.matchId}})).config.moveTimeLimitMs,250);assert.equal(await queue.append(job,{seq:0,frame:{event:'match-start',board:[]},metadata:{format:'ottv2-log-v1'}}),true);
let r=await call('/api/matches/'+job.matchId+'/live');assert.equal(r.status,200);assert.equal(r.data.frames.length,1);const etagResponse=await fetch(base+'/api/matches/'+job.matchId+'/live');const etag=etagResponse.headers.get('etag');assert.equal((await fetch(base+'/api/matches/'+job.matchId+'/live',{headers:{'If-None-Match':etag}})).status,304);
await prisma.job.update({where:{id:job.id},data:{leaseUntil:new Date(Date.now()-1000)}});await queue.recover();assert.equal(await queue.finish(job,{result:{winner:'white'},metadata:{}}),false);
await prisma.job.update({where:{id:job.id},data:{availableAt:new Date(0)}});const retry=await queue.claim();assert.notEqual(retry.claim,job.claim);assert.equal(await queue.append(job,{seq:1,frame:{}}),false);
await queue.append(retry,{seq:0,frame:{event:'retry-start'}});
const batch=Array.from({length:20},(_,i)=>({seq:i+1,frame:{event:'move-'+(i+1)}}));assert.equal(await queue.appendBatch(retry,batch),true);assert.equal(await queue.appendBatch(retry,batch),true);await queue.append(retry,{seq:0,frame:{event:'retry-start'}});assert.equal((await prisma.match.findUnique({where:{id:retry.matchId}})).snapshot.event,'move-20');assert.equal(await prisma.frame.count({where:{matchId:retry.matchId,runId:retry.claim}}),21);const event={result:{winner:'white',reason:'fixture'},metadata:{format:'ottv2-log-v1'}};
const finished=await Promise.all([queue.finish(retry,event),queue.finish(retry,event)]);assert.equal(finished.filter(Boolean).length,1);
const match=await prisma.match.findUnique({where:{id:job.matchId}});const winner=await prisma.user.findUnique({where:{id:match.whiteId}}),loser=await prisma.user.findUnique({where:{id:match.blackId}});assert.equal(winner.rating,1016);assert.equal(loser.rating,984);assert.equal(winner.games,1);assert.equal(loser.games,1);
r=await call('/api/matches/'+job.matchId+'/live?runId='+job.claim+'&after=10');assert.equal(r.data.reset,true);assert.equal(r.data.frames.length,21);
assert.equal((await call(path+'/advance','judge',{})).status,200);assert.equal((await call(path)).data.phase,'finished');assert.equal((await call('/api/matches?status=completed')).data.total,1);
const practice=await call('/api/practice','alice',{white:{filename:'w.py',language:'python',source:'print(1)'},black:{filename:'b.py',language:'python',source:'print(1)'},maxTurns:1});assert.equal(practice.status,202);assert.equal((await call('/api/matches/'+practice.data.id,'bob')).status,403);assert.equal((await call('/api/matches/'+practice.data.id,'alice')).status,200);
// Two match publishers run concurrently, including duplicate/out-of-order delivery.
const bobPractice=await call('/api/practice','bob',{white:{source:'print(1)',language:'python'},black:{source:'print(1)',language:'python'},maxTurns:1});assert.equal(bobPractice.status,202);
const activeJobs=[await queue.claim(),await queue.claim()];const aliceJob=activeJobs.find(j=>j.matchId===practice.data.id),bobJob=activeJobs.find(j=>j.matchId===bobPractice.data.id);assert.ok(aliceJob&&bobJob);
await Promise.all(activeJobs.map(j=>queue.appendBatch(j,Array.from({length:20},(_,seq)=>({seq,frame:{event:'concurrent-'+seq}})))));
await Promise.all([queue.appendBatch(aliceJob,[{seq:20,frame:{event:'latest'}}]),queue.appendBatch(aliceJob,[{seq:0,frame:{event:'duplicate'}}])]);
assert.equal((await prisma.match.findUnique({where:{id:aliceJob.matchId}})).snapshot.event,'latest');
const aliceSources=await prisma.match.findUnique({where:{id:aliceJob.matchId}});
assert.equal((await call('/api/practice/history/'+bobPractice.data.id,'alice',undefined,'DELETE')).status,404);
assert.equal((await call('/api/practice/history/'+aliceJob.matchId,'judge',undefined,'DELETE')).status,403);
assert.equal((await call('/api/practice/history/'+aliceJob.matchId,null,undefined,'DELETE')).status,401);
const [removed]=await Promise.all([call('/api/practice/history/'+aliceJob.matchId+'/delete','alice',{}),queue.append(aliceJob,{seq:21,frame:{event:'racing deletion'}})]);
assert.equal(removed.status,200);assert.equal(removed.data.deleted,1);
assert.equal(await prisma.frame.count({where:{matchId:aliceJob.matchId}}),0);assert.equal(await prisma.job.count({where:{matchId:aliceJob.matchId}}),0);
assert.equal(await prisma.submission.count({where:{id:{in:[aliceSources.whiteSubmissionId,aliceSources.blackSubmissionId]}}}),0);
assert.equal(await queue.append(aliceJob,{seq:22,frame:{event:'stale'}}),false);assert.equal(await queue.finish(aliceJob,{result:{winner:'white'},metadata:{}}),false);
assert.equal((await call('/api/matches/'+aliceJob.matchId,'alice')).status,404);
await queue.finish(bobJob,{result:{winner:null,reason:'fixture'},metadata:{format:'ottv2-log-v1'}});
// Delete all covers records beyond the displayed latest 100 and cancels queued jobs.
const next=await call('/api/practice','alice',{white:{source:'print(1)',language:'python'},black:{source:'print(1)',language:'python'},maxTurns:1});assert.equal(next.status,202);
await prisma.match.createMany({data:Array.from({length:105},(_,i)=>({id:'HISTORY-'+i,ownerId:users.alice.id,whiteId:users.alice.id,status:'finished',config:{mapId:'small-5'}}))});
let history=await call('/api/practice/history','alice');assert.equal(history.data.records.length,100);assert.equal(history.data.total,106);assert.ok(!('snapshot' in history.data.records[0]));
const ratingBefore=await prisma.user.findUnique({where:{id:users.alice.id}});
const all=await call('/api/practice/history/delete','alice',{});assert.equal(all.status,200);assert.equal(all.data.deleted,106);
assert.equal((await call('/api/practice/history','alice')).data.total,0);assert.equal((await call('/api/practice/history','bob')).data.total,1);
assert.equal(await prisma.match.count({where:{tournamentId:id}}),1);assert.equal(await prisma.entry.count({where:{tournamentId:id}}),2);
assert.equal((await prisma.user.findUnique({where:{id:users.alice.id}})).rating,ratingBefore.rating);
assert.equal((await call('/api/practice/history','alice',undefined,'DELETE')).data.deleted,0);
assert.equal((await call('/api/auth/logout','alice',{})).status,200);assert.equal((await call('/api/auth/me','alice')).status,401);
}finally{await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();}
});
