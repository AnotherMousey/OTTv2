const {resultScore}=require('../platform/tournament.cjs');const {normalizedResult}=require('../platform/game-integration.cjs');
const crypto=require('node:crypto');const {prisma,transaction}=require('../shared/db.cjs');const {eloDelta}=require('../shared/domain.cjs');
// Queue reads use explicit row locks. ReadCommitted avoids broad read/gap locks.
const queueTransaction=fn=>transaction(fn,{isolationLevel:'ReadCommitted'});
async function claim(){return queueTransaction(async tx=>{const rows=await tx.$queryRaw`SELECT id FROM Job WHERE status='queued' AND availableAt<=NOW(3) ORDER BY availableAt,createdAt,id LIMIT 1 FOR UPDATE SKIP LOCKED`;if(!rows.length)return null;const token=crypto.randomUUID();const job=await tx.job.update({where:{id:rows[0].id},data:{status:'running',claim:token,attempts:{increment:1},leaseUntil:new Date(Date.now()+45000)}});if(job.matchId)await tx.match.update({where:{id:job.matchId},data:{status:'running',runId:token,revision:{increment:1},error:null,metadata:require('@prisma/client').Prisma.DbNull,snapshot:require('@prisma/client').Prisma.DbNull}});if(job.submissionId)await tx.submission.update({where:{id:job.submissionId},data:{status:'validating',error:null}});return job;});}
async function heartbeat(job){return (await prisma.job.updateMany({where:{id:job.id,status:'running',claim:job.claim},data:{leaseUntil:new Date(Date.now()+45000)}})).count===1;}
async function appendBatch(job,events){
 if(!job.matchId||!Array.isArray(events)||!events.length||events.length>100)throw Error('Invalid runner batch.');
 for(const event of events)if(!Number.isInteger(event.seq)||event.seq<0||event.seq>10000||!event.frame||typeof event.frame!=='object')throw Error('Invalid runner frame.');
 const ordered=[...events].sort((a,b)=>a.seq-b.seq);
 return queueTransaction(async tx=>{
  // The job lock serializes frame publication with lease recovery and finish.
  await tx.$queryRaw`SELECT id FROM Job WHERE id=${job.id} FOR UPDATE`;
  const current=await tx.job.findUnique({where:{id:job.id}});
  if(current?.claim!==job.claim||current.status!=='running')return false;
  await tx.$queryRaw`SELECT id FROM \`Match\` WHERE id=${job.matchId} FOR UPDATE`;
  const latest=await tx.frame.findFirst({where:{matchId:job.matchId,runId:job.claim},orderBy:{seq:'desc'},select:{seq:true}});
  const added=await tx.frame.createMany({data:ordered.map(event=>({matchId:job.matchId,runId:job.claim,seq:event.seq,payload:event.frame})),skipDuplicates:true});
  const last=ordered.at(-1),metadata=[...ordered].reverse().find(event=>event.metadata)?.metadata;
  if(added.count&&last.seq>(latest?.seq??-1))await tx.match.update({where:{id:job.matchId},data:{revision:{increment:1},snapshot:last.frame,...(metadata?{metadata}:{})}});
  return true;
 });
}
async function append(job,event){return appendBatch(job,[event]);}
async function finish(job,event){return queueTransaction(async tx=>{await tx.$queryRaw`SELECT id FROM Job WHERE id=${job.id} FOR UPDATE`;const current=await tx.job.findUnique({where:{id:job.id}});if(current?.claim!==job.claim||current.status!=='running')return false;
if(job.type==='validate'){await tx.submission.update({where:{id:job.submissionId},data:{status:'ready',error:null}});}
else{await tx.$queryRaw`SELECT id FROM \`Match\` WHERE id=${job.matchId} FOR UPDATE`;const m=await tx.match.findUnique({where:{id:job.matchId}});event={...event,result:normalizedResult(event.result,m.config)};const score=resultScore(event.result);let values={status:'finished',score,result:event.result,metadata:event.metadata,revision:{increment:1}};if(m.tournamentId&&!m.rated&&m.blackId){const ids=[m.whiteId,m.blackId].sort();for(const id of ids)await tx.$queryRaw`SELECT id FROM User WHERE id=${id} FOR UPDATE`;const white=await tx.user.findUnique({where:{id:m.whiteId}}),black=await tx.user.findUnique({where:{id:m.blackId}});const delta=eloDelta(white.rating,black.rating,score);for(const [u,s,d] of [[white,score,delta],[black,1-score,-delta]])await tx.user.update({where:{id:u.id},data:{rating:{increment:d},games:{increment:1},wins:{increment:s===1?1:0},draws:{increment:s===.5?1:0},losses:{increment:s===0?1:0},lastDelta:d}});values={...values,rated:true,whiteBefore:white.rating,blackBefore:black.rating,whiteDelta:delta,blackDelta:-delta};}await tx.match.update({where:{id:m.id},data:values});}
await tx.job.update({where:{id:job.id},data:{status:'done',leaseUntil:null}});return true;});}
async function failure(job,error,invalid=false,expiredOnly=false){return queueTransaction(async tx=>{await tx.$queryRaw`SELECT id FROM Job WHERE id=${job.id} FOR UPDATE`;const current=await tx.job.findUnique({where:{id:job.id}});if(current?.claim!==job.claim||current.status!=='running'||(expiredOnly&&current.leaseUntil>=new Date()))return;const retry=!invalid&&current.attempts<3;await tx.job.update({where:{id:job.id},data:{status:retry?'queued':'failed',claim:null,leaseUntil:null,error:String(error).slice(0,4000),availableAt:new Date(Date.now()+Math.min(60000,5000*current.attempts))}});if(job.submissionId)await tx.submission.update({where:{id:job.submissionId},data:{status:retry?'queued':invalid?'invalid':'error',error:String(error).slice(0,4000)}});if(job.matchId)await tx.match.update({where:{id:job.matchId},data:{status:retry?'queued':'failed',error:String(error).slice(0,4000),revision:{increment:1}}});});}
// A saturated runner has not attempted bot execution. Preserve the retry budget.
async function defer(job){return queueTransaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM Job WHERE id=${job.id} FOR UPDATE`;
 const current=await tx.job.findUnique({where:{id:job.id}});
 if(current?.claim!==job.claim||current.status!=='running')return false;
 await tx.job.update({where:{id:job.id},data:{status:'queued',attempts:Math.max(0,current.attempts-1),claim:null,leaseUntil:null,error:null,availableAt:new Date(Date.now()+1500)}});
 if(job.matchId)await tx.match.update({where:{id:job.matchId},data:{status:'queued',runId:null,error:null,revision:{increment:1}}});
 if(job.submissionId)await tx.submission.update({where:{id:job.submissionId},data:{status:'queued',error:null}});
 return true;
});}
async function recover(){const stale=await prisma.job.findMany({where:{status:'running',leaseUntil:{lt:new Date()}},take:100});for(const job of stale)await failure(job,'Worker lease expired; retrying execution.',false,true);}
module.exports={claim,heartbeat,append,appendBatch,finish,failure,defer,recover};
