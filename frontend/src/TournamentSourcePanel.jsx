import React,{useEffect,useRef,useState} from 'react';
import {useAccounts} from './PreviewAccounts.jsx';
import {request} from './api/platformApi.js';
import {Button} from './ui.jsx';
import {ParticipantAvatar} from './ParticipantAvatar.jsx';
import {botReadiness,friendlyBotFilename} from './botReadiness.js';
const time=value=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value));
export function SourceViewer({submissionId,onClose}){
 const {tournament,user}=useAccounts(),[data,setData]=useState(null),[error,setError]=useState(''),dialog=useRef(null);
 useEffect(()=>{dialog.current?.showModal();const controller=new AbortController();setData(null);setError('');
  request(`/api/tournaments/${encodeURIComponent(tournament.id)}/source/${encodeURIComponent(submissionId)}`,{signal:controller.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
  return()=>controller.abort();
 },[submissionId,tournament.id,user?.id]);
 return <dialog ref={dialog} className="tournament-source-dialog" aria-label="Read-only submitted source" onCancel={onClose} onClose={onClose}>
  <div className="judge-list-tools"><h2>READ-ONLY SOURCE</h2><Button secondary onClick={onClose}>Close source</Button></div>
  {error&&<p className="error" role="alert">{error}</p>}{!data&&!error&&<p role="status">Loading source…</p>}
  {data&&<><p>{data.participant.name} · {data.filename} · v{data.version}</p><p className="account-note">{data.language} · saved {time(data.createdAt)}</p><pre tabIndex="0" aria-label="Submitted code"><code>{data.source||'Source is unavailable in this imported archive.'}</code></pre><details><summary>Submission details</summary><p className="account-note">SHA-256: {data.sourceHash}</p></details></>}
 </dialog>;
}
export function TournamentSourcePanel({onSelect}){
 const {tournament:t}=useAccounts(),[userId,setUserId]=useState(''),[rows,setRows]=useState([]),[error,setError]=useState('');
 const entries=(t.entryRows||t.players).filter(p=>p.entry==='accepted');
 useEffect(()=>{setRows([]);setError('');if(!userId)return;const controller=new AbortController();request(`/api/tournaments/${t.id}/source?userId=${encodeURIComponent(userId)}`,{signal:controller.signal}).then(d=>setRows(d.submissions)).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[userId,t.id]);
 return <section className="judge-section"><div className="judge-list-tools"><div><h2>BOTS & CODE</h2><p className="account-note">Saved submissions. Source code is read-only.</p></div></div>
 <div className="table-wrap" tabIndex="0" role="region" aria-label="Bot readiness"><table className="account-rankings"><thead><tr><th>Player</th><th>Saved bot</th><th>Version</th><th>Readiness</th><th>Actions</th></tr></thead><tbody>{entries.map(p=><tr key={p.id}><td><ParticipantAvatar participant={p}/><b>{p.name}</b></td><td>{p.botName?friendlyBotFilename(p.botName,p.language):'Not submitted'}</td><td>{p.botVersion?`v${p.botVersion}`:'—'}</td><td>{botReadiness(p).label}</td><td><Button secondary disabled={!p.activeSubmissionId} onClick={()=>onSelect(p.activeSubmissionId)}>Read source</Button></td></tr>)}</tbody></table>{!entries.length&&<p className="empty">No accepted participants yet.</p>}</div>
 <details className="tournament-versions"><summary>Earlier bot versions</summary><label>Participant<select value={userId} onChange={e=>setUserId(e.target.value)}><option value="">Choose participant</option>{entries.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{error&&<p role="alert" className="error">{error}</p>}<div className="daily-version-list">{rows.map(s=><Button secondary key={s.id} onClick={()=>onSelect(s.id)}>{s.filename} · v{s.version} · {s.status}</Button>)}</div></details>
 </section>;
}
