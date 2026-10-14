const {test}=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');
const {runnerReady}=require('../worker/index.cjs');
test('runner health rejects unavailable or saturated execution before claiming work',async()=>{
 let active=0;const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,active}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));process.env.RUNNER_URL='http://127.0.0.1:'+server.address().port;
 try{assert.equal(await runnerReady(),true);active=2;await new Promise(resolve=>setTimeout(resolve,1050));assert.equal(await runnerReady(),false);}
 finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 await new Promise(resolve=>setTimeout(resolve,1050));assert.equal(await runnerReady(),false);
});
