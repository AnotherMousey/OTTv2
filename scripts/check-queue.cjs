try{process.loadEnvFile();}catch{}
const {prisma}=require('../services/shared/db.cjs');
(async()=>{
 if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL in .env.');
 const jobs=await prisma.job.groupBy({by:['type','status'],_count:{_all:true}});
 const recent=await prisma.job.findMany({orderBy:{createdAt:'desc'},take:10,select:{id:true,type:true,status:true,attempts:true,error:true,leaseUntil:true,createdAt:true}});
 console.log(JSON.stringify({jobs,recent},null,2));
})().catch(error=>{console.error('Queue check failed:',error.code||error.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
