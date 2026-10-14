const title=value=>value?value[0].toUpperCase()+value.slice(1):'';
const square=value=>typeof value==='string'&&/^[a-z]\d{1,2}$/i.test(value)?value.toLowerCase():null;

// Use recorded move fields; never infer a move from differences in the board.
// Coordinates stay canonical even when the viewer flips the board.
export function describeMove(frame){
 const event=String(frame?.event||'');
 const move=frame?.move||{};
 const from=square(frame?.from||move.from),to=square(frame?.to||move.to);
 const side=title(move.player||frame?.side||(/^(white|black)-/.exec(event)?.[1])||'');
 if(from&&to){
  const piece=move.piece?` ${move.piece}`:'';
  let detail='';
  if(move.result==='attacker')detail=move.target?` · captures ${move.target}`:' · captures opponent';
  else if(move.result==='defender')detail=move.target?` · lost to ${move.target}`:' · attacker lost';
  else if(move.result==='goal')detail=' · reaches enemy source';
  else if(move.result==='invalid'||event.includes('-invalid-move')){
   const reason=event.split('turn forfeited: ')[1];
   detail=` · invalid move; turn forfeited${reason?': '+reason:''}`;
  }
  // Preserve already descriptive historical/sample events when no structured
  // battle result is supplied. They may contain useful recorded details.
  if(!move.result&&event.toLowerCase().includes(from)&&event.toLowerCase().includes(to))return event;
  return `${side||'Player'}${piece} ${from} → ${to}${detail}`;
 }
 if(event==='match-start')return 'Match started';
 if(event==='match-end')return frame.winner?`${title(frame.winner)} wins`:'Match finished';
 const forfeit=/^(white|black)-forfeit:\s*(.*)$/.exec(event);
 if(forfeit)return `${title(forfeit[1])} forfeits: ${forfeit[2]}`;
 if(/^(white|black)-move$/.test(event))return `${title(event.split('-')[0])} moved · coordinates unavailable in this recording`;
 return event||'Recorded event';
}
