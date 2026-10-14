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
