import React,{useState,useEffect} from 'react';
import {useAccounts} from './PreviewAccounts.jsx';
import {Button} from './ui.jsx';
import {Pixel} from './Pixel.jsx';
import {Pagination} from './Pagination.jsx';
import {ParticipantAvatar} from './ParticipantAvatar.jsx';
import {post,request} from './api/platformApi.js';
import {EventPicker,Entries,Settings} from './TournamentWorkspace.jsx';
import {TournamentManagementActions} from './TournamentManagementActions.jsx';
import {entryWindow} from './tournamentModel.js';
import {SourceViewer,TournamentSourcePanel} from './TournamentSourcePanel.jsx';
import './dailyTournament.css';
export const isDailyTournament=t=>t.format==='daily-round-robin';
export function useServerClock(t){
 const [clock,setClock]=useState(()=>({server:Date.parse(t.serverNow)||Date.now(),received:Date.now(),now:Date.now()}));
 useEffect(()=>setClock({server:Date.parse(t.serverNow)||Date.now(),received:Date.now(),now:Date.now()}),[t.serverNow,t.id]);
 useEffect(()=>{const timer=setInterval(()=>setClock(c=>({...c,now:Date.now()})),1000);return()=>clearInterval(timer);},[]);
 return clock.server+clock.now-clock.received;
}
const shortDate=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value+'T00:00:00+07:00'));
const dateTime=value=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value)):'Not yet published';
export function DailyScheduleNotice(){
 const {tournament:t}=useAccounts(),now=useServerClock(t);
 if(!isDailyTournament(t))return null;
 const local=new Date(now+7*3600000).toISOString(),date=local.slice(0,10),time=local.slice(11,16);
 const locked=date>=t.startDate&&date<=t.endDate&&time>='21:00'&&time<'21:30';
 const ended=t.phase==='finished'||date>t.endDate;
 const next=t.nextLockAt?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(t.nextLockAt)):null;
 return <section className="tournament-schedule" aria-label="Tournament schedule">
  <div className="schedule-main"><div className="schedule-title"><Pixel kind="trophy"/><div><span className="eyebrow">TOURNAMENT DATES</span><h2>{shortDate(t.startDate)} — {shortDate(t.endDate)}</h2></div></div>
   <div className="schedule-cells"><div><span className="account-note">Bot submissions</span><b>{ended?'Ended':locked?'Locked until 21:30':t.nextLockAt?'Open until '+next:'Open'}</b></div><div><span className="account-note">{t.phase==='finished'?'Final results':t.processing?'Current results':'Next results'}</span><b>{t.phase==='finished'?'Published':t.processing?.status==='delayed'?'Processing delayed':t.processing?'From 21:30':t.nextLockAt?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(t.nextLockAt))+', 21:30':'Awaiting completion'}</b></div></div>
  </div><div className="schedule-caption"><span>{t.counts?.accepted||0} / {t.capacity} places filled</span><span>{!entryWindow(t)?'Entry closed':t.entryMode==='judge'?'Players added by the organizer':t.registrationOpen===false?'Entry paused by the organizer':'Entry open'} · Starts {dateTime(t.registrationClosesAt)}</span></div>
  {t.processing?.status==='delayed'&&<p className="account-note" role="status">Results will appear when every match finishes. Bot submissions reopen at 21:30.</p>}
 </section>;
}
function DailyMatches({onSource}) {
  const {tournament:t,user} = useAccounts(), manager = t.manager && user?.id===t.ownerId;
  const [round,setRound] = useState(()=>manager&&t.batches?.[0]?Math.round((Date.parse(t.batches[0].date)-Date.parse(t.startDate))/86400000)+1:t.round||1), [offset,setOffset] = useState(0), [filter,setFilter] = useState('all'), [query,setQuery] = useState(''), [data,setData] = useState(null), [error,setError] = useState(''), [revision,setRevision] = useState(0);
  useEffect(()=>{const controller=new AbortController();setError('');
    request(`/api/tournaments/${t.id}/rounds?round=${round}&offset${round}=${offset}&limit=25&status=${filter}&q=${encodeURIComponent(query)}`,{signal:controller.signal})
      .then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();
  },[t.id,user?.id,round,offset,filter,query,revision,t.serverNow]);
  const column=data?.round===Number(round)?data.columns.find(c=>c.round===Number(round)):null;
  async function retry(id){try{await post(`/api/matches/${id}/retry`);setRevision(v=>v+1);}catch(e){setError(e.message);}}
  return <section className="judge-section"><h2>{manager?'INTERNAL MATCHES / LIVE RESULTS':'PUBLISHED DAILY MATCHES'}</h2>
    <p className="account-note">{manager?'Judge view · unpublished outcomes stay private.':'Published matches only.'}</p>
    <div className="event-settings"><label>Day<select value={round} onChange={e=>{setRound(Number(e.target.value));setOffset(0);}}>{Array.from({length:t.totalRounds},(_,i)=><option key={i+1} value={i+1}>Day {i+1}</option>)}</select></label>
      <label>Status<select value={filter} onChange={e=>{setFilter(e.target.value);setOffset(0);}}>{['all','live','queued','completed','failed'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Find participant<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setOffset(0);}}/></label>
    </div>{error&&<p className="error" role="alert">{error}</p>}{!data&&!error&&<p role="status">Loading matches…</p>}
    <div className="table-wrap" tabIndex="0" role="region" aria-label="Round-robin matches"><table className="account-rankings"><thead><tr><th>First / White</th><th>Second / Black</th><th>Status</th><th>Score</th><th>Actions</th></tr></thead><tbody>{column?.matches.map(m=><tr key={m.id}>
      <td><ParticipantAvatar participant={m.whitePlayer}/>{m.whitePlayer.name}</td><td><ParticipantAvatar participant={m.blackPlayer}/>{m.blackPlayer.name}</td><td>{m.status}</td><td>{m.score===null?'—':`${m.score} – ${1-m.score}`}</td>
      <td><div className="daily-match-actions"><Button secondary onClick={()=>{location.hash=`watch/${encodeURIComponent(t.id)}/${encodeURIComponent(m.id)}`;}}>Match details</Button>
      {manager&&m.status==='failed'&&<Button onClick={()=>retry(m.id)}>Retry infrastructure failure</Button>}
      {manager&&m.whiteSubmissionId&&<Button secondary onClick={()=>onSource(m.whiteSubmissionId)}>White source</Button>}
      {manager&&m.blackSubmissionId&&<Button secondary onClick={()=>onSource(m.blackSubmissionId)}>Black source</Button>}</div></td></tr>)}</tbody></table></div>
    {column&&<><p>{column.filteredTotal} matches matching filters.</p><Pagination offset={offset} total={column.filteredTotal} limit={25} onChange={setOffset} label="matches"/></>}
  </section>;
}

