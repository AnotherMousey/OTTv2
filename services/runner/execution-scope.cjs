// Bound asynchronous plugin execution even when its promise ignores cancellation.
function abortable(promise,signal){
 if(signal.aborted)return Promise.reject(Object.assign(Error('Execution cancelled or deadline exceeded.'),{code:'RUNNER_INFRA'}));
 return new Promise((resolve,reject)=>{const cancel=()=>reject(Object.assign(Error('Execution cancelled or deadline exceeded.'),{code:'RUNNER_INFRA'}));signal.addEventListener('abort',cancel,{once:true});Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',cancel));});
}
class ExecutionScope{
 constructor(factory,stop,signal){this.originalFactory=factory;this.originalStop=stop;this.signal=signal;this.players=new Set();}
 factory=async(...args)=>{if(this.signal.aborted)throw Object.assign(Error('Execution cancelled before bot startup.'),{code:'RUNNER_INFRA'});const player=await this.originalFactory(...args);if(this.signal.aborted){await this.originalStop(player);throw Object.assign(Error('Execution cancelled during bot startup.'),{code:'RUNNER_INFRA'});}this.players.add(player);return player;};
 stop=async player=>{if(!player||!this.players.delete(player))return;await this.originalStop(player);};
 close=async()=>{await Promise.allSettled([...this.players].map(this.stop));};
}
module.exports={abortable,ExecutionScope};
