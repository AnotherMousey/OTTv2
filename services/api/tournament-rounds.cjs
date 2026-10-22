const {prisma}=require('../shared/db.cjs');
const {fail,int}=require('../shared/domain.cjs');
const {visibleMatches}=require('./daily-tournaments.cjs');
const STATES={all:null,live:['running'],queued:['scheduled','queued'],completed:['finished','bye'],failed:['failed']};
const matchSelect={id:true,round:true,whiteId:true,blackId:true,status:true,whiteBefore:true,blackBefore:true,whiteDelta:true,blackDelta:true,score:true,result:true,batchId:true,whiteSubmissionId:true,blackSubmissionId:true};
// Read-only, bounded round pages. Never returns submissions, private practice or guessed pairings.
async function list(req,res){
 const event=await prisma.tournament.findUnique({where:{id:req.params.id},select:{id:true,name:true,phase:true,round:true,totalRounds:true,format:true,startDate:true,endDate:true,hidden:true,deletedAt:true,ownerId:true}});
 if(!require('./tournament-visibility.cjs').canRead(event,req.user))fail(404,'Tournament not found.');
 const visibility=visibleMatches(req.user);
 const totalRounds=Math.max(1,event.totalRounds,event.round);
 const round=int(req.query.round||event.round||1,1,totalRounds,'Round');
 const limit=int(req.query.limit||12,1,50,'Limit');
 const status=String(req.query.status||'all');if(!Object.hasOwn(STATES,status))fail(400,'Unknown match status.');
 const query=String(req.query.q||'').trim().slice(0,80),focus=String(req.query.focus||'').slice(0,30);
 const [groups,accepted,receipt]=await Promise.all([
  prisma.match.groupBy({by:['round','status'],where:{AND:[{tournamentId:event.id},visibility]},_count:{_all:true}}),
  prisma.entry.count({where:{tournamentId:event.id,status:'accepted'}}),
  prisma.syncReceipt.findUnique({where:{tournamentId:event.id},select:{payload:true}}),
 ]);
 const archive=receipt?.payload?.complete?receipt.payload:null;
 const historic=new Map(archive?archive.manifest.participants.map(p=>[archive.accountMap[p.id],p]):[]);
 let searchIds=null;if(query){const users=await prisma.user.findMany({where:{name:{contains:query}},select:{id:true}});searchIds=[...new Set([...users.map(u=>u.id),...[...historic].filter(([,p])=>p.name.toLowerCase().includes(query.toLowerCase())).map(([id])=>id)])];}
 const summary=Array.from({length:totalRounds},(_,i)=>{const rows=groups.filter(g=>g.round===i+1),count=states=>rows.filter(g=>states.includes(g.status)).reduce((n,g)=>n+g._count._all,0);return {round:i+1,total:rows.reduce((n,g)=>n+g._count._all,0),completed:count(['finished','bye']),live:count(['running']),queued:count(['scheduled','queued']),failed:count(['failed'])};});
 const start=Math.max(1,Math.min(round-1,totalRounds-2));const numbers=Array.from({length:Math.min(3,totalRounds)},(_,i)=>start+i);
 const columns=await Promise.all(numbers.map(async number=>{
  const offset=int(req.query['offset'+number]||0,0,1000000000,'Offset');
  const where={AND:[visibility],tournamentId:event.id,round:number,...(STATES[status]?{status:{in:STATES[status]}}:{}),...(searchIds?{OR:[{whiteId:{in:searchIds}},{blackId:{in:searchIds}}]}:{})};
  const [matches,total,focused]=await Promise.all([
   prisma.match.findMany({where,select:matchSelect,orderBy:{id:'asc'},skip:offset,take:limit}),prisma.match.count({where}),
   focus?prisma.match.findFirst({where:{AND:[where,{OR:[{whiteId:focus},{blackId:focus}]}]},select:matchSelect,orderBy:{id:'asc'}}):null,
  ]);
  return {...summary[number-1],offset,limit,filteredTotal:total,matches,focused};
 }));
 const ids=[...new Set(columns.flatMap(c=>[...c.matches,...(c.focused?[c.focused]:[])]).flatMap(m=>[m.whiteId,m.blackId]).filter(Boolean))];
 const profiles=ids.length?await prisma.user.findMany({where:{id:{in:ids}},select:{id:true,name:true,rating:true,appearance:true}}):[];
 const people=new Map(profiles.map(p=>[p.id,{...p,...(historic.has(p.id)?{name:historic.get(p.id).name}:{})}]));
 const dto=m=>({...m,whitePlayer:people.get(m.whiteId)||{id:m.whiteId,name:'Unavailable participant',appearance:null},blackPlayer:m.blackId?(people.get(m.blackId)||{id:m.blackId,name:'Unavailable participant',appearance:null}):null});
 res.json({tournament:event,accepted:archive?archive.manifest.participants.length:accepted,summary,columns:columns.map(c=>({...c,matches:c.matches.map(dto),focused:c.focused?dto(c.focused):null})),round,limit});
}
module.exports={list};
