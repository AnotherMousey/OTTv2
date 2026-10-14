const {PrismaClient}=require('@prisma/client');
const prisma=new PrismaClient({log:['error'],transactionOptions:{maxWait:10000,timeout:30000}});
async function transaction(fn,{isolationLevel='Serializable'}={}){for(let i=0;i<5;i++)try{return await prisma.$transaction(fn,{isolationLevel});}catch(e){const conflict=e.code==='P2034'||e.code==='P2010'&&['1213','1205'].includes(String(e.meta?.code));if(!conflict||i===4)throw e;await new Promise(r=>setTimeout(r,Math.min(500,40*2**i)+Math.random()*60));}}
module.exports={prisma,transaction};
