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
