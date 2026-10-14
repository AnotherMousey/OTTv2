export function botReadiness(player){
 if(player?.botReady||player?.submissionStatus==='ready')return {title:'BOT READY',label:'Validated bot'};
 switch(player?.submissionStatus){
  case 'queued':return {title:'VALIDATION QUEUED',label:'Validation queued'};
  case 'validating':return {title:'VALIDATING BOT',label:'Validating'};
  case 'invalid':return {title:'VALIDATION FAILED',label:'Invalid bot'};
  case 'error':return {title:'VALIDATION ERROR',label:'Execution error'};
  default:return {title:'BOT NEEDED',label:player?.botName?'Saved · not ready':'Not submitted'};
 }
}

// Older pasted submissions used an internal CUID as their display filename.
// Preserve real uploaded filenames and only hide that generated prefix.
export function friendlyBotFilename(filename,language='Python'){
 if(!filename)return '';
 return /^c[a-z0-9]{20,}_bot\.(py|java|cpp)$/i.test(filename)?`bot.${({Python:'py',python:'py',Java:'java',java:'java','C++':'cpp',cpp:'cpp'}[language]||filename.split('.').at(-1))}`:filename;
}
