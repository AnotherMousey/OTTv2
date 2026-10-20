export function outcome(match,id){
 if(match.status==='bye')return id===match.whiteId?'BYE':'';
 if(match.status!=='finished'||![0,.5,1].includes(match.score))return '';
 if(match.score===.5)return 'DRAW';
 return (match.score===1?match.whiteId:match.blackId)===id?'WIN':'LOSS';
}
export function statusLabel(status){return {running:'LIVE',scheduled:'ASSIGNED',queued:'QUEUED',finished:'COMPLETED',bye:'BYE',failed:'FAILED'}[status]||'UNKNOWN';}
export function columnState(column,currentRound){
 if(!column.total)return column.round>currentRound?'Unpublished':'No pairings';
 if(column.completed===column.total)return 'Completed';
 if(column.live)return 'In progress';
 if(column.failed)return 'Needs attention';
 return 'Published';
}
export function visibleMatches(column){return column.focused&&!column.matches.some(m=>m.id===column.focused.id)?[{...column.focused,pinned:true},...column.matches]:column.matches;}
