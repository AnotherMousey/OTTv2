const {test}=require('node:test'),assert=require('node:assert/strict');
const {digest,validateManifest,validatePart}=require('../sync/bundle.cjs');
const {freezeConfig}=require('../platform/game-integration.cjs');
const {fixture}=require('./sync-fixture.cjs');
test('bundle checks catch tampering, unsupported versions, duplicate identities and ownership mismatch',()=>{
 const {manifest,part}=fixture();assert.equal(validateManifest(manifest).length,64);validatePart(part,manifest);assert.equal(digest({b:2,a:1}),digest({a:1,b:2}));
 assert.throws(()=>validatePart({...part,frames:[]},manifest),/checksum/);assert.throws(()=>validateManifest({...manifest,version:2}));assert.throws(()=>validateManifest({...manifest,participants:[manifest.participants[0],manifest.participants[0]]}),/Duplicate/);
 part.match.blackSubmissionId='bot-a';manifest.matches[0].digest=digest(part);assert.throws(()=>validatePart(part,manifest),/ownership/);
});
test('actual sync service resumes interrupted imports, rejects conflicts and never writes user ratings',async()=>{
 const {prisma}=require('../shared/db.cjs'),service=require('../sync/service.cjs');const {manifest,part}=fixture();let state={receipt:null,tournament:null,matches:[],parts:[],frames:[]};
 const original=prisma.$transaction;let userWrites=0;
 prisma.$transaction=async fn=>{const draft=structuredClone(state),tx={
  $queryRaw:async()=>[],user:{findMany:async()=>[{id:'web-a'},{id:'web-b'}],update:async()=>{userWrites++;}},
  syncReceipt:{findUnique:async()=>draft.receipt,create:async({data})=>draft.receipt=data,update:async({data})=>Object.assign(draft.receipt,data)},
  tournament:{findUnique:async()=>draft.tournament,create:async({data})=>draft.tournament=data,update:async({data})=>Object.assign(draft.tournament,data)},
  submission:{count:async()=>0,createMany:async()=>{}},entry:{createMany:async()=>{}},
  match:{count:async()=>draft.matches.length,create:async({data})=>draft.matches.push(data),findMany:async()=>draft.matches},
  syncPart:{findUnique:async()=>draft.parts[0]||null,count:async()=>draft.parts.length,create:async({data})=>draft.parts.push(data)},
  frame:{createMany:async({data})=>draft.frames.push(...data)},audit:{create:async()=>{}}
 };const result=await fn(tx);state=draft;return result;};
 const accountMap={'local-a':'web-a','local-b':'web-b'},req={user:{id:'judge',role:'judge'},params:{id:manifest.tournament.id},body:{manifest,accountMap}},res={json:value=>value};const invoke=async(fn,request)=>{let response;await fn(request,{json:value=>{response=value;}});return response;};
 try{
  assert.equal((await invoke(service.begin,req)).resumed,false);assert.equal((await invoke(service.begin,req)).resumed,true);
  await assert.rejects(service.complete(req,res),/Upload all/);assert.equal(state.tournament.phase,'importing');
  const changed=structuredClone(manifest);changed.tournament.name='Conflict';await assert.rejects(service.begin({...req,body:{manifest:changed,accountMap}},res),/conflict/);
  await assert.rejects(service.begin({...req,body:{manifest,accountMap:{'local-a':'web-b','local-b':'web-a'}}},res),/conflict/);
  const upload={...req,body:{part}};assert.equal((await invoke(service.uploadPart,upload)).duplicate,false);assert.equal((await invoke(service.uploadPart,upload)).duplicate,true);
  await service.complete(req,res);await service.complete(req,res);assert.equal(state.tournament.phase,'finished');assert.equal(state.matches.length,1);assert.equal(state.frames.length,1);assert.equal(state.matches[0].whiteId,'web-a');assert.equal(state.matches[0].rated,true);assert.equal(userWrites,0);
 }finally{prisma.$transaction=original;await prisma.$disconnect();}
});
module.exports={fixture};
