import {test} from 'node:test';
import assert from 'node:assert/strict';
import {entryLoginRoute,tournamentRoute,tournamentTarget,loginDestination,requestTournamentEntry,
  expiredSessionDestination,replaceRoute,unavailableTournament} from './tournamentNavigation.js';
import {loginWithRefresh} from './loginFlow.js';
import {request,storeSession,session} from './api/platformApi.js';

test('guest entry redirects without joining; successful login returns to that tournament without registration', async()=>{
  let route='tournament', joins=0, selected='campus-cup';
  requestTournamentEntry({user:null,tournamentId:selected,join:()=>joins++,go:next=>route=next});
  assert.equal(joins,0);assert.equal(tournamentTarget(route).id,selected);
  const account=await loginWithRefresh({authenticate:async()=>({id:'alice',role:'player'}),
    onAuthenticated:()=>{},refresh:()=>{},onRefreshError:assert.fail});
  route=loginDestination(route);
  assert.equal(route,tournamentRoute(selected));assert.equal(joins,0);
  // Entry is a separate, explicit action after sign-in.
  requestTournamentEntry({user:account,tournamentId:selected,join:()=>joins++,go:assert.fail});
  assert.equal(joins,1);
});

test('cancellation replaces the login URL and plain future login has no stale return target',()=>{
  const login=entryLoginRoute('cup'),target=tournamentTarget(login);
  let current=login;const unrelated={scroll:123,tab:'saved'};
  const original=Object.getOwnPropertyDescriptor(globalThis,'window');
  const surface=new EventTarget();surface.history={state:unrelated,replaceState:(state,title,url)=>{
    assert.equal(state,unrelated);current=url.slice(1);
  }};
  Object.defineProperty(globalThis,'window',{value:surface,configurable:true});
  try{
    replaceRoute(tournamentRoute(target.id));
    assert.equal(current,tournamentRoute('cup'));
    assert.equal(loginDestination('login'),'home');
    assert.equal(surface.history.state,unrelated);
  }finally{if(original)Object.defineProperty(globalThis,'window',original);else delete globalThis.window;}
});

test('authenticated students join once without navigation; Judges cannot auto-enter',()=>{
  let joined=0;
  requestTournamentEntry({user:{role:'player'},tournamentId:'cup',join:()=>joined++,go:assert.fail});
  assert.equal(joined,1);
  requestTournamentEntry({user:{role:'judge'},tournamentId:'cup',join:()=>joined++,go:assert.fail});
  assert.equal(joined,1);
});

test('invalid, expired and external return targets safely fall back to the directory',()=>{
  const now=Date.now();
  for(const route of [
    'login?returnTo=https://evil.example&tournamentId=cup&at='+now,
    'login?returnTo=tournament&tournamentId=%2Fapi%2Fprivate&at='+now,
    'login?returnTo=tournament&tournamentId=&at='+now,
    entryLoginRoute('cup',now-16*60*1000),
    entryLoginRoute('cup',now+60000),
  ]){assert.equal(tournamentTarget(route,now).invalid,true);assert.equal(loginDestination(route,now),'tournaments');}
  assert.equal(tournamentTarget('tournament?tournamentId=%20').invalid,true);
  assert.match(unavailableTournament({status:404}),/unavailable/);
  assert.match(unavailableTournament({status:403}),/unavailable/);
  assert.match(unavailableTournament(Error('offline')),/Try again/);
});

test('session expiry preserves tournament context but does not replace unrelated routes',()=>{
  const next=expiredSessionDestination('tournament?tournamentId=cup','cup');
  assert.equal(tournamentTarget(next).id,'cup');
  for(const route of ['api','watch?tournament=other','settings','login'])
    assert.equal(expiredSessionDestination(route,'cup'),null);
});

function apiEnvironment(t){
  const saved=new Map();
  for(const [key,value] of Object.entries({
    sessionStorage:(()=>{const data=new Map();return {getItem:key=>data.get(key)||null,
      setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};})(),
    window:new EventTarget(),
  })){
    saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{value,configurable:true});
  }
  t.after(()=>{for(const [key,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  let expired=0;window.addEventListener('ott-session-expired',()=>expired++);
  return ()=>expired;
}
const unauthorized=()=>new Response(JSON.stringify({error:'Log in to continue.'}),{status:401,headers:{'Content-Type':'application/json'}});

test('a guest 401 does not masquerade as session expiry or clear navigation',async t=>{
  const expired=apiEnvironment(t);t.mock.method(globalThis,'fetch',async()=>unauthorized());
  await assert.rejects(request('/api/tournaments/cup/join',{method:'POST',body:{}}),{status:401});
  assert.equal(expired(),0);
});

test('real session expiry clears the token; rejected login credentials do not expire another session',async t=>{
  const expired=apiEnvironment(t);t.mock.method(globalThis,'fetch',async()=>unauthorized());
  storeSession({token:'saved'});
  await assert.rejects(request('/api/auth/login',{method:'POST',body:{}}),{status:401});
  assert.equal(expired(),0);assert.equal(session().token,'saved');
  await assert.rejects(request('/api/auth/me'),{status:401});
  assert.equal(expired(),1);assert.equal(session(),null);
});

test('a late 401 from an older request cannot clear a newer login',async t=>{
  const expired=apiEnvironment(t);let resolve;
  t.mock.method(globalThis,'fetch',()=>new Promise(r=>resolve=r));
  storeSession({token:'old'});const pending=request('/api/auth/me');
  storeSession({token:'new'});resolve(unauthorized());
  await assert.rejects(pending,{status:401});
  assert.equal(session().token,'new');assert.equal(expired(),0);
});
