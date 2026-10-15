const {test}=require('node:test'),assert=require('node:assert/strict');
const {abortable,ExecutionScope}=require('../runner/execution-scope.cjs');
test('non-cooperating plugin promise releases its slot on deadline and late bot startup is cleaned',async()=>{
 const controller=new AbortController();let finish,startStops=0;const scope=new ExecutionScope(()=>new Promise(r=>finish=r),async()=>startStops++,controller.signal);
 const startup=scope.factory('source');const task=abortable(new Promise(()=>{}),controller.signal);controller.abort();await assert.rejects(task,/cancelled/);await scope.close();finish({});await assert.rejects(startup,/startup/);assert.equal(startStops,1);
});
test('scope closes leaked players once and explicit cleanup remains idempotent',async()=>{const controller=new AbortController();let stops=0;const scope=new ExecutionScope(async()=>({}),async()=>stops++,controller.signal);const a=await scope.factory();await scope.factory();await scope.stop(a);await scope.close();await scope.close();assert.equal(stops,2);});
