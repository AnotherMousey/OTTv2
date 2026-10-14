import React,{useEffect,useRef,useState} from 'react';
import {historyStorage,readHistory,updateHistoryMatch} from './submissionHistory.js';
import {getSubmissionHistory} from './api/matchApi.js';
import {request} from './api/platformApi.js';
import {Button} from './ui.jsx';
import samples from './games/samples.json' with {type:'json'};

export const previewRecords=[
 {id:'preview-goal',matchId:'PREVIEW-GOAL',title:'Source race',language:'Python / Python',mapName:'9×9',createdAt:'Preview entry 03',status:'finished',sampleId:samples[0].id,preview:true},
 {id:'preview-limit',matchId:'PREVIEW-LIMIT',title:'Turn-limit match',language:'Java / C++',mapName:'9×9',createdAt:'Preview entry 02',status:'finished',sampleId:samples[2].id,preview:true},
 {id:'preview-runtime',matchId:'PREVIEW-RUNTIME',title:'Runtime diagnostic',language:'Python / Python',mapName:'9×9',createdAt:'Preview entry 01',status:'failed',preview:true,runtimeFailure:true},
];
function previewSubmission(){try{return JSON.parse(sessionStorage.getItem('ott-preview-submitted')||'null');}catch{return null;}}
export function savePreviewSubmission(record){sessionStorage.setItem('ott-preview-submitted',JSON.stringify(record));}
export function getPreviewRecord(matchId){const submitted=previewSubmission();return submitted?.matchId===matchId?submitted:previewRecords.find(r=>r.matchId===matchId);}
export function previewReplay(record) {
 const replay=structuredClone(samples.find(s=>s.id===record?.sampleId)?.replay || samples[4].replay);
 replay.matchId=record.matchId;replay.mode='preview-submission';
 if(record.runtimeFailure) {
  const initial=structuredClone(replay.frames[0]);
  const event='white-forfeit: Player process exited with code -2. Could not start player: spawn python ENOENT';
  replay.frames=[initial,{...structuredClone(initial),event,status:'finished',winner:'black',endReason:'bot-error',moveNumber:0}];
  replay.result={status:'finished',winner:'black',reason:'bot-error',turns:0,remaining:{white:9,black:9}};
 }
 return replay;
}
export function SubmissionHistory({go}) {
 const preview=Boolean(window.__OFFLINE_PREVIEW__);
 const [records,setRecords]=useState(()=>preview?[...readHistory(historyStorage()),...(previewSubmission()?[previewSubmission()]:[]),...previewRecords].filter((record,index,list)=>list.findIndex(value=>value.matchId===record.matchId)===index):[]);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(!preview),[busy,setBusy]=useState(false),[confirming,setConfirming]=useState(null),[total,setTotal]=useState(0);
 const deleting=useRef(false),cancelButton=useRef(null),heading=useRef(null),trigger=useRef(null);
 useEffect(()=>{if(confirming)cancelButton.current?.focus();},[confirming]);
 useEffect(()=>{
  if(preview||busy)return;
  let cancelled=false,pending=false;const controller=new AbortController();
  async function refresh(){if(pending||document.hidden)return;pending=true;try{const data=await getSubmissionHistory(controller.signal);if(!cancelled){setRecords(data.records);setTotal(data.total??data.records.length);setError('');}}catch(error){if(!cancelled&&error.name!=='AbortError')setError(`Could not load history: ${error.message}`);}finally{pending=false;if(!cancelled)setLoading(false);}}
  refresh();const timer=setInterval(refresh,5000);
  return()=>{cancelled=true;clearInterval(timer);controller.abort();};
 },[preview,busy]);
 async function remove(){
  if(deleting.current)return;deleting.current=true;setBusy(true);setError('');setMessage('');
  try{
   if(preview){const ids=confirming==='all'?records.map(record=>record.matchId):[confirming];const next=records.filter(record=>!ids.includes(record.matchId));setRecords(next);try{localStorage.setItem('ott-submission-history-v1',JSON.stringify(next));}catch{}setMessage('Demo history updated in this preview.');}
   else{const data=await request('/api/practice/history'+(confirming==='all'?'/delete':'/'+encodeURIComponent(confirming)+'/delete'),{method:'POST'});setRecords(current=>confirming==='all'?[]:current.filter(record=>record.matchId!==confirming));setTotal(current=>Math.max(0,current-data.deleted));setMessage(`${data.deleted} practice ${data.deleted===1?'recording':'recordings'} deleted.`);}
   setConfirming(null);heading.current?.focus();
  }catch(error){setError(error.status===404&&error.message==='API route not found.'?'History deletion is unavailable on this API. Deploy the latest backend on Render and check VITE_API_BASE_URL.':error.message==='Failed to fetch'?'Could not reach the history API. Check the Render deployment, frontend API URL, and allowed origin.':error.message);}
  finally{deleting.current=false;setBusy(false);}
 }
 function confirm(id,event){trigger.current=event.currentTarget;setConfirming(id);setMessage('');}
 function cancel(){setConfirming(null);trigger.current?.focus();}
 return <>
  <div className="page-heading"><div><span className="eyebrow">PRACTICE / {preview?'DEMO RECORDINGS':'SERVER RECORDINGS'}</span><h1 ref={heading} tabIndex="-1">PRACTICE HISTORY.</h1></div><div className="history-actions"><Button onClick={()=>go('practice')}>New practice match</Button><Button secondary disabled={busy||(!records.length&&!total)} onClick={event=>confirm('all',event)}>Delete all history</Button></div></div>
  <p className="muted">{preview?'Recorded demo matches.':'Your practice matches and replays are saved to your account.'}</p>
  {confirming&&<section className="card history-confirm" role="alertdialog" aria-labelledby="history-delete-title" aria-describedby="history-delete-detail"><h2 id="history-delete-title">{confirming==='all'?'DELETE ALL PRACTICE HISTORY?':'DELETE THIS PRACTICE MATCH?'}</h2><p id="history-delete-detail">{confirming==='all'?'This removes all your practice recordings, including those beyond this page.':'This removes this practice recording and its replay.'} Active practice jobs will stop. Tournament entries and results stay unchanged. This cannot be undone.</p><div className="history-actions"><Button secondary ref={cancelButton} disabled={busy} onClick={cancel}>Cancel</Button><Button disabled={busy} onClick={remove}>{busy?'Deleting…':confirming==='all'?'Delete all recordings':'Delete recording'}</Button></div></section>}
  {error&&<p className="error" role="alert">{error}</p>}{message&&<p className="upload-feedback" role="status">{message}</p>}{loading&&<p role="status">Loading practice history…</p>}
  <div className="table-wrap submission-history"><table><thead><tr><th>Practice recording</th><th>Languages</th><th>Map</th><th>Status</th><th>Actions</th></tr></thead><tbody>
   {records.map(record=><tr key={record.id}><td><b>{record.title||'Practice match'}</b><small className="history-meta">{record.preview?'DEMO':new Date(record.createdAt).toLocaleString()}</small></td><td data-label="Languages">{record.language}</td><td data-label="Map">{record.mapName}</td><td data-label="Status"><span className={`history-status ${record.status==='failed'||record.result?.reason==='bot-error'?'stopped':''}`}>{record.runtimeFailure?'Runtime unavailable':record.result?.reason==='bot-error'?'Bot stopped':record.status}</span></td><td><div className="history-actions"><Button secondary disabled={busy} onClick={()=>{window.location.href=`?match=${encodeURIComponent(record.matchId)}#match`;}}>{['queued','running'].includes(record.status)?'View match':'View replay ↗'}</Button><Button secondary disabled={busy} aria-label={`Delete practice from ${record.preview?record.createdAt:new Date(record.createdAt).toLocaleString()}`} onClick={event=>confirm(record.matchId,event)}>Delete</Button></div></td></tr>)}
  </tbody></table>{!loading&&!records.length&&!error&&<div className="empty">No practice matches yet. Your practice recordings will appear here.</div>}</div>
  {!preview&&total>records.length&&<p className="account-note">Showing the latest {records.length} of {total} practices. Delete all history removes every practice recording.</p>}
 </>;
}
