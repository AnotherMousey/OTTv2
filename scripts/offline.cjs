// Run after prebuilding images on an Internet-connected machine.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
if(!fs.existsSync(path.join(root,'.env')))throw Error('Copy .env.example to .env and set local secrets first.');
const check=spawnSync('docker',['image','inspect','ottv2-api:offline','ottv2-runner:offline','ottv2-bot:latest','mysql:8.4'],{cwd:root,stdio:'ignore'});
if(check.status!==0)throw Error('Missing offline images. Run npm run offline:prepare before disconnecting.');
const result=spawnSync('docker',['compose','--env-file','.env','-f','compose.offline.yaml','up','-d','--no-build','--pull','never'],{cwd:root,stdio:'inherit'});
process.exitCode=result.status||0;
