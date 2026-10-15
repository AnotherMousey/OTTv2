import {test} from 'node:test';import assert from 'node:assert/strict';import {loginWithRefresh} from './loginFlow.js';
test('directory failure after authentication preserves a successful login',async()=>{
 const account={id:'player',role:'player'},calls=[];const result=await loginWithRefresh({authenticate:async()=>account,onAuthenticated:u=>calls.push(u.id),refresh:async()=>{throw Error('Database schema is outdated');},onRefreshError:e=>calls.push(e.message)});assert.equal(result,account);assert.deepEqual(calls,['player','Database schema is outdated']);
});
test('invalid credentials still reject without refreshing protected data',async()=>{
 let refreshed=false;await assert.rejects(loginWithRefresh({authenticate:async()=>{throw Error('Invalid credentials');},onAuthenticated:()=>assert.fail(),refresh:async()=>refreshed=true,onRefreshError:()=>assert.fail()}),/Invalid credentials/);assert.equal(refreshed,false);
});
