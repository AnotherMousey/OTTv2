import {ParticipantAvatar} from './ParticipantAvatar.jsx';
import {LoginDuel} from './CharacterStudio.jsx';
import React,{useState,useEffect,useRef} from 'react';
import {useAccounts} from './PreviewAccounts.jsx';
import {Pixel} from './Pixel.jsx';
import {Button} from './ui.jsx';
import {PasswordField} from './AccountControls.jsx';
import {request} from './api/platformApi.js';
import {Pagination} from './Pagination.jsx';
import {TournamentWorkspace,EventPicker} from './TournamentWorkspace.jsx';
const signed=n=>n>0?`+${n}`:String(n);
export function LoginGate({go}){return <section className="card account-gate"><Pixel className="heading-sprite"/><span className="eyebrow">ORGANIZER ACCOUNT</span><h1>LOG IN TO CONTINUE</h1><p>Use the account provided by your tournament organizer.</p><Button onClick={()=>go('login')}>Log in ↗</Button></section>;}
export function LoginPage({go}){
 const [registrationOpen,setRegistrationOpen]=useState(false);
 useEffect(()=>{let active=true;request('/api/auth/registration').then(data=>{if(active)setRegistrationOpen(data.enabled);}).catch(()=>{});return()=>{active=false;};},[]);
 const {login,user,authChecking}=useAccounts(),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(() => {
  if (user && !authChecking) go('home');
 }, [user, authChecking]);
 async function submit(e){e.preventDefault();setError('');setBusy(true);try{const account=await login(username,password);go('home');}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(user)return <section className="card account-gate" role="status" aria-busy="true"><h1>OPENING WORKSPACE</h1><p>You are logged in.</p></section>;
 return <div className="account-features"><div className="account-login-layout"><section className="login-intro"><span className="eyebrow">OTTv2 / TOURNAMENT ACCOUNTS</span><h1>YOUR ACCOUNT<br/>YOUR NEXT MOVE<span className="yellow-dot">.</span></h1><p>Your organizer gives you an account. Log in, join the tournament, and let the judge assign your opponent.</p><LoginDuel/><span className="account-note">{registrationOpen?'Player registration is open.':'Accounts are issued by the organizer.'}</span></section><form className="card account-login-form" onSubmit={submit}><span className="eyebrow">WELCOME BACK</span><h2>LOG IN</h2><label>Username<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required disabled={busy}/></label><PasswordField id="login-password" label="Password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" disabled={busy} error={error} describedBy={error?'login-error':undefined}/>{error&&<p id="login-error" className="inline-error" role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy?'Checking account…':<>Log in <span className="pixel-arrow" aria-hidden="true"/></>}</Button>{registrationOpen&&<button type="button" className="register-login-link" onClick={()=>go('register')}>Create a player account ↗</button>}<p className="account-note">Need account help? Contact your organizer.</p></form></div></div>;
}
export {PlayerMenu as AccountControl} from './PlayerMenu.jsx';
export function TournamentAccountPage({go}){return <TournamentWorkspace go={go}/>;}
export function AccountRankings(){
 const {rankings,user,tournament}=useAccounts(),[query,setQuery]=useState('');
 const {rankPage,paginate,busy}=useAccounts();
 const visible=rankings.filter(p=>p.name.toLowerCase().includes(query.toLowerCase()));
 return <><EventPicker/><div className="page-heading"><div><span className="eyebrow">{tournament.name.toUpperCase()} / LIVE STANDINGS</span><h1>THE LEADERBOARD</h1></div><span className="status">ROUND {tournament.round}</span></div><div className="ranking-intro"><p>Ratings and ranks update after the engine finalizes a tournament match.</p><label>Find a player on this page<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search players…"/></label></div><div className="table-wrap"><table className="account-rankings"><thead><tr><th>Rank</th><th>Player</th><th>Elo</th><th>Last change</th><th>Games</th><th>Entry</th></tr></thead><tbody>{visible.map(p=><tr key={p.id} className={user?.id===p.id?'your-team':''}><td>{String(p.rank||rankings.findIndex(r=>r.id===p.id)+1).padStart(2,'0')}</td><td><ParticipantAvatar participant={p}/><b>{p.name}</b>{user?.id===p.id&&<small className="you-label">YOU</small>}</td><td><b>{p.rating}</b></td><td className={p.lastDelta>0?'elo-up':p.lastDelta<0?'elo-down':''}>{p.lastDelta?signed(p.lastDelta):'—'}</td><td>{p.games}</td><td>{p.joined?'Joined':'Not joined'}</td></tr>)}</tbody></table>{!visible.length&&<div className="empty">No player matches that name.</div>}</div><details className="rating-explanation"><summary>How ratings are calculated</summary><p>Elo with K = 32. A win scores 1, a draw 0.5, and a loss 0. Expected score = 1 / (1 + 10^((opponent rating − own rating) / 400)). The rounded rating change is added to one player and subtracted from the other. Confirming the same match twice is blocked.</p><p>Tournament results update Elo once, after the server finalizes the match. Practice matches do not affect Elo.</p></details><Pagination offset={rankPage.offset} total={rankPage.total} onChange={offset=>paginate('rankOffset',offset)} busy={busy} label="players"/></>;
}
