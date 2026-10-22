const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {database,loadWithDatabase}=require('./helpers.cjs');
const db=database();const {createApp}=loadWithDatabase('../api/index.cjs',db);
const {digest}=require('../shared/domain.cjs');const p=require('../platform/daily-policy.cjs');
const event={id:'t',format:p.FORMAT,startDate:'2026-10-22',endDate:'2026-10-30',phase:'live',ownerId:'judge',capacity:20};
async function client(t){
  t.mock.method(db.session,'findUnique',async({where})=>{
    const id=['judge','other','player'].find(id=>digest(id)===where.tokenHash);
    return id?{user:{id,role:id==='player'?'player':'judge',active:true},userId:id,expiresAt:new Date(Date.now()+60000)}:null;
  });
  const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
  return async(path,{as,body,method=body?'POST':'GET'}={})=>{
    const res=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method,headers:{'Content-Type':'application/json',...(as?{Authorization:'Bearer '+as}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:res.status,body:await res.json()};
  };
}
test('all direct unpublished match reads reject public, players and unrelated Judges',async t=>{
  const request=await client(t);
  t.mock.method(db.match,'findUnique',async()=>({id:'m',tournamentId:'t',batchId:'b',status:'finished',score:1,result:{secret:'winner'}}));
  t.mock.method(db.tournament,'findUnique',async()=>event);
  t.mock.method(db.dailyBatch,'findUnique',async()=>({id:'b',publishedAt:null}));
  for(const as of [undefined,'player','other'])for(const suffix of ['','/live','/replay']){
    const res=await request('/api/matches/m'+suffix,{as});assert.equal(res.status,404);assert.ok(!JSON.stringify(res.body).includes('winner'));
  }
});
test('organizing Judge can read completed internal outcomes immediately',async t=>{
  const request=await client(t);
  t.mock.method(db.match,'findUnique',async()=>({id:'m',tournamentId:'t',batchId:'b',status:'finished',score:1,whiteId:'player',blackId:'p2',result:{score:1}}));
  t.mock.method(db.tournament,'findUnique',async()=>event);
  t.mock.method(db.dailyBatch,'findUnique',async()=>({id:'b',publishedAt:null}));
  t.mock.method(db.user,'findMany',async()=>[]);
  const res=await request('/api/matches/m',{as:'judge'});assert.equal(res.status,200);assert.equal(res.body.score,1);
});
test('match discovery applies publication and owning-Judge scope to rows and counts',async t=>{
  const request=await client(t);let predicate;
  t.mock.method(db.match,'findMany',async({where})=>{predicate=where;return [];});
  t.mock.method(db.match,'count',async({where})=>{assert.deepEqual(where,predicate);return 0;});
  t.mock.method(db.user,'findMany',async()=>[]);
  assert.equal((await request('/api/matches?status=all',{as:'player'})).status,200);
  assert.equal(predicate.AND[1].OR.length,2);
  assert.equal((await request('/api/matches?status=all',{as:'judge'})).status,200);
  assert.deepEqual(predicate.AND[1].OR[2],{tournament:{ownerId:'judge'}});
});
test('code is read-only and restricted to accepted participants and organizing Judge',async t=>{
  const request=await client(t);
  t.mock.method(db.tournament,'findUnique',async()=>event);
  t.mock.method(db.submission,'findUnique',async()=>({id:'s',tournamentId:'t',userId:'player',source:'private code',version:1}));
  t.mock.method(db.entry,'findUnique',async()=>({status:'accepted'}));
  t.mock.method(db.user,'findUnique',async()=>({id:'player',name:'Alice'}));
  for(const as of ['player','other'])assert.equal((await request('/api/tournaments/t/source/s',{as})).status,403);
  const res=await request('/api/tournaments/t/source/s',{as:'judge'});assert.equal(res.status,200);assert.equal(res.body.readOnly,true);
  for(const method of ['POST','PATCH','DELETE'])assert.equal((await request('/api/tournaments/t/source/s',{as:'judge',method,body:{source:'edited'}})).status,404);
});
test('submission API rejects locked-time requests independently of frontend',async t=>{
  const request=await client(t);
  t.mock.timers.enable({apis:['Date'],now:p.instant('2026-10-22','21:00').getTime()});
  t.mock.method(db.tournament,'findUnique',async()=>event);
  t.mock.method(db.rateBucket,'upsert',async()=>({count:1}));
  const body={filename:'bot.py',language:'python',source:'print(1)'};
  assert.equal((await request('/api/tournaments/t/bot',{as:'player',body})).status,409);
  t.mock.timers.setTime(p.instant('2026-10-22','21:30').getTime());
  t.mock.method(db.entry,'findUnique',async()=>({status:'accepted'}));
  t.mock.method(db.submission,'count',async()=>1);
  t.mock.method(db.submission,'create',async({data})=>({...data,id:'new',status:'queued'}));
  t.mock.method(db.entry,'update',async()=>{});t.mock.method(db.job,'create',async()=>{});
  const res=await request('/api/tournaments/t/bot',{as:'player',body});assert.equal(res.status,202);
});
test('judge controls daily entry after the start; entry ends with the event',async t=>{
  const request=await client(t);
  t.mock.method(db,'$queryRaw',async()=>[]);
  t.mock.timers.enable({apis:['Date'],now:p.instant('2026-10-23','12:00').getTime()});
  t.mock.method(db.tournament,'findUnique',async()=>({...event,registrationOpen:false}));
  assert.equal((await request('/api/tournaments/t/join',{as:'player',body:{}})).status,409);
  t.mock.method(db.tournament,'findUnique',async()=>event);
  t.mock.method(db.entry,'findUnique',async()=>null);
  t.mock.method(db.entry,'count',async()=>0);
  const upserts=[];t.mock.method(db.entry,'upsert',async args=>{upserts.push(args);});
  t.mock.method(db.audit,'create',async()=>{});
  assert.equal((await request('/api/tournaments/t/join',{as:'player',body:{}})).status,200);
  assert.equal(upserts[0].create.status,'accepted');
  t.mock.timers.setTime(p.instant('2026-10-31').getTime());
  assert.equal((await request('/api/tournaments/t/join',{as:'player',body:{}})).status,409);
  assert.equal((await request('/api/tournaments/t/review',{as:'judge',body:{all:true,accept:true}})).status,409);
});
test('end-date extension never reopens registration and cannot delete a batch',async t=>{
  const request=await client(t);
  t.mock.timers.enable({apis:['Date'],now:p.instant('2026-10-24','22:00').getTime()});
  t.mock.method(db.tournament,'findUnique',async()=>event);
  t.mock.method(db.dailyBatch,'findFirst',async()=>({date:'2026-10-24'}));
  const updates=[];t.mock.method(db.tournament,'update',async({data})=>{updates.push(data);});
  t.mock.method(db.audit,'create',async()=>{});
  assert.equal((await request('/api/tournaments/t/schedule',{as:'other',body:{endDate:'2026-11-01'}})).status,403);
  assert.equal((await request('/api/tournaments/t/schedule',{as:'judge',body:{endDate:'2026-10-23'}})).status,409);
  assert.equal((await request('/api/tournaments/t/schedule',{as:'judge',body:{endDate:'2026-11-01'}})).status,200);
  assert.ok(!Object.hasOwn(updates[0],'phase'));assert.equal(updates[0].startDate,event.startDate);
});
test('a boundary-crossing upload uses one acceptance timestamp under the event lock',async t=>{
 const request=await client(t),accepted=p.instant('2026-10-22','20:59');
 t.mock.timers.enable({apis:['Date'],now:accepted.getTime()});
 t.mock.method(db.tournament,'findUnique',async()=>event);
 t.mock.method(db.rateBucket,'upsert',async()=>({count:1}));
 t.mock.method(db.entry,'findUnique',async()=>({status:'accepted'}));
 t.mock.method(db.submission,'count',async()=>{t.mock.timers.setTime(p.instant('2026-10-22','21:01').getTime());return 0;});
 t.mock.method(db.submission,'create',async({data})=>{assert.equal(data.createdAt.getTime(),accepted.getTime());return {...data,id:'s',status:'queued'};});
 t.mock.method(db.entry,'update',async()=>{});t.mock.method(db.job,'create',async()=>{});
 assert.equal((await request('/api/tournaments/t/bot',{as:'player',body:{filename:'a.py',source:'print(1)',language:'python'}})).status,202);
});

test('only the organizing Judge can hide or delete a tournament',async t=>{
  const request=await client(t);
  t.mock.method(db.tournament,'findUnique',async()=>event);
  for(const action of ['visibility','delete']){
    for(const as of ['player','other'])assert.equal((await request('/api/tournaments/t/'+action,{as,body:{hidden:true}})).status,403);
    assert.equal((await request('/api/tournaments/t/'+action,{body:{hidden:true}})).status,401);
  }
});
test('hide is reversible; deletion revokes pending claims and cannot be undone',async t=>{
  const request=await client(t);let current={...event},jobs, matches;const audit=[];
  t.mock.method(db.tournament,'findUnique',async()=>current);
  t.mock.method(db.tournament,'update',async({data})=>Object.assign(current,data));
  t.mock.method(db.audit,'create',async({data})=>audit.push(data));
  t.mock.method(db.job,'updateMany',async query=>{jobs=query;return {count:2};});
  t.mock.method(db.match,'updateMany',async query=>{matches=query;return {count:1};});
  assert.equal((await request('/api/tournaments/t/visibility',{as:'judge',body:{hidden:true}})).status,200);
  assert.equal(current.hidden,true);
  for(const as of [undefined,'player','other'])for(const suffix of ['/state','/rankings','/rounds'])assert.equal((await request('/api/tournaments/t'+suffix,{as})).status,404);
  assert.equal((await request('/api/tournaments/t/visibility',{as:'judge',body:{hidden:false}})).status,200);
  assert.equal(current.hidden,false);
  assert.equal((await request('/api/tournaments/t/delete',{as:'judge',body:{}})).status,200);
  assert.ok(current.deletedAt instanceof Date);
  assert.equal(jobs.data.status,'cancelled');assert.equal(jobs.data.claim,null);assert.equal(jobs.data.leaseUntil,null);
  assert.equal(matches.data.status,'cancelled');assert.deepEqual(matches.data.revision,{increment:1});
  assert.equal(audit.at(-1).action,'tournament.delete');
  assert.equal((await request('/api/tournaments/t/visibility',{as:'judge',body:{hidden:false}})).status,404);
  for(const suffix of ['/state','/rankings','/rounds'])assert.equal((await request('/api/tournaments/t'+suffix,{as:'judge'})).status,404);
});