function PublishedStandings({go}){
 const {tournament:t,rankings,rankPage,paginate,busy}=useAccounts();
 return <section className="judge-section"><div className="judge-list-tools"><div><h2>TOURNAMENT STANDINGS</h2><p className="account-note">{t.publishedAt?'Last published · '+dateTime(t.publishedAt):'No results published yet.'}</p></div><Button secondary onClick={()=>go('rankings')}>Full leaderboard</Button></div>
 <div className="table-wrap"><table className="account-rankings"><thead><tr><th>Rank</th><th>Player</th><th>Points</th><th>Tournament Elo</th><th>Change</th></tr></thead><tbody>{rankings.map(p=><tr key={p.id}><td>{p.rank}</td><td><ParticipantAvatar participant={p}/><b>{p.name}</b>{p.username&&<small className="account-handle">@{p.username}</small>}</td><td>{p.points??0}</td><td>{p.rating}</td><td>{p.lastDelta>0?'+':''}{p.lastDelta||'—'}</td></tr>)}</tbody></table>{!rankings.length&&<p className="empty">No standings yet.</p>}</div><Pagination offset={rankPage.offset} total={rankPage.total} onChange={offset=>paginate('rankOffset',offset)} busy={busy} label="players"/>
 </section>;
}
export function DailyTournamentWorkspace({go}){
 const {tournament:t,user,refresh,error,join,busy,paginate}=useAccounts(),manager=t.manager&&user?.id===t.ownerId;
 const [tab,setTab]=useState('overview'),[endDate,setEndDate]=useState(t.endDate),[source,setSource]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState(false);
 const me=t.myEntry||t.players.find(p=>p.id===user?.id);
 async function save(e){e.preventDefault();setSaving(true);setMessage('');try{await post(`/api/tournaments/${t.id}/schedule`,{endDate});await refresh();setMessage('End date saved.');}catch(e){setMessage(e.message);}finally{setSaving(false);}}
 const tabs=manager?[['overview','Overview'],['participants','Participants'],['bots','Bots & code'],['results','Results'],['settings','Settings']]:[['overview','Overview'],['results','Results']];
 return <div className="tournament-studio"><EventPicker/><div className="page-heading"><div><span className="eyebrow">{t.phase==='finished'?'FINAL RESULTS':t.phase.toUpperCase()}</span><h1>{t.name.toUpperCase()}</h1></div><TournamentManagementActions event={t} onDeleted={()=>go('tournaments')}/></div>
 {t.hidden&&manager&&<p className="account-note">Hidden from players and public viewers. Scheduled work continues.</p>}{error&&<p className="error" role="alert">{error}</p>}<DailyScheduleNotice/>
 <div className="workspace-tabs tournament-workspace-tabs" role="tablist" aria-label="Tournament sections">{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}{id==='participants'&&t.counts.pending>0&&<span> · {t.counts.pending}</span>}</button>)}</div>
 {tab==='overview'&&<div className="tournament-work-grid"><section className="card tournament-overview"><div className="judge-list-tools"><h2>{manager?'READY FOR THE NEXT MATCH':'YOUR NEXT MOVE'}</h2><Pixel kind="flag"/></div><p className="account-note">{manager?'A quick look at what needs your attention.':me?.entry==='accepted'?'Keep your bot ready before the next lock.':me?.entry==='pending'?'Your entry is awaiting Judge approval.':'Request a place before registration closes.'}</p>
 <div className="tournament-mini-stats"><div><span className="eyebrow">ENTERED</span><b>{t.counts.accepted} / {t.capacity}</b></div><div><span className="eyebrow">BOTS READY</span><b>{t.counts.botsReady} / {t.counts.accepted}</b></div><div><span className="eyebrow">{manager?'PENDING':'YOUR ELO'}</span><b>{manager?t.counts.pending:me?.rating??'—'}</b></div></div>
 <div className="tournament-next-note">{manager?t.counts.pending?`${t.counts.pending} entries are awaiting your review.`:t.processing?`${t.processing.completed||0} / ${t.processing.expected||0} matches finished${t.processing.failed?`; ${t.processing.failed} need a retry`:''}.`:'Your next matches follow the tournament schedule.':me?.entry==='accepted'?`${me.botName||'No bot saved'}${me.botVersion?' · version '+me.botVersion:''}`:'Choose your next action below.'}</div>
 <div className="phase-actions">{manager?<><Button onClick={()=>setTab('participants')}>Review participants</Button><Button secondary onClick={()=>setTab('bots')}>View bot readiness</Button></>:me?.entry==='accepted'?<Button onClick={()=>go('mybot')}>Manage tournament bot</Button>:me?.entry!=='pending'&&entryWindow(t)&&t.registrationOpen!==false&&t.entryMode!=='judge'?<Button disabled={busy} onClick={join}>Join tournament</Button>:<Button secondary onClick={()=>go('tournaments')}>Browse tournaments</Button>}</div>
 {manager&&t.processing&&<Button secondary onClick={()=>go(`watch?tournament=${encodeURIComponent(t.id)}`)}>View internal matches</Button>}
 </section><aside className="card tournament-next"><h2>WHAT HAPPENS NEXT</h2><ol><li><span className="tournament-step">01</span><div><b>Before 21:00</b><p className="account-note">Players can update their bots.</p></div></li><li><span className="tournament-step">02</span><div><b>21:00 — 21:30</b><p className="account-note">Bots lock while matches run.</p></div></li><li><span className="tournament-step">03</span><div><b>From 21:30</b><p className="account-note">Results appear when every match finishes.</p></div></li></ol></aside></div>}
 {manager&&tab==='participants'&&<Entries onSource={setSource}/>}
 {manager&&tab==='bots'&&<><TournamentSourcePanel onSelect={setSource}/><Pagination offset={t.pagination?.offset||0} total={t.pagination?.total||0} onChange={offset=>paginate('offset',offset)} busy={busy} label="participants"/><details className="tournament-versions"><summary>Match versions & execution status</summary><DailyMatches onSource={setSource}/></details></>}
 {tab==='results'&&<><PublishedStandings go={go}/><details className="tournament-versions"><summary>{manager?'Internal match history':'Published match history'}</summary><DailyMatches onSource={setSource}/></details><Button secondary onClick={()=>go(`watch?tournament=${encodeURIComponent(t.id)}`)}>Browse match recordings</Button></>}
 {manager&&tab==='settings'&&<div className="tournament-work-grid"><Settings/><aside className="card tournament-dates"><form className="tournament-small-form" onSubmit={save}><h2>TOURNAMENT END DATE</h2><label>Last evening included<input type="date" required value={endDate} onChange={e=>setEndDate(e.target.value)} disabled={t.phase==='finished'}/></label><Button type="submit" disabled={saving||t.phase==='finished'}>Save end date</Button>{message&&<p role="status">{message}</p>}<p className="account-note">Existing batches stay intact. Extending the event does not reopen registration.</p></form><hr/><h2>VISIBILITY & REMOVAL</h2><p className="account-note">Hide this event from players, or remove it.</p><TournamentManagementActions event={t} onDeleted={()=>go('tournaments')}/></aside></div>}
 {source&&manager&&<SourceViewer submissionId={source} onClose={()=>setSource('')}/>}
 </div>;
}
// Existing, unplayed events can adopt the new format without losing entries.
export function DailyFormatSetup(){
  const {tournament:t,user,refresh}=useAccounts(),[startDate,setStartDate]=useState(''),[startTime,setStartTime]=useState('00:00'),[endDate,setEndDate]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  if(user?.role!=='judge'||user.id!==t.ownerId||!['registration','preparation'].includes(t.phase))return null;
  async function convert(e){e.preventDefault();setError('');setSaving(true);try{await post(`/api/tournaments/${t.id}/schedule`,{startDate,startTime,endDate});await refresh();}catch(e){setError(e.message);}finally{setSaving(false);}}
  return <form className="card judge-section" onSubmit={convert}><h2>SWITCH TO DAILY ROUND ROBIN</h2><p>Available before any match is created. Keeps entries and submitted bots. Registration closes at the chosen start time. Start before 21:00 so the first day plays a round.</p><div className="event-settings"><label>Start date (ICT)<input required type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label><label>Start time (ICT)<input type="time" required max="20:59" value={startTime} onChange={e=>setStartTime(e.target.value)}/></label><label>End date, inclusive (ICT)<input required type="date" min={startDate} value={endDate} onChange={e=>setEndDate(e.target.value)}/></label><Button disabled={saving} type="submit">Use daily format</Button></div>{error&&<p className="error" role="alert">{error}</p>}</form>;
}
