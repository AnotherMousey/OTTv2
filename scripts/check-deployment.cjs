try{process.loadEnvFile();}catch{}
const {prisma}=require('../services/shared/db.cjs');
const {checkDatabaseSchema,schemaError,schemaMessage}=require('../services/shared/readiness.cjs');
(async()=>{
 const {specification}=require('../logic/games/registry');
 const spec=specification();console.log(JSON.stringify({gameId:spec.gameId,rulesVersion:spec.rulesVersion,maps:spec.maps.map(m=>m.id)}));
 await checkDatabaseSchema(prisma);console.log('Database schema and game configuration checks passed. No data was modified.');
})().catch(error=>{console.error(schemaError(error)?schemaMessage:'Deployment check failed ('+(error.code||error.name)+'). Check database connectivity and game configuration.');process.exitCode=1;}).finally(()=>prisma.$disconnect());
