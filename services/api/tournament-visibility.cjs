const {prisma,transaction}=require('../shared/db.cjs');
const {fail}=require('../shared/domain.cjs');
const {eventOwner}=require('./auth.cjs');
const owns=(event,user)=>user?.role==='judge'&&event.ownerId===user.id;
const canRead=(event,user)=>!!event&&!event.deletedAt&&event.phase!=='importing'&&(!event.hidden||owns(event,user));
function readableWhere(user){return {deletedAt:null,OR:[{hidden:false},...(user?.role==='judge'?[{ownerId:user.id}]:[])]};}
async function requireReadable(id,user){const event=await prisma.tournament.findUnique({where:{id}});if(!canRead(event,user))fail(404,'Tournament not found.');return event;}
async function visibility(req,res){
 if(typeof req.body.hidden!=='boolean')fail(400,'hidden must be true or false.');
 await transaction(async tx=>{
  const event=await eventOwner(tx,req.params.id,req.user);
  await tx.tournament.update({where:{id:event.id},data:{hidden:req.body.hidden}});
  await tx.audit.create({data:{actorId:req.user.id,tournamentId:event.id,action:'tournament.visibility',metadata:{hidden:req.body.hidden}}});
 });res.json({ok:true,hidden:req.body.hidden});
}
async function remove(req,res){
 await transaction(async tx=>{
  const event=await eventOwner(tx,req.params.id,req.user);
  // Tombstoning removes all access atomically and preserves finished rating evidence.
  // Revoke running claims: in-flight runner responses can no longer publish.
  await tx.job.updateMany({where:{status:{in:['queued','running','failed']},OR:[{match:{tournamentId:event.id}},{submission:{tournamentId:event.id}}]},data:{status:'cancelled',claim:null,leaseUntil:null,error:'Tournament deleted.'}});
  await tx.match.updateMany({where:{tournamentId:event.id,status:{in:['scheduled','queued','running','failed']}},data:{status:'cancelled',error:'Tournament deleted.',revision:{increment:1}}});
  await tx.tournament.update({where:{id:event.id},data:{hidden:true,deletedAt:new Date()}});
  await tx.audit.create({data:{actorId:req.user.id,tournamentId:event.id,action:'tournament.delete',metadata:{policy:'tombstone-and-revoke-work'}}});
 });res.json({ok:true,deleted:true});
}
module.exports={owns,canRead,readableWhere,requireReadable,visibility,remove};
