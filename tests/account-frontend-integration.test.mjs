import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {examples} from '../frontend/src/games/ottv2/botExamples.js';
test('live frontend contract: CORS, accounts, self join, code, round scoring, bye, restart, logout', async()=>{
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'ott-account-merge-'));let child;
 async function start(){
  child=spawn(process.execPath,['-e',"const {server}=require('./logic/server');server.listen(0,'127.0.0.1',()=>console.log(server.address().port))"],{cwd:path.resolve(new URL('..',import.meta.url).pathname),env:{...process.env,DATA_DIR:data,SERVE_FRONTEND:'false',OPERATOR_USERNAME:'merge-judge',OPERATOR_PASSWORD:'merge-password',ALLOWED_ORIGINS:'https://arena.example'},stdio:['ignore','pipe','pipe']});
  const port=await new Promise((resolve,reject)=>{let out='';let err='';child.stderr.on('data',c=>err+=c);child.stdout.on('data',c=>{out+=c;if(out.includes('\n'))resolve(Number(out.trim()));});child.once('exit',()=>reject(Error(err)));});
  return async(route,body,token,method)=>{const response=await fetch(`http://127.0.0.1:${port}${route}`,{method:method||(body===undefined?'GET':'POST'),headers:{'Content-Type':'application/json',Origin:'https://arena.example',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,headers:response.headers,data:response.status===204?null:await response.json()};};
 }
 async function stop(){const exit=once(child,'exit');child.kill();await exit;child=null;}
 try{
  let api=await start();
  const cors=await api('/api/auth/me',undefined,undefined,'OPTIONS');assert.equal(cors.status,204);assert.match(cors.headers.get('access-control-allow-headers'),/Authorization/);
  const judge=(await api('/api/auth/login',{username:'merge-judge',password:'merge-password'})).data.token;assert.ok(judge);
  assert.equal((await api('/api/auth/login',{username:'merge-judge',password:'x'})).status,400);
  for(const username of ['merge-one','merge-two','merge-three'])assert.equal((await api('/api/accounts',{username,password:'player-password'},judge)).status,201);
  const tokens=[];for(const username of ['merge-one','merge-two','merge-three'])tokens.push((await api('/api/auth/login',{username,password:'player-password'})).data.token);
  assert.equal((await api('/api/auth/me',undefined,tokens[0])).data.account.username,'merge-one');
  assert.equal((await api('/api/tournaments',{id:'merge-open',rounds:2},judge)).status,201);
  assert.equal((await api('/api/tournaments/merge-open/register',{})).status,401);
  assert.equal((await api('/api/tournaments/merge-open/register',{username:'merge-two'},tokens[0])).status,403);
  for(const token of tokens){assert.equal((await api('/api/tournaments/merge-open/register',{coefficient:9999},token)).status,200);assert.equal((await api('/api/tournaments/merge-open/code',{source:examples.python,language:'python'},token)).status,200);}
  assert.equal((await api('/api/tournaments/merge-open/code',{username:'merge-two',source:examples.python,language:'python'},tokens[0])).status,403);
  assert.equal((await api('/api/tournaments/merge-open')).data.players[0].coefficient,1000);
  assert.equal((await api('/api/tournaments/merge-open/next-round',{},tokens[0])).status,403);
  assert.equal((await api('/api/tournaments/merge-open/next-round',{},judge)).status,200);
  async function finished(){let state;for(let i=0;i<400;i++){state=(await api('/api/tournaments/merge-open')).data;if(state.pairings.filter(p=>p.round===state.currentRound).every(p=>['finished','bye'].includes(p.status)))return state;await new Promise(r=>setTimeout(r,30));}throw Error('Round did not complete: '+JSON.stringify(state));}
  const first=await finished();assert.equal(first.players.reduce((n,p)=>n+p.wins+p.draws+p.losses,0),3);
  assert.deepEqual((await api('/api/tournaments/merge-open')).data.players,first.players);
  assert.equal((await api('/api/tournaments/merge-open/next-round',{},judge)).status,200);
  const final=await finished();assert.equal(final.status,'finished');assert.equal(final.players.reduce((n,p)=>n+p.wins+p.draws+p.losses,0),6);
  assert.deepEqual((await api('/api/tournaments/merge-open')).data.players,final.players);
  assert.equal((await api('/api/auth/logout',{},tokens[0])).status,200);assert.equal((await api('/api/auth/me',undefined,tokens[0])).status,401);
  await stop();api=await start();assert.deepEqual((await api('/api/tournaments/merge-open')).data.players,final.players);
 }finally{if(child)await stop();await fs.rm(data,{recursive:true,force:true});}
});
