export function directoryMatches(events){
 return events.flatMap(event=>{
  const records=[...event.pairs,...event.history].filter((p,i,list)=>list.findIndex(x=>x.id===p.id)===i);
  return records.filter(pair=>pair.black&&(event.phase==='live'||pair.status==='finished')).map(pair=>({event,pair,key:`${event.id}:${pair.id}`,white:event.players.find(p=>p.id===pair.white),black:event.players.find(p=>p.id===pair.black)}));
 });
}
export function filterMatches(matches,{tournament='all',status='ongoing',query=''}){
 return matches.filter(m=>(tournament==='all'||m.event.id===tournament)&&(status==='all'||status==='completed'&&m.pair.status==='finished'||status==='ongoing'&&m.pair.status!=='finished')&&`${m.event.name} ${m.white.name} ${m.black.name}`.toLowerCase().includes(query.trim().toLowerCase()));
}
export function matchStatus(pair,{demo=true}={}){return demo?(pair.status==='finished'?'Completed demo':'Ongoing demo'):(pair.status==='finished'?'Completed':'Live');}
