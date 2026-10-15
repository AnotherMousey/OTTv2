try{process.loadEnvFile();}catch{}
const {prisma}=require('../services/shared/db.cjs');
const {checkDatabaseSchema,schemaError,schemaMessage,schemaDetails,deploymentIdentity}=require('../services/shared/readiness.cjs');
async function checkRemote(base,local){
 const url=new URL(base);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Supply an http(s) API base URL without credentials.');
 for(const route of ['/ready','/api/tournaments?limit=1']){
  const response=await fetch(base.replace(/\/+$/,'')+route,{signal:AbortSignal.timeout(20000)});
  const data=await response.json();
  if(!response.ok)throw Error(`Remote ${route} failed (${response.status}): ${data.error||'See API logs.'}`);
  if(route==='/ready'){
   console.log(JSON.stringify({event:'deployment.remote',...data}));
   if(!data.buildId||!data.databaseFingerprint)throw Error('Remote API lacks the updated deployment identity. Rebuild/redeploy it.');
   if(data.buildId!==local.buildId)throw Error('Local and remote API builds differ. Rebuild/redeploy the intended source.');
   if(data.databaseFingerprint!==local.databaseFingerprint)throw Error('Local and remote database endpoints differ. Run this check inside the deployed API service to compare its actual target. Public and private hostnames for one database also produce different fingerprints.');
  }
 }
}
(async()=>{
 const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--api'))throw Error('Usage: npm run deployment:check -- [--api https://YOUR_API_HOST]');
 const local=deploymentIdentity();console.log(JSON.stringify({event:'deployment.local',...local}));
 const {specification}=require('../logic/games/registry');const spec=specification();
 console.log(JSON.stringify({gameId:spec.gameId,rulesVersion:spec.rulesVersion,maps:spec.maps.map(m=>m.id)}));
 const checked=await checkDatabaseSchema(prisma);
 await require('../services/api/tournaments.cjs').list({query:{limit:1}},{json:()=>{}});
 console.log(JSON.stringify({event:'deployment.schema_ok',...checked,tournamentDirectory:true}));
 if(args.length)await checkRemote(args[1],local);
 console.log('Database schema and tournament directory checks passed. No data was modified.');
})().catch(error=>{
 console.error(JSON.stringify({event:'deployment.failed',...schemaDetails(error)}));
 console.error(schemaError(error)?schemaMessage:error.message?.includes('mysql://')?'Deployment check failed. Inspect database configuration.':error.message);
 process.exitCode=1;
}).finally(()=>prisma.$disconnect());
