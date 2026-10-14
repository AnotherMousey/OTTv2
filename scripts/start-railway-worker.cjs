const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function run(args){const result=spawnSync('docker',args,{cwd:root,env:process.env,stdio:'inherit'});if(result.error)throw Error('Docker is unavailable. Start Docker Desktop with Linux containers or Docker Engine.');if(result.status!==0)throw Error('Docker command failed. Check the output above.');}
try{
 process.loadEnvFile(path.join(root,'.env'));
 const url=new URL(process.env.DATABASE_URL||'');
 if(url.protocol!=='mysql:'||!url.hostname||url.hostname.endsWith('.railway.internal'))throw Error('DATABASE_URL must use your public Railway MySQL hostname and port.');
 if(!process.env.RUNNER_SECRET){
  const secret=crypto.randomBytes(32).toString('hex');
  const envPath=path.join(root,'.env');
  const old=fs.readFileSync(envPath,'utf8').split(/\r?\n/).filter(line=>!/^\s*RUNNER_SECRET\s*=/.test(line)).join('\n');
  fs.writeFileSync(envPath,old+'\nRUNNER_SECRET='+secret+'\n',{mode:0o600});
  process.env.RUNNER_SECRET=secret;
  console.log('Created a local runner secret in the ignored .env file.');
 }
 if(process.env.RUNNER_SECRET.length<32)throw Error('RUNNER_SECRET must contain at least 32 characters.');
 run(['info','--format','{{.ServerVersion}}']);
 run(['build','-f','services/runner/Bot.Dockerfile','-t','ottv2-bot:latest','.']);
 run(['compose','--env-file','.env','-f','compose.railway-worker.yaml','up','-d','--build','--wait','--wait-timeout','120']);
 console.log('Worker and runner started. Your computer must remain on for this demo.');
 console.log('Check processing with: npm run queue:check');
}catch(error){console.error(error.message);process.exitCode=1;}
