// Export/import only through authenticated APIs. Never connects to a target DB.
const fs=require('node:fs/promises'),path=require('node:path');
const {validateManifest,validatePart}=require('../services/sync/bundle.cjs');
async function main(){
 const [action,baseArg,eventOrFolder,folderOrMap]=process.argv.slice(2);
 if(!['export','plan','import'].includes(action)||!baseArg||!eventOrFolder)throw Error('Usage: npm run sync -- export URL EVENT_ID FOLDER | plan URL FOLDER | import URL FOLDER REVIEWED_MAP.json');
 const base=new URL(baseArg);if(!['http:','https:'].includes(base.protocol)||base.username||base.password)throw Error('Expected an HTTP(S) API URL without credentials.');
 if(!process.env.SYNC_TOKEN)throw Error('Set SYNC_TOKEN to an organizing judge login token; never put it in the command line.');
 async function call(route,body){const response=await fetch(new URL(route,base),{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+process.env.SYNC_TOKEN,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(180000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Sync request failed ('+response.status+').');return result;}
 if(action==='export'){
  if(!folderOrMap)throw Error('Specify output folder.');const folder=path.resolve(folderOrMap);await fs.mkdir(folder,{recursive:true});
  const manifest=await call('/api/tournaments/'+encodeURIComponent(eventOrFolder)+'/export');validateManifest(manifest);
  for(const descriptor of manifest.matches){const part=await call('/api/tournaments/'+encodeURIComponent(eventOrFolder)+'/export/'+encodeURIComponent(descriptor.id));validatePart(part,manifest);await fs.writeFile(path.join(folder,descriptor.id+'.json'),JSON.stringify(part));}
  // The manifest is written last, so an interrupted export is not a complete bundle.
  await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({exported:manifest.matches.length,folder}));
 }else{
  const folder=path.resolve(eventOrFolder),manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));validateManifest(manifest);
  if(action==='plan'){const plan=await call('/api/sync/plan',{manifest});await fs.writeFile(path.join(folder,'mapping-review.json'),JSON.stringify(plan,null,2));console.log('Review mapping-review.json, then create a sourceId-to-candidate.id JSON object for import.');return;}
  if(!folderOrMap)throw Error('Supply an explicitly reviewed account mapping JSON file.');
  const accountMap=JSON.parse(await fs.readFile(folderOrMap,'utf8'));
  // Validate the entire archive before starting remote writes.
  for(const descriptor of manifest.matches){const text=await fs.readFile(path.join(folder,descriptor.id+'.json'),'utf8');if(Buffer.byteLength(text)>31*1024*1024)throw Error('Match part exceeds 31 MiB.');validatePart(JSON.parse(text),manifest);}
  const begun=await call('/api/sync/begin',{manifest,accountMap});
  if(!begun.complete){for(const descriptor of manifest.matches){const part=JSON.parse(await fs.readFile(path.join(folder,descriptor.id+'.json'),'utf8'));await call('/api/sync/'+encodeURIComponent(begun.id)+'/part',{part});}await call('/api/sync/'+encodeURIComponent(begun.id)+'/complete',{});}
  console.log(JSON.stringify({imported:begun.id,matches:manifest.matches.length,globalEloApplied:false}));
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
