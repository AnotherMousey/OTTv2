const {prisma,transaction}=require('../shared/db.cjs');
const {fail}=require('../shared/domain.cjs');
const {eventOwner}=require('../api/auth.cjs');
const {freezeConfig,resolveFrozen,normalizedResult}=require('../platform/game-integration.cjs');
const {digest,validateManifest,validatePart}=require('./bundle.cjs');
const matchFields=['id','round','whiteId','blackId','whiteSubmissionId','blackSubmissionId','status','config','runId','whiteBefore','blackBefore','whiteDelta','blackDelta','score','result','metadata','snapshot','revision'];
const pick=(object,keys)=>Object.fromEntries(keys.map(k=>[k,object[k]??null]));
async function part(tx,id){const m=await tx.match.findUnique({where:{id}});return {match:pick(m,matchFields),frames:await tx.frame.findMany({where:{matchId:id,runId:m.runId||''},orderBy:{seq:'asc'},select:{seq:true,payload:true}})};}
async function exportManifest(req,res){
 const event=await eventOwner(prisma,req.params.id,req.user);if(event.phase!=='finished')fail(409,'Finish the tournament before exporting.');
 const receipt=await prisma.syncReceipt.findUnique({where:{tournamentId:event.id}});if(receipt)fail(409,'Re-export from the original authority; imported archives cannot become a new authority.');
 const entries=await prisma.entry.findMany({where:{tournamentId:event.id,status:'accepted'},include:{user:true}});
 const submissions=await prisma.submission.findMany({where:{tournamentId:event.id},select:{id:true,userId:true,filename:true,language:true,sourceHash:true,version:true,status:true,createdAt:true}});
 const matches=await prisma.match.findMany({where:{tournamentId:event.id},select:{id:true},orderBy:{id:'asc'}}),descriptors=[];
 for(const m of matches)descriptors.push({id:m.id,digest:digest(await part(prisma,m.id))});
 const manifest={format:'bot-tournament-bundle',version:1,tournament:pick(event,['id','name','description','phase','round','totalRounds','capacity','gameId','gameConfig','mapId','firstSide','maxTurns','moveTimeLimitMs']),gameIdentity:freezeConfig(event)._game,participants:entries.map(e=>pick(e.user,['id','username','name','rating','games','lastDelta'])),submissions:submissions.map(s=>({...s,createdAt:s.createdAt.toISOString()})),matches:descriptors};
 validateManifest(manifest);res.json(manifest);
}
async function exportPart(req,res){const m=await prisma.match.findUnique({where:{id:req.params.matchId}});if(!m||m.tournamentId!==req.params.id)fail(404,'Match not found.');const event=await eventOwner(prisma,req.params.id,req.user);if(event.phase!=='finished')fail(409,'Tournament is not finished.');res.json(await part(prisma,m.id));}
async function mapping(tx,manifest,accountMap){
 if(!accountMap||typeof accountMap!=='object'||Array.isArray(accountMap))fail(400,'Supply an explicitly reviewed source-id to web-id accountMap.');
 const ids=manifest.participants.map(u=>accountMap[u.id]);if(ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)fail(400,'Account mapping is missing or maps several participants to one account.');
 const users=await tx.user.findMany({where:{id:{in:ids},role:'player',active:true}});if(users.length!==ids.length)fail(409,'Mapped accounts must be active player accounts.');return ids;
}
async function plan(req,res){const manifest=req.body.manifest;validateManifest(manifest);const names=manifest.participants.map(u=>u.username);const users=await prisma.user.findMany({where:{username:{in:names},role:'player',active:true},select:{id:true,username:true,name:true}});res.json({tournamentId:manifest.tournament.id,mapping:manifest.participants.map(u=>({sourceId:u.id,sourceUsername:u.username,sourceName:u.name,candidate:users.find(w=>w.username===u.username)||null})),authority:'immutable local completed event; no global Elo application'});}
async function begin(req,res){
 const {manifest,accountMap}=req.body,hash=validateManifest(manifest);
 freezeConfig({...manifest.tournament});if(digest(freezeConfig(manifest.tournament)._game)!==digest(manifest.gameIdentity))fail(409,'Game library version mismatch.');
 const result=await transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM User WHERE id=${req.user.id} FOR UPDATE`;
  const existing=await tx.syncReceipt.findUnique({where:{tournamentId:manifest.tournament.id}});
  if(existing){if(existing.digest!==hash||digest(existing.payload.accountMap)!==digest(accountMap)||existing.payload.ownerId!==req.user.id)fail(409,'Import authority, mapping or manifest conflict.');return {id:manifest.tournament.id,resumed:true,complete:existing.payload.complete};}
  await mapping(tx,manifest,accountMap);
  if(await tx.tournament.findUnique({where:{id:manifest.tournament.id}}))fail(409,'Tournament ID already exists; web data is authoritative for that ID.');
  if(await tx.submission.count({where:{id:{in:manifest.submissions.map(s=>s.id)}}})||await tx.match.count({where:{id:{in:manifest.matches.map(m=>m.id)}}}))fail(409,'Submission or match ID collision.');
  const t=manifest.tournament;
  await tx.tournament.create({data:{...t,phase:'importing',ownerId:req.user.id,gameConfig:t.gameConfig||{},gameId:t.gameId||'ottv2'}});
  // Historical bot source is intentionally excluded. These finished events cannot be rerun.
  await tx.submission.createMany({data:manifest.submissions.map(s=>({...s,userId:accountMap[s.userId],tournamentId:t.id,source:'',status:'archived',createdAt:new Date(s.createdAt)}))});
  await tx.entry.createMany({data:manifest.participants.map(u=>({tournamentId:t.id,userId:accountMap[u.id],status:'accepted'}))});
  await tx.syncReceipt.create({data:{tournamentId:t.id,digest:hash,payload:{manifest,accountMap,ownerId:req.user.id,complete:false}}});
  return {id:t.id,resumed:false,complete:false};
 });res.json(result);
}
async function uploadPart(req,res){
 const result=await transaction(async tx=>{
  await tx.$queryRaw`SELECT tournamentId FROM SyncReceipt WHERE tournamentId=${req.params.id} FOR UPDATE`;
  const receipt=await tx.syncReceipt.findUnique({where:{tournamentId:req.params.id}});if(!receipt||receipt.payload.ownerId!==req.user.id)fail(403,'Import belongs to another operator.');
  const {manifest,accountMap}=receipt.payload,part=req.body.part,hash=validatePart(part,manifest);
  const existing=await tx.syncPart.findUnique({where:{tournamentId_matchId:{tournamentId:req.params.id,matchId:part.match.id}}});if(existing){if(existing.digest!==hash)fail(409,'Match import conflict.');return {duplicate:true};}
  if(receipt.payload.complete)fail(409,'Completed import is immutable.');
  const m=part.match;resolveFrozen(m.config);if(digest(m.config._game||manifest.gameIdentity)!==digest(manifest.gameIdentity))fail(409,'Match game identity mismatch.');
  if(m.status==='finished'&&normalizedResult(m.result,m.config).score!==m.score)fail(400,'Game result and score disagree.');
  const nullable=Object.fromEntries(['result','metadata','snapshot'].map(key=>[key,m[key]===null?require('@prisma/client').Prisma.DbNull:m[key]]));await tx.match.create({data:{...m,...nullable,tournamentId:req.params.id,whiteId:accountMap[m.whiteId],blackId:m.blackId?accountMap[m.blackId]:null,rated:true}});
  if(part.frames.length)await tx.frame.createMany({data:part.frames.map(f=>({...f,matchId:m.id,runId:m.runId}))});
  await tx.syncPart.create({data:{tournamentId:req.params.id,matchId:m.id,digest:hash}});return {duplicate:false};
 });res.json(result);
}
async function complete(req,res){await transaction(async tx=>{
 await tx.$queryRaw`SELECT tournamentId FROM SyncReceipt WHERE tournamentId=${req.params.id} FOR UPDATE`;
 const receipt=await tx.syncReceipt.findUnique({where:{tournamentId:req.params.id}});if(!receipt||receipt.payload.ownerId!==req.user.id)fail(403,'Import belongs to another operator.');
 if(receipt.payload.complete)return;
 if(await tx.syncPart.count({where:{tournamentId:req.params.id}})!==receipt.payload.manifest.matches.length)fail(409,'Upload all match parts before completing.');
 const matches=await tx.match.findMany({where:{tournamentId:req.params.id},select:{round:true,whiteId:true,blackId:true}});const expected=new Set(Object.values(receipt.payload.accountMap));for(let round=1;round<=receipt.payload.manifest.tournament.totalRounds;round++){const slots=matches.filter(m=>m.round===round).flatMap(m=>[m.whiteId,m.blackId].filter(Boolean));if(slots.length!==expected.size||new Set(slots).size!==slots.length||slots.some(id=>!expected.has(id)))fail(409,'Round is incomplete or contains repeated participants.');}
 await tx.tournament.update({where:{id:req.params.id},data:{phase:'finished'}});await tx.syncReceipt.update({where:{tournamentId:req.params.id},data:{payload:{...receipt.payload,complete:true}}});
 await tx.audit.create({data:{actorId:req.user.id,tournamentId:req.params.id,action:'sync.complete',metadata:{digest:receipt.digest,ratingPolicy:'archive-only'}}});
 });res.json({ok:true});}
module.exports={exportManifest,exportPart,plan,begin,uploadPart,complete};
