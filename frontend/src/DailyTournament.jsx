import React, {useEffect, useState} from 'react';
import {useAccounts} from './PreviewAccounts.jsx';
import {request, post} from './api/platformApi.js';
import {Button} from './ui.jsx';
import {Pagination} from './Pagination.jsx';
import {ParticipantAvatar} from './ParticipantAvatar.jsx';
import {EventPicker, Entries, Settings} from './TournamentWorkspace.jsx';
import './dailyTournament.css';

export const isDailyTournament = t => t.format === 'daily-round-robin';
export function useServerClock(t) {
  const [clock, setClock] = useState(() => ({server: Date.parse(t.serverNow) || Date.now(), received: Date.now(), now: Date.now()}));
  useEffect(() => {setClock({server: Date.parse(t.serverNow) || Date.now(), received: Date.now(), now: Date.now()});}, [t.serverNow, t.id]);
  useEffect(() => {const timer = setInterval(() => setClock(c => ({...c, now: Date.now()})), 1000); return () => clearInterval(timer);}, []);
  return clock.server + clock.now - clock.received;
}
const dateTime = value => value ? new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value)) + ' ICT' : 'Not yet published';
export function DailyScheduleNotice() {
  const {tournament:t} = useAccounts();
  const now = useServerClock(t);
  const local = new Date(now + 7*3600000).toISOString(), date = local.slice(0,10), time = local.slice(11,16);
  const locked = date >= t.startDate && date <= t.endDate && time >= '21:00' && time < '21:30';
  const left = t.nextLockAt ? Math.max(0, Math.ceil((Date.parse(t.nextLockAt)-now)/1000)) : null;
  if (!isDailyTournament(t)) return null;
  return <section className="card daily-schedule" aria-label="Daily tournament schedule">
    <span className="eyebrow">DOUBLE ROUND ROBIN / ASIA/HO_CHI_MINH</span>
    <h2>{t.startDate} — {t.endDate}</h2>
    <p>Registration closes {dateTime(t.registrationClosesAt)}. Two matches per pair every evening; sides reverse.</p>
    <div className="daily-facts"><span className="status">{locked ? 'BOT SUBMISSIONS LOCKED' : t.phase === 'finished' || date > t.endDate ? 'BOT SUBMISSIONS ENDED' : 'BOT SUBMISSIONS OPEN'}</span>
      <span>Daily lock: 21:00–21:30 ICT</span>
      {left !== null && <span>Next lock: {Math.floor(left/86400)}d {String(Math.floor(left/3600)%24).padStart(2,'0')}:{String(Math.floor(left/60)%60).padStart(2,'0')}:{String(left%60).padStart(2,'0')}</span>}
    </div>
    {t.processing && <p role="status">{t.processing.status === 'delayed' ? 'Processing is delayed. Results remain private until the entire batch finishes. Bot submissions reopen at 21:30.' : 'Today’s matches are processing. Results will be published at or after 21:30 when all matches finish.'}</p>}
    <p>Last publication: {t.publishedDate || 'None'} · {dateTime(t.publishedAt)}. Standings and tournament Elo change together.</p>
  </section>;
}
function SourceViewer({submissionId, onClose}) {
  const {tournament, user} = useAccounts(), [data,setData] = useState(null), [error,setError] = useState('');
  useEffect(() => {const controller = new AbortController(); setData(null); setError('');
    request(`/api/tournaments/${tournament.id}/source/${submissionId}`,{signal:controller.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
    return()=>controller.abort();
  },[submissionId,tournament.id,user?.id]);
  return <section className="card daily-source" aria-label="Read-only submitted source"><div className="judge-list-tools"><h2>READ-ONLY SOURCE</h2><Button secondary onClick={onClose}>Close source</Button></div>
    {error && <p role="alert" className="error">{error}</p>}{!data&&!error&&<p role="status">Loading source…</p>}
    {data&&<><p>{data.participant.name} · {data.language} · v{data.version} · {dateTime(data.createdAt)}</p><p>SHA-256: <code>{data.sourceHash}</code></p><pre tabIndex="0" aria-label="Submitted code"><code>{data.source}</code></pre></>}
  </section>;
}
function SourceList({onSelect}) {
  const {tournament:t} = useAccounts(), [userId,setUserId] = useState(''), [rows,setRows] = useState([]), [error,setError] = useState('');
  const entries = t.entryRows || t.players;
  useEffect(()=>{setRows([]);setError('');if(!userId)return;const controller=new AbortController();
    request(`/api/tournaments/${t.id}/source?userId=${encodeURIComponent(userId)}`,{signal:controller.signal}).then(d=>setRows(d.submissions)).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();
  },[userId,t.id]);
  return <section className="card judge-section"><h2>PARTICIPANT SOURCE</h2><label>Participant on this entry page<select value={userId} onChange={e=>setUserId(e.target.value)}><option value="">Choose participant</option>{entries.filter(p=>p.entry==='accepted').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {error&&<p role="alert" className="error">{error}</p>}<div className="daily-version-list">{rows.map(row=><Button secondary key={row.id} onClick={()=>onSelect(row.id)}>{row.filename} · v{row.version} · {row.status}</Button>)}</div>
    <p>Latest 100 versions shown. Match source links open the exact frozen version, including older versions.</p></section>;
}
function DailyMatches({onSource}) {
  const {tournament:t,user} = useAccounts(), manager = t.manager && user?.id===t.ownerId;
  const [round,setRound] = useState(()=>manager&&t.batches[0]?Math.round((Date.parse(t.batches[0].date)-Date.parse(t.startDate))/86400000)+1:t.round||1), [offset,setOffset] = useState(0), [filter,setFilter] = useState('all'), [query,setQuery] = useState(''), [data,setData] = useState(null), [error,setError] = useState(''), [revision,setRevision] = useState(0);
  useEffect(()=>{const controller=new AbortController();setError('');
    request(`/api/tournaments/${t.id}/rounds?round=${round}&offset${round}=${offset}&limit=25&status=${filter}&q=${encodeURIComponent(query)}`,{signal:controller.signal})
      .then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();
  },[t.id,user?.id,round,offset,filter,query,revision,t.serverNow]);
  const column=data?.round===Number(round)?data.columns.find(c=>c.round===Number(round)):null;
  async function retry(id){try{await post(`/api/matches/${id}/retry`);setRevision(v=>v+1);}catch(e){setError(e.message);}}
  return <section className="judge-section"><h2>{manager?'INTERNAL MATCHES / LIVE RESULTS':'PUBLISHED DAILY MATCHES'}</h2>
    <p>{manager?'Results below are internal until publication. Elo changes become official only with batch publication.':'Only fully published batches appear below.'}</p>
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
    {column&&<><p>{column.filteredTotal} matches matching filters. Two matches per pair; no elimination.</p><Pagination offset={offset} total={column.filteredTotal} limit={25} onChange={setOffset} label="matches"/></>}
  </section>;
}
export function DailyTournamentWorkspace({go}) {
  const {tournament:t,user,refresh,error,join} = useAccounts(), manager=t.manager&&user?.id===t.ownerId;
  const [endDate,setEndDate] = useState(t.endDate), [source,setSource] = useState(''), [message,setMessage]=useState(''), [saving,setSaving]=useState(false);
  const me = t.myEntry || t.players.find(p=>p.id===user?.id);
  async function save(e){e.preventDefault();setSaving(true);setMessage('');try{await post(`/api/tournaments/${t.id}/schedule`,{endDate});await refresh();setMessage('End date saved. Registration remains closed after the original start. Existing batches are preserved.');}catch(e){setMessage(e.message);}finally{setSaving(false);}}
  return <><EventPicker/><div className="page-heading"><div><span className="eyebrow">{t.name.toUpperCase()} / DAILY ROUND ROBIN</span><h1>{manager?'MANAGE TOURNAMENT':'YOUR TOURNAMENT'}</h1></div><span className="status">{t.phase==='finished'?'FINAL RESULTS':t.phase.toUpperCase()}</span></div>
    {error&&<p className="error" role="alert">{error}</p>}<DailyScheduleNotice/>
    <div className="tournament-summary"><div><span>ACCEPTED PLAYERS</span><b>{t.counts.accepted}/{t.capacity}</b></div><div><span>MATCHES / DAY</span><b>{t.counts.accepted*(t.counts.accepted-1)}</b></div><div><span>TOURNAMENT ELO</span><b>{me?.rating??'—'}</b></div><div><span>PUBLISHED DAYS</span><b>{t.batches.filter(b=>b.publishedAt).length}/{t.totalRounds}</b></div></div>
    {!manager&&user?.role==='player'&&<section className="card player-next-action"><div><h2>{me?.entry==='accepted'?'YOUR BOT / YOUR TOURNAMENT':me?.entry==='pending'?'ENTRY AWAITING REVIEW':'TOURNAMENT ENTRY'}</h2><p>{me?.entry==='accepted'?`${me.botName||'No bot saved'} · version ${me.botVersion}. Saved uploads outside the lock apply to the next eligible batch.`:'Registration closes at the start date, not at the first evening match.'}</p></div>
      {me?.entry==='accepted'?<Button onClick={()=>go('mybot')}>Manage tournament bot</Button>:t.phase==='registration'&&me?.entry!=='pending'?<Button onClick={join}>Request entry</Button>:null}</section>}
    {manager&&<><form className="card judge-section" onSubmit={save}><h2>TOURNAMENT END DATE</h2><label>Last evening included<input type="date" required value={endDate} onChange={e=>setEndDate(e.target.value)} disabled={t.phase==='finished'}/></label><Button type="submit" disabled={saving||t.phase==='finished'}>Save end date</Button><p>No existing batch is removed. Extending the event does not reopen registration.</p>{message&&<p role="status">{message}</p>}</form>
      {t.processing&&<p role="status">Internal progress: {t.processing.completed}/{t.processing.expected} finished · {t.processing.failed} infrastructure failures · {t.processing.internalState}</p>}
      <Settings/><Entries/><SourceList onSelect={setSource}/></>}
    {source&&manager&&<SourceViewer submissionId={source} onClose={()=>setSource('')}/>}
    <div className="player-actions"><Button secondary onClick={()=>go('rankings')}>Published standings & tournament Elo</Button></div>
    <DailyMatches onSource={setSource}/>
  </>;
}

// Existing, unplayed events can adopt the new format without losing entries.
export function DailyFormatSetup(){
  const {tournament:t,user,refresh}=useAccounts(),[startDate,setStartDate]=useState(''),[endDate,setEndDate]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  if(user?.role!=='judge'||user.id!==t.ownerId||!['registration','preparation'].includes(t.phase))return null;
  async function convert(e){e.preventDefault();setError('');setSaving(true);try{await post(`/api/tournaments/${t.id}/schedule`,{startDate,endDate});await refresh();}catch(e){setError(e.message);}finally{setSaving(false);}}
  return <form className="card judge-section" onSubmit={convert}><h2>SWITCH TO DAILY ROUND ROBIN</h2><p>Available before any match is created. Keeps entries and submitted bots. Registration closes at 00:00 on the chosen start date.</p><div className="event-settings"><label>Start date (ICT)<input required type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label><label>End date, inclusive (ICT)<input required type="date" min={startDate} value={endDate} onChange={e=>setEndDate(e.target.value)}/></label><Button disabled={saving} type="submit">Use daily format</Button></div>{error&&<p className="error" role="alert">{error}</p>}</form>;
}
