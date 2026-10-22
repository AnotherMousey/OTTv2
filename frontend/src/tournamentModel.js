export const playersSeed=[
 {id:'byte',name:'Byte Knights',rating:1740,games:24},
 {id:'null',name:'Null Pointer',rating:1660,games:22},
 {id:'atlas',name:'Atlas Team',rating:1532,games:18},
 {id:'nova',name:'Nova',rating:1516,games:20},
 {id:'moss',name:'Moss',rating:1455,games:16},
 {id:'paper',name:'Paper Planes',rating:1438,games:17},
 {id:'pixel',name:'Pixel Pawns',rating:1362,games:12},
 {id:'scroll',name:'Scroll Keepers',rating:1334,games:14},
];
export function initialTournament(){return{round:1,players:playersSeed.map(p=>({...p,joined:p.id!=='atlas',lastDelta:0,wins:0,draws:0,losses:0,opponents:[]})),pairs:[],history:[]};}
export function rankPlayers(players){return [...players].sort((a,b)=>b.rating-a.rating||a.name.localeCompare(b.name));}
export function pairPlayers(players,round){
 const pool=rankPlayers(players.filter(p=>p.joined)),pairs=[];
 const bye=pool.length%2?pool.pop():null;
 while(pool.length){
  const first=pool.shift();
  const opponent=[...pool].sort((a,b)=>(Math.abs(first.rating-a.rating)+(first.opponents.includes(a.id)?10000:0))-(Math.abs(first.rating-b.rating)+(first.opponents.includes(b.id)?10000:0)))[0];
  pool.splice(pool.findIndex(p=>p.id===opponent.id),1);
  const [white,black]=round%2?[first,opponent]:[opponent,first];
  pairs.push({id:`R${round}-${pairs.length+1}`,round,white:white.id,black:black.id,status:'scheduled',whiteBefore:white.rating,blackBefore:black.rating});
 }
 if(bye)pairs.push({id:`R${round}-BYE`,round,white:bye.id,black:null,status:'bye'});
 return pairs;
}
export function eloDelta(a,b,score,k=32){return Math.round(k*(score-1/(1+10**((b-a)/400))));}
export function recordResult(state,pairId,score){
 const pair=state.pairs.find(p=>p.id===pairId);
 if(!pair||pair.status!=='scheduled'||![0,.5,1].includes(score))return state;
 const white=state.players.find(p=>p.id===pair.white),black=state.players.find(p=>p.id===pair.black);
 const delta=eloDelta(white.rating,black.rating,score);
 const result={...pair,status:'finished',score,whiteDelta:delta,blackDelta:-delta};
 return {...state,players:state.players.map(p=>p.id===white.id||p.id===black.id?{...p,rating:p.rating+(p.id===white.id?delta:-delta),lastDelta:p.id===white.id?delta:-delta,games:p.games+1,wins:p.wins+((p.id===white.id?score:1-score)===1?1:0),draws:p.draws+(score===.5?1:0),losses:p.losses+((p.id===white.id?score:1-score)===0?1:0),opponents:[...p.opponents,p.id===white.id?black.id:white.id]}:p),pairs:state.pairs.map(p=>p.id===pairId?result:p),history:[result,...state.history]};
}

export const PHASES=['registration','preparation','pairing','live','finished'];
// Daily events report their own entry window; classic events take entries only during registration.
export const entryWindow=t=>t?.entryWindow??t?.phase==='registration';
export const phaseLabel=phase=>({registration:'Registration',preparation:'Bot preparation',pairing:'Pairing review',live:'Matches',finished:'Finished'}[phase]||phase);
export function makeEvent(id,name,phase='registration'){
 const seed=initialTournament();
 const players=seed.players.map(p=>({...p,joined:phase!=='registration'||p.id==='nova',entry:phase!=='registration'||p.id==='nova'?'accepted':p.id==='atlas'?'none':'pending',botReady:phase!=='registration',botName:phase!=='registration'?`${p.id}_bot.py`:'',language:'Python'}));
 const event={...seed,id,name,description:'University bot programming tournament',phase,players,round:1,totalRounds:3,capacity:32,mapId:'standard-9',firstSide:'white',maxTurns:31};
 return phase==='live'||phase==='pairing'?{...event,pairs:pairPlayers(players,1).map((p,i)=>({...p,sampleIndex:i+2}))}:event;
}
export function previewEvents(){const completed=makeEvent('autumn-final','Autumn Final','live');const done=completed.pairs.reduce((event,pair)=>recordResult(event,pair.id,.5),completed);done.phase='finished';done.totalRounds=1;return [makeEvent('ott-open','OTT Open'),makeEvent('campus-cup','Campus Cup','live'),makeEvent('rookie-arena','Rookie Arena','live'),makeEvent('weekly-sprint','Weekly Sprint','preparation'),done];}
export function joinEvent(event,id){
 if(event.phase!=='registration')throw Error('Registration is closed for this tournament.');
 const player=event.players.find(p=>p.id===id);
 if(!player)throw Error('Account is not available.');
 if(['accepted','pending'].includes(player.entry))return event;
 if(event.players.filter(p=>['accepted','pending'].includes(p.entry)).length>=event.capacity)throw Error('This tournament is full.');
 return {...event,players:event.players.map(p=>p.id===id?{...p,entry:'pending',joined:false}:p)};
}
export function reviewEntry(event,id,accepted){
 if(event.phase!=='registration')throw Error('Entries can only be reviewed during registration.');
 return {...event,players:event.players.map(p=>p.id===id?{...p,entry:accepted?'accepted':'declined',joined:accepted}:p)};
}
export function saveEventBot(event,id,bot){
 if(event.phase!=='preparation')throw Error('Bot submissions are only open during bot preparation.');
 if(!event.players.some(p=>p.id===id&&p.entry==='accepted'))throw Error('Your entry must be accepted first.');
 return {...event,players:event.players.map(p=>p.id===id?{...p,botReady:true,botName:bot.name,language:bot.language,fileChecks:bot.fileChecks||'demo',botVersion:(p.botVersion||0)+1,botSavedAt:new Date().toISOString()}:p)};
}
export function advanceEvent(event){
 const accepted=event.players.filter(p=>p.entry==='accepted');
 if(event.phase==='registration'){
  if(event.players.some(p=>p.entry==='pending'))throw Error('Review all pending entries before closing registration.');
  if(accepted.length<2)throw Error('Accept at least two players before bot preparation.');
  return {...event,phase:'preparation'};
 }
 if(event.phase==='preparation'){
  if(accepted.length<2)throw Error('At least two accepted players are required.');
  if(accepted.some(p=>!p.botReady))throw Error('Every accepted player needs a bot before pairing.');
  return {...event,phase:'pairing',pairs:pairPlayers(event.players,event.round).map((p,i)=>({...p,sampleIndex:i+2}))};
 }
 if(event.phase==='pairing')return {...event,phase:'live'};
 if(event.phase==='live'){
  if(event.pairs.some(p=>p.status==='scheduled'))throw Error('Finish every match before advancing the round.');
  if(event.round>=event.totalRounds)return {...event,phase:'finished'};
  return {...event,phase:'preparation',round:event.round+1,pairs:[]};
 }
 throw Error('This tournament is already finished.');
}
