const { spawn } = require('child_process');
const path = require('path');
const children = [
  spawn(process.execPath, ['logic/main.js'], { stdio: 'inherit' }),
  spawn(process.execPath, [path.join(__dirname, '../frontend/node_modules/vite/bin/vite.js'), '--host', '127.0.0.1'], { cwd: path.join(__dirname, '../frontend'), stdio: 'inherit' }),
];
let stopped = false;
function stop(code=0) { if(stopped)return; stopped=true; for(const c of children)c.kill(); process.exitCode=code; }
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
for(const c of children) { c.on('error', e=>{console.error(e.message);stop(1);});c.on('exit',code=>stop(code||0)); }
