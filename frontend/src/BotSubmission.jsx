import React,{useEffect,useState} from 'react';
import {useAccounts} from './PreviewAccounts.jsx';
import {Button} from './ui.jsx';
import {Pixel} from './Pixel.jsx';
import {FileUpload} from './FileUpload.jsx';
import {botReadiness} from './botReadiness.js';
import {EventPicker} from './TournamentWorkspace.jsx';
import {checkBotFile,LANGUAGE_EXTENSIONS,MAX_BOT_BYTES} from './botUpload.js';
export function TournamentBotPanel({go}){
 const {user,tournament,saveBot}=useAccounts(),player=tournament.players.find(p=>p.id===user?.id);
 const [source,setSource]=useState(''),[filename,setFilename]=useState(''),[language,setLanguage]=useState('Python'),[error,setError]=useState(''),[message,setMessage]=useState(''),[reading,setReading]=useState(false),[saving,setSaving]=useState(false);
 const readiness=botReadiness(player);
 const accepted=player?.entry==='accepted',botReady=player?.botReady===true,open=accepted&&tournament.phase==='preparation';
 async function readFile(file){setError('');setMessage('');setReading(true);try{
  if(file.size>MAX_BOT_BYTES)throw Error('File is too large. Maximum size: 256 KB.');
  const extension=file.name.split('.').pop().toLowerCase(),lang={py:'Python',java:'Java',cpp:'C++'}[extension];
  if(!lang)throw Error('Unsupported file. Choose .py, .java or .cpp.');
  const text=await file.text();checkBotFile({name:file.name,language:lang,source:text,size:file.size});
  setSource(text);setFilename(file.name);setLanguage(lang);setMessage('File read. Basic file checks passed. Save it to enter this tournament.');
 }catch(e){setError(e.message);}finally{setReading(false);}}
 async function submit(e){e.preventDefault();setError('');setMessage('');setSaving(true);try{
  const name=filename||`${user.id}_bot${LANGUAGE_EXTENSIONS[language]}`;
  const checked=checkBotFile({name,language,source});
  await new Promise(resolve=>setTimeout(resolve,250));
  if(await saveBot({...checked,source})===false)throw Error('Bot submission is closed. Check the current tournament phase.');
  setMessage(`Bot uploaded for ${tournament.name}. Compilation and protocol validation are queued.`);
 }catch(e){setError(e.message);}finally{setSaving(false);}}
 if(!user||user.role==='judge')return <section className="card role-notice"><span className="eyebrow">PLAYER AREA</span><h2>COMPETITION BOTS BELONG TO PLAYERS.</h2><p>{user?'Manage participant readiness from the judge desk.':'Log in with an organizer-issued player account to submit a tournament bot.'}</p><Button onClick={()=>go(user?'tournament':'login')}>{user?'Manage bot readiness':'Log in'}</Button></section>;
 return <section className="bot-workspace"><div className="bot-context"><span className="eyebrow">COMPETITION ENTRY / {tournament.name.toUpperCase()}</span><h2>YOUR TOURNAMENT BOT.</h2><p>This single bot enters <strong>{tournament.name}</strong>. Practice does not change your tournament entry.</p></div>{player?.validationError&&<p className="error" role="alert">{player.validationError}</p>}<div className="bot-readiness" role="status"><Pixel kind="rock"/><div><b>{!accepted?'ENTRY REQUIRED':readiness.title}</b><span>{!accepted?'Join this tournament and wait for judge approval.':botReady?`${player.botName} · ${player.language} · version ${player.botVersion||1}`:['queued','validating'].includes(player.submissionStatus)?'Validation is queued or running. This page refreshes automatically.':open?'Bot preparation is open. Choose a file or paste your code.':'Submissions open during the Bot preparation phase.'}</span></div><span className={`readiness-chip ${botReady?'ready':''}`}>{readiness.label}</span></div>{botReady&&<p className="validation-note">{botReady?'Compilation and initial-move checks passed.':`Validation: ${player.submissionStatus||'not submitted'}.`} Check readiness before the judge closes preparation.</p>}{open?<form className="event-bot" onSubmit={submit}><label>Bot language<select value={language} disabled={reading||saving} onChange={e=>{setLanguage(e.target.value);setError('');setMessage('');}}><option>Python</option><option>Java</option><option>C++</option></select></label><FileUpload onFile={readFile} filename={filename} busy={reading} disabled={saving}/><details className="paste-code" open={!filename}><summary>Or paste source code</summary><label>Bot source code<textarea required rows="8" value={source} disabled={reading||saving} onChange={e=>{setSource(e.target.value);setMessage('');}} placeholder="Paste your bot code here…"/></label></details>{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="upload-feedback" role="status">{message}</p>}<div className="bot-actions"><Button type="submit" disabled={!source.trim()||reading||saving}>{saving?'Uploading bot…':botReady?'Update tournament bot':'Save tournament bot'}</Button><span>Saved to your account. Validation runs on the isolated execution service.</span></div></form>:<div className="bot-locked"><p>{!accepted?'Find a tournament, request entry, then submit your bot when preparation opens.':'The judge has locked submissions for this phase. Your saved bot stays attached to this tournament.'}</p><Button secondary onClick={()=>go('tournament')}>{accepted?'View tournament phase':'Join or check entry'}</Button></div>}</section>;
}
export function MyBot({go}){
 const {user,tournament,loading,error}=useAccounts();
 if(loading)return <section className="card role-notice" role="status"><h2>LOADING TOURNAMENTS.</h2><p>Checking your competition entry…</p></section>;
 if(user?.role==='player'&&!tournament.id)return <section className="card role-notice"><span className="eyebrow">PLAYER / COMPETITION SUBMISSION</span><h2>NO TOURNAMENT SELECTED.</h2><p>{error||'Choose a tournament and request entry before submitting a bot.'}</p><Button onClick={()=>go('tournaments')}>Browse tournaments</Button></section>;
 return <><div className="page-heading"><div><span className="eyebrow">PLAYER / COMPETITION SUBMISSION</span><h1>MY TOURNAMENT BOT.</h1></div><Pixel className="heading-sprite"/></div><EventPicker/><TournamentBotPanel key={`${tournament.id}-${user?.id}`} go={go}/>{user&&user.role!=='judge'&&<section className="card practice-link"><div><span className="eyebrow">SEPARATE FROM COMPETITION</span><h2>PRACTICE MATCH.</h2><p>Run two bots in an isolated practice match. Practice does not submit a competition bot or change Elo.</p></div><Button secondary onClick={()=>go('practice')}>Open practice match</Button></section>}</>;
}
