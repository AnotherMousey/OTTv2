import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {login as loginAccount,logout as logoutAccount,readAuthSession,clearAuthSession,accountRequest} from './api/authApi.js';
import {getTournament,joinTournament,startRound,uploadTournamentBot,createTournament} from './api/tournamentApi.js';
const Context=createContext(null);
// Keep the component name to minimize changes to the approved frontend.
export function PreviewAccounts({children}) {
 const [account,setAccount]=useState(null),[tournament,setTournament]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),tournamentVersion=useRef(0);
 useEffect(()=>{
  const controller=new AbortController();let active=true,polling=false;
  const expired=()=>{generation.current++;setAccount(null);setError('Your session expired. Please log in again.');};
  window.addEventListener('ott-auth-expired',expired);
  async function boot(){
   const version=generation.current;
   try {if(readAuthSession()){const data=await accountRequest('/api/auth/me',{signal:controller.signal});if(active&&version===generation.current)setAccount(data.account);}}
   catch(e){if(active&&e.name!=='AbortError'){clearAuthSession();setError(e.message);}}
   finally{if(active)setLoading(false);}
  }
  async function poll(){
   if(polling)return;polling=true;const version=tournamentVersion.current;
   try{const data=await getTournament(controller.signal);if(active&&version===tournamentVersion.current){setTournament(data);setError('');}}
   catch(e){if(active&&e.name!=='AbortError')setError(e.message);}
   finally{polling=false;}
  }
  boot();poll();const timer=setInterval(poll,4000);
  return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('ott-auth-expired',expired);};
 },[]);
 async function login(username,password){generation.current++;const data=await loginAccount(username,password);setAccount(data.account);setError('');}
 async function logout(){generation.current++;setAccount(null);try{await logoutAccount();}catch(e){setError(e.message);}}
 async function mutate(action){setBusy(true);setError('');tournamentVersion.current++;try{const data=await action();setTournament(data.tournament||data);return data;}catch(e){setError(e.message);throw e;}finally{setBusy(false);}}
 const act=action=>()=>{mutate(action).catch(()=>{});};
 const players=(tournament?.players||[]).map(p=>({...p,id:p.username,name:p.username,rating:p.coefficient,joined:true,games:p.wins+p.draws+p.losses}));
 const user=account?{id:account.username,name:account.username,role:account.role==='operator'?'judge':'player',rating:players.find(p=>p.id===account.username)?.rating??1000,joined:players.some(p=>p.id===account.username)}:null;
 const rankings=[...players].sort((a,b)=>b.points-a.points||b.rating-a.rating||a.name.localeCompare(b.name));
 const pairs=(tournament?.pairings||[]).filter(p=>p.round===tournament.currentRound).map(p=>({...p,id:p.matchId||`bye-${p.round}-${p.white}`,score:p.match?.replay?.result?.winner==='white'?1:p.match?.replay?.result?.winner==='black'?0:.5}));
 return <Context.Provider value={{user,login,logout,loading,busy,error,tournament:tournament?{...tournament,players,pairs,round:tournament.currentRound||1}:null,rankings,join:act(joinTournament),assign:act(startRound),nextRound:act(startRound),create:act(createTournament),uploadBot:(source,language)=>mutate(()=>uploadTournamentBot(source,language))}}>{children}</Context.Provider>;
}
export function useAccounts(){return useContext(Context);}
