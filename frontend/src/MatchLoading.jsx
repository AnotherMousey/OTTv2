import React,{useEffect,useState} from 'react';
import {Pixel} from './Pixel.jsx';
const labels={
 connect:['WAKING THE ARENA','Connecting to the backend. If it is asleep, this may take a little longer.'],
 upload:['SENDING YOUR BOTS','Uploading both submissions. Keep this page open.'],
 queued:['YOUR MATCH IS QUEUED','Waiting for the grader to become available.'],
 running:['BOTS ARE PLAYING','The grader is running the match and recording each move.'],
 replay:['OPENING YOUR REPLAY','Preparing the recorded board, moves and final result.'],
};
export function MatchLoading({stage='connect',preview=false,matchId}){
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{const timer=setInterval(()=>setElapsed(s=>s+1),1000);return()=>clearInterval(timer);},[]);
 const [title,detail]=labels[stage]||labels.connect;
 const active={connect:0,upload:1,queued:2,running:2,replay:3}[stage]??0;
 return <section className="match-loading" aria-busy="true" aria-label="Match preparation">
  <span className="eyebrow">{preview?'OFFLINE PREVIEW / LOADING DEMO':'BOT MATCH / PREPARING'}</span>
  <div className="loading-duel" aria-hidden="true"><Pixel kind="rock" side="white"/><span className="loading-pixels"><i/><i/><i/></span><Pixel kind="scissors" side="black"/></div>
  <div role="status" aria-live="polite" aria-atomic="true"><h1>{title}</h1><p className="loading-detail">{detail}</p></div>
  <ol className="loading-stages">{['CONNECT','SEND BOTS','RUN MATCH','LOAD REPLAY'].map((name,i)=><li key={name} className={i<active?'done':i===active?'current':''} aria-current={i===active?'step':undefined}><span>{i<active?'✓':String(i+1).padStart(2,'0')}</span>{name}</li>)}</ol>
  <div className="loading-footer"><span>{elapsed}s elapsed</span><span>{matchId||'Your submission stays on this page.'}</span></div>
  {!preview&&matchId&&<p className="loading-preview-note">Your match is saved. <a className="text-link" href="#submissions">Open practice history</a> and return to its replay later.</p>}
  {preview&&<p className="loading-preview-note">Design demonstration only. No bot code is executed; a recorded sample opens next.</p>}
 </section>;
}
