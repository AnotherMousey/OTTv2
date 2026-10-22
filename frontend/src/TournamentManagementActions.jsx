import React,{useRef,useState,useEffect} from 'react';
import {useAccounts} from './PreviewAccounts.jsx';
import {Button} from './ui.jsx';
export function TournamentManagementActions({event,onChanged=()=>{},onDeleted=()=>{},compact=false}){
 const {user,changeVisibility,changeRegistration,deleteTournament,busy}=useAccounts(),[confirming,setConfirming]=useState(false),[error,setError]=useState(''),dialog=useRef(null);
 useEffect(()=>{if(confirming)dialog.current?.showModal();},[confirming]);
 if(user?.role!=='judge'||user.id!==event.ownerId)return null;
 async function visibility(){setError('');try{if(await changeVisibility(event.id,!event.hidden))onChanged();}catch(e){setError(e.message);}}
 async function registration(){setError('');try{if(await changeRegistration(event.id,event.registrationOpen===false))onChanged();}catch(e){setError(e.message);}}
 async function remove(){setError('');try{if(await deleteTournament(event.id)){setConfirming(false);onDeleted();}}catch(e){setError(e.message);}}
 return <div className={`tournament-management-actions ${compact?'compact':''}`}>
   <Button secondary className="button secondary tournament-visibility" disabled={busy} onClick={visibility}>{event.hidden?'Show tournament':'Hide tournament'}</Button>
   {event.phase==='registration'&&<Button secondary className="button secondary tournament-registration" disabled={busy} onClick={registration}>{event.registrationOpen===false?'Open registration':'Close registration'}</Button>}
   <Button secondary disabled={busy} className="button secondary tournament-delete" onClick={()=>{setError('');setConfirming(true);}}>Delete</Button>
   {error&&!confirming&&<p className="error" role="alert">{error}</p>}
   {confirming&&<dialog ref={dialog} className="tournament-confirm" onCancel={()=>setConfirming(false)} onClose={()=>setConfirming(false)}>
    <h2>DELETE TOURNAMENT?</h2><p><strong>{event.name}</strong> will be removed from the website. Pending matches will be cancelled.</p>
    <p className="account-note">Hide it instead to keep it in your Judge workspace.</p>{error&&<p className="error" role="alert">{error}</p>}
    <div className="phase-actions"><Button secondary disabled={busy} onClick={()=>setConfirming(false)}>Keep tournament</Button><Button className="button tournament-delete" disabled={busy} onClick={remove}>{busy?'Deleting…':'Delete tournament'}</Button></div>
   </dialog>}
 </div>;
}
