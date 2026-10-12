import React,{useEffect,useState} from 'react';
import {historyStorage,readHistory,updateHistoryMatch} from './submissionHistory.js';
import {getSubmissionHistory} from './api/matchApi.js';
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
 const [records,setRecords]=useState(()=>readHistory(historyStorage())),[error,setError]=useState('');
 useEffect(()=>{
  if(window.__OFFLINE_PREVIEW__)return;
  let cancelled=false;const controller=new AbortController();
  async function refresh(){try{const data=await getSubmissionHistory(controller.signal);if(!cancelled){setRecords(data.records);setError('');}}catch(e){if(!cancelled)setError(`Could not load server history: ${e.message}`);}}
  refresh();const timer=setInterval(refresh,3000);
  return()=>{cancelled=true;clearInterval(timer);controller.abort();};
 },[]);
 const display=records.length?records:(window.__OFFLINE_PREVIEW__?[...(previewSubmission()?[previewSubmission()]:[]),...previewRecords]:[]);
 return <>
  <div className="page-heading"><div><span className="eyebrow">MY SUBMISSIONS</span><h1>SUBMISSION HISTORY.</h1></div><Button onClick={()=>go('submit')}>New submission ↗</Button></div>
  <p className="muted">{window.__OFFLINE_PREVIEW__?'Preview entries demonstrate the history and replay flow. No bots are executed.':'Submission history and replays are saved on the server for this browser’s client ID.'}</p>
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="table-wrap submission-history"><table><thead><tr><th>Submission</th><th>Languages</th><th>Map</th><th>Status</th><th>Replay</th></tr></thead><tbody>
   {display.map(r=><tr key={r.id}><td><b>{r.title||r.matchId}</b><small className="history-meta">{r.preview?'PREVIEW':new Date(r.createdAt).toLocaleString()}</small></td><td>{r.language}</td><td>{r.mapName}</td><td><span className={`history-status ${r.status==='failed'||r.result?.reason==='bot-error'?'stopped':''}`}>{r.runtimeFailure?'Runtime unavailable':r.result?.reason==='bot-error'?'Bot stopped':r.status}</span></td><td><Button secondary onClick={()=>{window.location.href=`?match=${encodeURIComponent(r.matchId)}#match`;}}>View replay ↗</Button></td></tr>)}
  </tbody></table>{!display.length&&<div className="empty">No submissions yet. Your submitted matches will appear here.</div>}</div>
 </>;
}
