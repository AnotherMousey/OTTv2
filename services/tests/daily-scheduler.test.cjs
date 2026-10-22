const {test} = require('node:test');
const assert = require('node:assert/strict');
const {database,loadWithDatabase} = require('./helpers.cjs');
const db=database();
const scheduler=loadWithDatabase('../platform/daily-tournament.cjs',db);
const p=require('../platform/daily-policy.cjs');
const event={id:'t',format:p.FORMAT,startDate:'2026-10-22',endDate:'2026-10-22',ownerId:'j',phase:'live',gameId:'ottv2',mapId:'standard-9',firstSide:'white',moveTimeLimitMs:1000};
const batch={id:'b',tournamentId:'t',date:'2026-10-22',round:1,cutoff:p.instant('2026-10-22','21:00'),publishAfter:p.instant('2026-10-22','21:30'),state:'processing',bots:[{userId:'a',submissionId:'old-a',ready:true},{userId:'b',submissionId:'old-b',ready:true}],expected:2,scheduled:2,ratingCursor:0,config:{}};
test('missed cutoff reconstructs historical immutable versions, not current selection',async t=>{
  t.mock.method(db.entry,'findMany',async()=>[{userId:'a',activeSubmissionId:'NEW'},{userId:'b'}]);
  t.mock.method(db.submission,'findMany',async query=>{
    assert.equal(query.where.createdAt.lt.toISOString(),'2026-10-22T14:00:00.000Z');
    return [{id:'old-a',userId:'a',version:2,readyAt:new Date('2026-10-22T13:59:00Z'),createdAt:new Date('2026-10-22T13:58:00Z')},
      {id:'older-a',userId:'a',version:1,readyAt:new Date('2026-10-22T13:00:00Z'),createdAt:new Date('2026-10-22T12:00:00Z')}];
  });
  t.mock.method(db.dailyBatch,'create',async({data})=>data);
  const frozen=await scheduler.snapshot(db,event,'2026-10-22');
  assert.equal(frozen.bots[0].submissionId,'old-a');assert.equal(frozen.bots[0].ready,true);assert.equal(frozen.bots[1].ready,false);
  assert.equal(frozen.expected,2);assert.equal(frozen.publishAfter.toISOString(),'2026-10-22T14:30:00.000Z');
});
test('pair scheduling and cursor persist together; forfeits are explicitly administrative',async t=>{
  let matches,jobs,update;
  t.mock.method(db.match,'createMany',async({data})=>{matches=data;});
  t.mock.method(db.job,'createMany',async({data})=>{jobs=data;});
  t.mock.method(db.dailyBatch,'update',async({data})=>{update=data;});
  await scheduler.schedulePage(db,{...batch,scheduled:0});
  assert.equal(matches.length,2);assert.equal(jobs.length,2);assert.deepEqual(matches.map(m=>[m.whiteSubmissionId,m.blackSubmissionId]),[['old-a','old-b'],['old-b','old-a']]);
  assert.deepEqual(update,{scheduled:2,state:'processing'});
  await scheduler.schedulePage(db,{...batch,scheduled:0,bots:batch.bots.map(b=>({...b,ready:false,reason:'missing'}))});
  assert.ok(matches.every(m=>m.status==='finished'&&m.score===.5&&m.result.administrative));
});
test('early completion waits; late unfinished or failed matches never publish',async t=>{
  t.mock.method(db.tournament,'findUnique',async()=>event);
  t.mock.method(db.dailyBatch,'findMany',async()=>[batch]);
  t.mock.method(db.match,'count',async()=>1);
  await scheduler.tickEvent('t',p.instant(batch.date,'21:29'));
  await scheduler.tickEvent('t',p.instant(batch.date,'21:31'));
  // All writes throw by default. Neither call may begin ratings or publication.
});
test('ratings stage finishes before one atomic publication pointer switches',async t=>{
  const writes=[];
  t.mock.method(db.tournament,'findUnique',async()=>event);
  let current={...batch,state:'ready'};
  t.mock.method(db.dailyBatch,'findMany',async()=>[current]);
  t.mock.method(db.dailyBatch,'update',async({data})=>{writes.push(['batch',data]);current={...current,...data};});
  t.mock.method(db.tournament,'update',async({data})=>{writes.push(['tournament',data]);});
  t.mock.method(db.audit,'create',async()=>{writes.push(['audit']);});
  await scheduler.tickEvent('t',p.instant(batch.date,'21:29'));
  assert.equal(writes.length,0);
  await scheduler.tickEvent('t',p.instant(batch.date,'21:31'));
  assert.equal(writes[0][1].state,'published');assert.equal(writes[1][1].publishedBatchId,'b');assert.equal(writes[1][1].phase,'finished');
  const count=writes.length;await scheduler.tickEvent('t',p.instant(batch.date,'21:32'));assert.equal(writes.length,count);
});
test('rate cursor persists deterministic private results and never touches global User',async t=>{
  const table=['a','b'].map(userId=>scheduler.emptyStanding('b',userId));
  const matches=[{id:'m0',sequence:0,whiteId:'a',blackId:'b',score:1,status:'finished'},{id:'m1',sequence:1,whiteId:'b',blackId:'a',score:0,status:'finished'}];
  t.mock.method(db.match,'findMany',async query=>{assert.deepEqual(query.orderBy,{sequence:'asc'});return matches;});
  t.mock.method(db.dailyStanding,'findMany',async()=>table);
  let raw; t.mock.method(db,'$executeRaw',async query=>{raw=query;});
  t.mock.method(db.dailyStanding,'deleteMany',async()=>{});t.mock.method(db.dailyStanding,'createMany',async()=>{});
  t.mock.method(db.dailyBatch,'update',async({data})=>{assert.deepEqual(data,{ratingCursor:2,state:'ready'});});
  await scheduler.ratePage(db,batch);
  assert.ok(raw.sql.includes('UPDATE `Match`'));assert.ok(raw.values.includes(984));
  assert.equal(table[0].points,2);assert.equal(table[1].points,0);assert.equal(table[0].rating+table[1].rating,2000);
});
