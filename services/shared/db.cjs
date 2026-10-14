const {PrismaClient}=require('@prisma/client');
const prisma=new PrismaClient({log:['error'],transactionOptions:{maxWait:10000,timeout:30000}});
async function transaction(fn){for(let i=0;i<4;i++)try{return await prisma.$transaction(fn,{isolationLevel:'Serializable'});}catch(e){if(!['P2034'].includes(e.code)||i===3)throw e;await new Promise(r=>setTimeout(r,30*(i+1)+Math.random()*40));}}
module.exports={prisma,transaction};
