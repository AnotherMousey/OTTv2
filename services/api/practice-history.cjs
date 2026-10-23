const {Prisma}=require('@prisma/client');
const {prisma,transaction}=require('../shared/db.cjs');
const {fail}=require('../shared/domain.cjs');
const {executionError}=require('./bot-diagnostics.cjs');

async function list(req,res){
 const where={ownerId:req.user.id,tournamentId:null};
 const [rows,total]=await Promise.all([
  prisma.match.findMany({where,orderBy:{createdAt:'desc'},take:100,select:{id:true,status:true,result:true,error:true,config:true,createdAt:true,whiteSubmissionId:true,blackSubmissionId:true}}),
  prisma.match.count({where})
 ]);
 const ids=[...new Set(rows.flatMap(row=>[row.whiteSubmissionId,row.blackSubmissionId]).filter(Boolean))];
 const bots=ids.length?await prisma.submission.findMany({where:{id:{in:ids}},select:{id:true,language:true}}):[];
 const languages=new Map(bots.map(bot=>[bot.id,({python:'Python',java:'Java',cpp:'C++'}[bot.language]||bot.language)]));
 res.json({total,records:rows.map(row=>({id:row.id,matchId:row.id,status:row.status,result:row.result,error:executionError(row.error,true),createdAt:row.createdAt,title:'Practice match',language:`${languages.get(row.whiteSubmissionId)||'Unknown'} / ${languages.get(row.blackSubmissionId)||'Unknown'}`,mapName:row.config.mapName||row.config.mapId||'OTTv2'}))});
}

async function remove(req,res){
  if(req.user.role!=='player')fail(403,'Use a player account for practice history.');
  const deleted=await transaction(async tx=>{
    // Serialize this owner's practice creation and deletion. Queue workers
    // never lock User for an unrated private practice match.
    await tx.$queryRaw`SELECT id FROM User WHERE id=${req.user.id} FOR UPDATE`;
    const rows=await tx.match.findMany({
      where:{ownerId:req.user.id,tournamentId:null,...(req.params.id?{id:req.params.id}:{})},
      select:{id:true,whiteSubmissionId:true,blackSubmissionId:true},orderBy:{id:'asc'},
    });
    if(req.params.id&&!rows.length)fail(404,'Practice recording not found.');
    if(!rows.length)return 0;
    const ids=rows.map(row=>row.id);
    // Match worker lock order: Job, then Match. Removing the job revokes its
    // lease; a running worker cannot publish or finish after this commit.
    await tx.$queryRaw`SELECT id FROM Job WHERE matchId IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM \`Match\` WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
    await tx.job.deleteMany({where:{matchId:{in:ids}}});
    await tx.match.deleteMany({where:{id:{in:ids},ownerId:req.user.id,tournamentId:null}});
    // Frame rows cascade with their match. Remove private source submissions
    // only when no remaining match, entry or validation job references them.
    const bots=[...new Set(rows.flatMap(row=>[row.whiteSubmissionId,row.blackSubmissionId]).filter(Boolean))];
    if(bots.length){
      const remaining=await tx.match.findMany({where:{OR:[{whiteSubmissionId:{in:bots}},{blackSubmissionId:{in:bots}}]},select:{whiteSubmissionId:true,blackSubmissionId:true}});
      const referenced=new Set(remaining.flatMap(row=>[row.whiteSubmissionId,row.blackSubmissionId]));
      await tx.submission.deleteMany({where:{id:{in:bots.filter(id=>!referenced.has(id))},userId:req.user.id,tournamentId:null,activeEntries:{none:{}},jobs:{none:{}}}});
    }
    return rows.length;
  },{isolationLevel:'ReadCommitted'});
  res.json({deleted});
}
module.exports={list,remove};
