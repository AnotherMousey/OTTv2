const {spawnSync}=require('node:child_process');const path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const args of [['pull','mysql:8.4'],['build','-t','ottv2-bot:latest','-f','services/runner/Bot.Dockerfile','.'],['build','-t','ottv2-api:offline','.'],['build','-t','ottv2-runner:offline','-f','services/runner/Runner.Dockerfile','.']]){const result=spawnSync('docker',args,{cwd:root,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
console.log('Offline images ready. Start with npm run offline.');
