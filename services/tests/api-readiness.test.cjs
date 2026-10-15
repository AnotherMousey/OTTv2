const {test}=require('node:test'),assert=require('node:assert/strict');
const {prisma}=require('../shared/db.cjs'),{createApp}=require('../api/index.cjs');
const {expectedSchema,checkDatabaseSchema,databaseFingerprint,schemaDetails}=require('../shared/readiness.cjs');
const catalog=()=>expectedSchema.flatMap(model=>model.columns.map(columnName=>({tableName:model.table,columnName})));
test('readiness covers every scalar column, including empty tables and old unchecked columns',async()=>{
 for(const model of expectedSchema)for(const column of model.columns){
  const rows=catalog().filter(row=>row.tableName!==model.table||row.columnName!==column);
  await assert.rejects(checkDatabaseSchema({$queryRaw:async()=>rows}),error=>{
   assert.equal(error.code,'DATABASE_SCHEMA_OUTDATED');assert.ok(error.missing.some(m=>m.table===model.table&&m.column===column));return true;
  });
 }
 await assert.rejects(checkDatabaseSchema({$queryRaw:async()=>catalog().filter(row=>row.tableName!=='Entry')}),error=>error.missing.some(m=>m.table==='Entry'&&m.kind==='table'));
});
test('deployment fingerprints omit credentials and schema logs retain the failing column',()=>{
 assert.equal(databaseFingerprint('mysql://alice:secret@host/db?connection_limit=2'),databaseFingerprint('mysql://bob:different@host:3306/db'));
 assert.notEqual(databaseFingerprint('mysql://alice:secret@host/db'),databaseFingerprint('mysql://alice:secret@host/other'));
 assert.deepEqual(schemaDetails({code:'P2022',meta:{modelName:'Tournament',column:'Tournament.capacity'}}),{code:'P2022',model:'Tournament',column:'Tournament.capacity'});
});
test('API reports full-schema drift, private error details and comparable deployment identities',async()=>{
 const saved={raw:prisma.$queryRaw,list:prisma.tournament.findMany,count:prisma.tournament.count};
 const logs=[],originalError=console.error;console.error=value=>logs.push(JSON.parse(value));
 const server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const spec=await fetch(base+'/api/games/current');assert.equal(spec.status,200);assert.equal((await spec.json()).defaultBotConfig.maxTurns,1620);
  prisma.$queryRaw=async()=>catalog().filter(row=>row.tableName!=='Tournament'||row.columnName!=='capacity');
  prisma.tournament.count=async()=>0;
  prisma.tournament.findMany=async()=>{throw Object.assign(Error('missing column'),{code:'P2022',meta:{modelName:'Tournament',column:'Tournament.capacity'}});};
  let response=await fetch(base+'/ready');assert.equal(response.status,503);const failed=await response.json();assert.match(failed.error,/deployment:check/);assert.ok(!failed.missing);
  response=await fetch(base+'/api/tournaments');assert.equal(response.status,503);assert.equal((await response.json()).code,'DATABASE_SCHEMA_OUTDATED');
  assert.ok(logs.some(log=>log.event==='api.schema_error'&&log.column==='Tournament.capacity'));
  prisma.$queryRaw=async()=>catalog();response=await fetch(base+'/ready');assert.equal(response.status,200);
  const ready=await response.json(),health=await (await fetch(base+'/health')).json();assert.equal(ready.buildId,health.buildId);assert.equal(ready.databaseFingerprint,health.databaseFingerprint);assert.equal(ready.ok,true);
 }finally{prisma.$queryRaw=saved.raw;prisma.tournament.findMany=saved.list;prisma.tournament.count=saved.count;console.error=originalError;await new Promise(r=>server.close(r));await prisma.$disconnect();}
});
