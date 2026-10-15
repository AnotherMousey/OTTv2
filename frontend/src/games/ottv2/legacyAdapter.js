import {parseReplay} from '../../replay.js';
export function squareToPosition(square,size=9,height=size) {
  const m=/^([a-z])(\d{1,2})$/i.exec(square || '');
  if (!m || m[1].toLowerCase().charCodeAt(0)-97 >= size || +m[2]<1 || +m[2]>height) throw Error('Invalid piece square.');
  return {x:m[1].toLowerCase().charCodeAt(0)-97,y:height-Number(m[2])};
}
export function positionToSquare(x,y,size=9,height=size) {
  if (!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=size||y>=height)throw Error('Invalid board coordinate.');
  return `${String.fromCharCode(97+x)}${height-y}`;
}
export function stateToPieces(state) {
  const height=state?.ruleSet?.width ?? state?.board?.length;
  const size=state?.ruleSet?.length ?? state?.ruleSet?.boardSize ?? state?.board?.[0]?.length;
  if (!Number.isInteger(size)||size<1||size>26||!Number.isInteger(height)||height<1||height>26||!Array.isArray(state.board)||state.board.length!==height||state.board.some(row=>!Array.isArray(row)||row.length!==size))throw Error('Invalid backend grid.');
  return state.board.flat().filter(Boolean).map(p=>({id:p.id,side:p.color,type:p.type,...squareToPosition(p.square,size,height)})).sort((a,b)=>a.id.localeCompare(b.id));
}
function adapt(log,mode) {
  if(!log?.matchId||!Array.isArray(log.frames)||!log.frames.length)throw Error('Replay log is incomplete.');
  const state=log.frames[0].state;
  const size=log.board?.width ?? log.config?.length ?? log.boardSize ?? state?.ruleSet?.length ?? state?.board?.[0]?.length ?? 9;
  const height=log.board?.height ?? log.config?.width ?? state?.ruleSet?.width ?? state?.board?.length ?? size;
  const frames=log.frames.map(frame=>{
    if(Array.isArray(frame.pieces))return frame;
    const {state,event,move,moveNumber}=frame;
    return {pieces:stateToPieces(state),event,moveNumber,side:move?.player||state.currentTurn,...(move?{from:move.from,to:move.to,move:{...move}}:{}),status:state.status,winner:state.winner,endReason:state.endReason,currentTurn:state.currentTurn,clocks:{white:state.whiteTimeMs,black:state.blackTimeMs}};
  });
  return parseReplay(JSON.stringify({
    ...log,schemaVersion:1,gameId:log.gameId ?? 'ottv2',rendererVersion:log.rendererVersion ?? '1',
    rulesVersion:log.rulesVersion ?? (mode==='room-recording'?'legacy-timed':'legacy-bot-log'),
    ...(size===height?{boardSize:size}:{}),board:{...log.board,width:size,height},mapName:log.mapName ?? (log.roomId?`Room ${log.roomId}`:`Bot match ${log.matchId}`),
    // Missing historical metadata remains unknown rather than inferred from frame count.
    maxMoves:log.maxMoves ?? log.config?.maxTurns ?? null,
    firstSide:log.firstSide ?? state?.ruleSet?.firstSide ?? frames[0].currentTurn ?? 'white',
    teams:log.teams ?? {white:'White player',black:'Black player'},mode,
    timeLimitMs:log.timeLimitMs ?? state?.ruleSet?.startingClockMs ?? null,frames,
    result:log.result ?? (frames.at(-1).status==='finished'?{status:'finished',winner:frames.at(-1).winner,reason:frames.at(-1).endReason ?? 'legacy-result'}:null),
  }));
}
export function recordingToReplay(recording){if(!recording?.roomId)throw Error('Room recording is incomplete.');return adapt(recording,'room-recording');}
export function matchLogToReplay(log){return adapt(log,log.mode || 'bot-match');}
