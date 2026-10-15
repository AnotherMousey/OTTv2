const http=require('node:http'),crypto=require('node:crypto');
const {resolveFrozen,executionDeadline}=require('../platform/game-integration.cjs');
const {botInput}=require('../shared/domain.cjs');
const {factory,stop}=require('./docker.cjs');
const {abortable,ExecutionScope}=require('./execution-scope.cjs');
const secret=process.env.RUNNER_SECRET||'';
if(secret.length<32)throw Error('RUNNER_SECRET must contain at least 32 characters.');
let active=0;
function authorized(value){const v=String(value||'').replace(/^Bearer /i,'');return Buffer.byteLength(v)===Buffer.byteLength(secret)&&crypto.timingSafeEqual(Buffer.from(v),Buffer.from(secret));}
const server=http.createServer(async(req,res)=>{
 if(req.method==='GET'&&req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,active}));return;}
 if(req.method!=='POST'||req.url!=='/run'||!authorized(req.headers.authorization)){res.writeHead(403);res.end();return;}
 if(active>=Number(process.env.RUNNER_CONCURRENCY||2)){res.writeHead(429);res.end();return;}
 active++;
 const controller=new AbortController();res.on('close',()=>controller.abort());
 // Also bound clients that never finish sending the request body.
 const intake=setTimeout(()=>{controller.abort();req.destroy();},30000);
 res.writeHead(200,{'Content-Type':'application/x-ndjson'});
 const send=data=>{if(!controller.signal.aborted)res.write(JSON.stringify(data)+'\n');};
 try{
  let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2*1024*1024)throw Error('Request too large.');}
  clearTimeout(intake);
  const input=JSON.parse(body),{plugin,config}=resolveFrozen(input.config);
  const scope=new ExecutionScope(factory,stop,controller.signal);
  const timer=setTimeout(()=>controller.abort(),executionDeadline(input.config));
  try{
   if(input.type==='validate'){
    try{const detail=await abortable(plugin.validate({bot:botInput(input.bot),id:input.id,config,factory:scope.factory,stop:scope.stop,signal:controller.signal}),controller.signal);send({type:'validated',...detail});}
    catch(e){send({type:'error',code:e.code==='RUNNER_INFRA'?'RUNNER_INFRA':'BOT_INVALID',error:e.message});}
   }else if(input.type==='match'){
    const bots=[botInput(input.white),botInput(input.black)];let seq=0;
    const replay=await abortable(plugin.run({id:input.id,bots,config,factory:scope.factory,stop:scope.stop,signal:controller.signal,onFrame:async(frame,metadata)=>send({type:'frame',seq:seq++,frame,...(metadata?{metadata}: {})})}),controller.signal);
    send({type:'finished',result:{...replay.result,score:plugin.score(replay.result)},metadata:{...Object.fromEntries(Object.entries(replay).filter(([k])=>!['frames','result'].includes(k))),gameIdentity:plugin.identity}});
   }else throw Error('Unknown job type.');
  }finally{clearTimeout(timer);await scope.close();}
 }catch(e){send({type:'error',code:e.code||'RUNNER_INFRA',error:e.message});}
 finally{clearTimeout(intake);active--;res.end();}
});
server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('Isolated runner listening'));
