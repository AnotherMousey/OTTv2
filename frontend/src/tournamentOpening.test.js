import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTournamentOpening} from './tournamentOpening.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(){
 const controller=createTournamentOpening(),pending=[],errors=[],destinations=[];
 let route='#tournaments';
 const args=(id,select)=>({id,target:'tournament',select,navigate:target=>destinations.push(target),
   getRoute:()=>route,onPending:value=>pending.push(value),onError:error=>errors.push(error)});
 return {controller,pending,errors,destinations,args,leave:()=>route='#api'};
}
test('opening feedback is immediate, completion navigates without a timer or extra fetch',async()=>{
 const f=fixture(),response=deferred();let calls=0;
 const promise=f.controller.open(f.args('a',()=>{calls++;return response.promise;}));
 assert.deepEqual(f.pending,['a']);assert.deepEqual(f.destinations,[]);
 response.resolve(true);assert.equal(await promise,true);
 assert.deepEqual(f.destinations,['tournament']);assert.deepEqual(f.pending,['a','']);assert.equal(calls,1);
});
test('repeated clicks on one pending tournament are coalesced synchronously',async()=>{
 const f=fixture(),response=deferred();let calls=0;const options=f.args('a',()=>{calls++;return response.promise;});
 const first=f.controller.open(options);
 assert.equal(await f.controller.open(options),false);assert.equal(calls,1);
 response.resolve(true);await first;assert.equal(f.destinations.length,1);
});
test('new selections abort earlier work and ignore late out-of-order success',async()=>{
 const f=fixture(),a=deferred(),b=deferred();let oldSignal;
 const first=f.controller.open(f.args('a',(id,{signal})=>{oldSignal=signal;return a.promise;}));
 const second=f.controller.open({...f.args('b',()=>b.promise),target:'mybot'});
 assert.equal(oldSignal.aborted,true);assert.deepEqual(f.pending,['a','b']);
 b.resolve(true);await second;a.resolve(true);await first;
 assert.deepEqual(f.destinations,['mybot']);assert.deepEqual(f.errors,[]);
});
test('late failures cannot replace the current selection’s feedback',async()=>{
 const f=fixture(),a=deferred(),b=deferred();
 const first=f.controller.open(f.args('a',()=>a.promise));const second=f.controller.open(f.args('b',()=>b.promise));
 a.reject(Error('old failure'));await first;assert.deepEqual(f.errors,[]);
 b.resolve(true);await second;
});
test('leaving the route prevents a late navigation even before unmount cleanup',async()=>{
 const f=fixture(),response=deferred();let isCurrent;
 const promise=f.controller.open(f.args('a',(id,options)=>{isCurrent=options.isCurrent;return response.promise;}));
 assert.equal(isCurrent(),true);f.leave();assert.equal(isCurrent(),false);response.resolve(true);assert.equal(await promise,false);assert.deepEqual(f.destinations,[]);
});
test('cleanup cancels the request without updating an unmounted component',async()=>{
 const f=fixture(),response=deferred();let signal;
 const promise=f.controller.open(f.args('a',(id,options)=>{signal=options.signal;return response.promise;}));
 f.controller.cancel();response.reject(Error('cancelled'));await promise;
 assert.equal(signal.aborted,true);assert.deepEqual(f.pending,['a']);assert.deepEqual(f.errors,[]);
});
test('failed requests restore actions and permit an explicit fresh retry',async()=>{
 const f=fixture(),error=Object.assign(Error('Unavailable'),{status:404});
 assert.equal(await f.controller.open(f.args('a',async()=>{throw error;})),false);
 assert.deepEqual(f.errors,[error]);assert.deepEqual(f.pending,['a','']);
 assert.equal(await f.controller.open(f.args('a',async()=>true)),true);
 assert.equal(f.destinations.length,1);
});
test('an uncommitted selection does not navigate to old tournament data',async()=>{
 const f=fixture();assert.equal(await f.controller.open(f.args('a',async()=>false)),false);
 assert.deepEqual(f.destinations,[]);assert.equal(f.errors.length,1);
});
