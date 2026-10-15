const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {execute}=require('../worker/index.cjs'),queue=require('../worker/queue.cjs');
const {prisma}=require('../shared/db.cjs');
const {freezeConfig}=require('../platform/game-integration.cjs');
test('a saturated runner defers execution without consuming failure retries',async()=>{
 const saved={url:process.env.RUNNER_URL,secret:process.env.RUNNER_SECRET,find:prisma.submission.findUnique,defer:queue.defer,failure:queue.failure};
 const server=http.createServer((req,res)=>{req.resume();res.writeHead(429);res.end();});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let deferred=0,failed=0;
 process.env.RUNNER_URL='http://127.0.0.1:'+server.address().port;process.env.RUNNER_SECRET='x'.repeat(32);
 prisma.submission.findUnique=async()=>({source:'print(1)',language:'python'});
 queue.defer=async()=>{deferred++;return true;};queue.failure=async()=>{failed++;};
 try{await execute({id:'busy',type:'validate',submissionId:'bot',attempts:1,availableAt:new Date(),config:freezeConfig({mapId:'standard-9'})});assert.equal(deferred,1);assert.equal(failed,0);}
 finally{prisma.submission.findUnique=saved.find;queue.defer=saved.defer;queue.failure=saved.failure;for(const [key,value] of [['RUNNER_URL',saved.url],['RUNNER_SECRET',saved.secret]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();}
});
