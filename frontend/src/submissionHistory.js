export function historyStorage() {try{return window.localStorage;}catch{return null;}}
const KEY='ott-submission-history-v1';
export function readHistory(storage) {
  try {const records=JSON.parse(storage?.getItem(KEY)||'[]');return Array.isArray(records)?records.filter(r=>r&&typeof r.id==='string'&&typeof r.matchId==='string'):[];}catch{return [];}
}
export function writeHistory(record,storage) {
  const records=readHistory(storage);
  const next=[record,...records.filter(r=>r.id!==record.id)].slice(0,100);
  try {storage?.setItem(KEY,JSON.stringify(next));return true;}catch{return false;}
}
export function updateHistoryMatch(matchId,status,storage) {
  const existing=readHistory(storage).find(r=>r.matchId===matchId);
  if(existing)writeHistory({...existing,status:status.status,result:status.result||existing.result,error:status.error||''},storage);
}
export function matchFailure(replay) {
  if(replay?.result?.reason!=='bot-error' && !replay?.frames?.some(f=>f.endReason==='bot-error'))return null;
  const event=replay.frames.map(f=>f.event||'').find(e=>/ENOENT|process stopped|process exited|timeout/i.test(e))||'Bot execution failed.';
  const missing=/spawn\s+(\S+)\s+ENOENT/i.exec(event);
  return {title:missing?'Bot runtime unavailable':'Bot execution stopped',detail:missing?`The backend could not find ${missing[1]}. The bot did not start; its strategy was not evaluated.`:event,technical:event};
}

let memoryClientId;
export function submissionClientId(){
 const storage=historyStorage();
 try {const existing=storage?.getItem('ott-submission-client-id');if(existing)return existing;}catch{}
 if(!memoryClientId)memoryClientId=crypto.randomUUID();
 try{storage?.setItem('ott-submission-client-id',memoryClientId);}catch{}
 return memoryClientId;
}
