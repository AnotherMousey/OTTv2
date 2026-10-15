import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {examples} from '../frontend/src/games/ottv2/botExamples.js';
const cwd=fileURLToPath(new URL('..',import.meta.url));
async function start(data,extra={}){
 const child=spawn(process.execPath,['-e',`const {server}=require('./logic/server');server.listen(0,'127.0.0.1',()=>console.log(server.address().port));`],{cwd,env:{...process.env,DATA_DIR:data,SERVE_FRONTEND:'false',...extra},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',c=>stderr+=c);
 const port=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>{child.kill();reject(Error('Server startup timeout: '+stderr));},10000);child.stdout.on('data',c=>{text+=c;if(text.includes('\n')){clearTimeout(timer);resolve(Number(text.trim()));}});child.once('exit',()=>{clearTimeout(timer);reject(Error('Server startup failed: '+stderr));});});
 return {api:async(route,body)=>{const res=await fetch(`http://127.0.0.1:${port}${route}`,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()};},stop:async()=>{const exited=once(child,'exit');child.kill();await exited;}};
}
test('server history and complete replay survive restart; history is scoped and omits source',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ott-history-test-'));let service;
 try{
  service=await start(directory);const {api}=service;
  const body={clientId:'history-owner',language:'python',source:examples.python};
  const w=await api('/api/submissions',{...body,playerId:'white'}),b=await api('/api/submissions',{...body,playerId:'black'});
  const created=await api('/api/matches',{clientId:body.clientId,whiteSubmissionId:w.data.id,blackSubmissionId:b.data.id,mapId:'small-5',config:{maxTurns:2}});assert.equal(created.status,202);
  let match;for(let i=0;i<200;i++){match=(await api('/api/matches/'+created.data.id)).data;if(['finished','failed'].includes(match.status))break;await new Promise(r=>setTimeout(r,30));}
  assert.equal(match.status,'finished',match.error);const before=await api('/api/matches/'+match.id+'/replay');
  await service.stop();service=await start(directory);
  const history=await service.api('/api/submission-history?clientId=history-owner');assert.equal(history.data.records.length,1);assert.equal(history.data.records[0].id,match.id);assert.equal(history.data.records[0].result.reason,'move-limit-draw');assert.ok(!JSON.stringify(history.data).includes('choose_move'));
  assert.equal((await service.api('/api/submission-history?clientId=another-client')).data.records.length,0);
  assert.deepEqual((await service.api('/api/matches/'+match.id+'/replay')).data,before.data);
 }finally{await service?.stop();await fs.rm(directory,{recursive:true,force:true});}
});
test('missing Python is an infrastructure error before queueing, without a false winner',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ott-runtime-test-'));let service;
 try{
  service=await start(directory,{OTTV2_PYTHON:'/does-not-exist/python'});const {api}=service;
  assert.equal((await api('/api/runtime')).data.languages.python.available,false);
  const body={clientId:'owner',language:'python',source:examples.python};
  const w=await api('/api/submissions',{...body,playerId:'w'}),b=await api('/api/submissions',{...body,playerId:'b'});
  const result=await api('/api/matches',{clientId:'owner',whiteSubmissionId:w.data.id,blackSubmissionId:b.data.id});assert.equal(result.status,503);assert.equal(result.data.code,'RUNTIME_UNAVAILABLE');assert.match(result.data.error,/Python 3/);
  assert.deepEqual((await api('/api/submission-history?clientId=owner')).data.records,[]);
 }finally{await service?.stop();await fs.rm(directory,{recursive:true,force:true});}
});
