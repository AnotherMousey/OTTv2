const {test} = require('node:test');
const assert = require('node:assert/strict');
const p = require('../platform/daily-policy.cjs');
const event = {format:p.FORMAT,startDate:'2026-10-22',endDate:'2026-10-24',phase:'registration'};
const at = time => new Date(`2026-10-22T${time}+07:00`);
test('Vietnam lock is half-open and independent of process timezone', () => {
  const old=process.env.TZ;
  for(const zone of ['UTC','America/New_York','Asia/Tokyo']) {
    process.env.TZ=zone;
    for(const [time,locked] of [['20:59:59.999',false],['21:00:00',true],['21:29:59.999',true],['21:30:00',false]])
      assert.equal(p.botLocked(event,at(time)),locked,`${zone} ${time}`);
    assert.equal(p.localDate(at('00:00:00')),'2026-10-22');
  }
  if(old===undefined)delete process.env.TZ;else process.env.TZ=old;
});
test('lock applies only to active tournament dates and never legacy practice',()=>{
  assert.equal(p.botLocked(event,new Date('2026-10-21T21:10:00+07:00')),false);
  assert.equal(p.botLocked(event,new Date('2026-10-25T21:10:00+07:00')),false);
  assert.equal(p.botLocked({...event,format:'legacy'},at('21:10:00')),false);
  assert.throws(()=>p.assertBotOpen(event,at('21:00:00')),{status:409});
  p.assertBotOpen(event,at('21:30:00'));
  assert.throws(()=>p.assertBotOpen(event,new Date('2026-10-25T00:00:00+07:00')),{status:409});
});
test('registration closes at local midnight; extending end does not change cutoff',()=>{
  assert.equal(p.started(event,new Date('2026-10-21T23:59:59.999+07:00')),false);
  assert.equal(p.started(event,at('00:00:00')),true);
  assert.equal(p.started({...event,endDate:'2026-10-30'},at('00:00:00')),true);
});
test('judge-chosen start time closes registration at that hour',()=>{
  const timed={...event,startTime:'14:30'};
  assert.equal(p.started(timed,at('14:29:59.999')),false);
  assert.equal(p.started(timed,at('14:30:00')),true);
  assert.equal(p.display(timed,at('09:00:00')).registrationClosesAt,'2026-10-22T07:30:00.000Z');
  assert.equal(p.schedule('2026-10-22','2026-10-22').startTime,'00:00');
  assert.equal(p.schedule('2026-10-22','2026-10-22','20:59').startTime,'20:59');
  for(const t of ['21:00','23:15','9:00','24:00','12:60','noon'])assert.throws(()=>p.schedule('2026-10-22','2026-10-22',t),{status:400},t);
});
test('inclusive schedules validate leap days, invalid dates, order and bounds',()=>{
  assert.equal(p.schedule('2028-02-28','2028-03-01').totalRounds,3);
  assert.equal(p.schedule('2026-10-22','2026-10-22').totalRounds,1);
  for(const [a,b] of [['2026-02-29','2026-03-01'],['2026-10-24','2026-10-22'],['2026-01-01','2028-01-01'],['bad','2026-10-22']])assert.throws(()=>p.schedule(a,b),{status:400});
});
test('each pair plays exactly twice with reversed sides, including odd player counts',()=>{
  for(const n of [2,3,4,11,100]){
    const ids=Array.from({length:n},(_,i)=>`u${i}`),seen=new Set();
    for(let seq=0;seq<n*(n-1);seq++){
      const [a,b]=p.pairingAt(ids,seq);assert.notEqual(a,b);assert.ok(!seen.has(`${a}:${b}`));seen.add(`${a}:${b}`);
      if(seq%2===1)assert.deepEqual(p.pairingAt(ids,seq-1),[b,a]);
    }
    assert.equal(seen.size,n*(n-1));
  }
});
test('fixed pairing order yields repeatable cumulative tournament-only Elo',()=>{
  const run=()=>{
    const map=new Map(['a','b','c'].map(userId=>[userId,{rating:1000,games:0,points:0,wins:0,draws:0,losses:0,lastDelta:0}]));
    for(let day=0;day<2;day++)for(let seq=0;seq<6;seq++){
      const [a,b]=p.pairingAt([...map.keys()],seq);p.applyRating(map.get(a),map.get(b),[1,.5,0][seq%3]);
    }
    return [...map.values()];
  };
  assert.deepEqual(run(),run());assert.equal(run().reduce((n,r)=>n+r.rating,0),3000);
  assert.equal(run().reduce((n,r)=>n+r.points,0),12);
  for(const row of run())assert.equal(row.games,8);
});
