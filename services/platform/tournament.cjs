// Game-independent tournament decisions shared by every deployment.
function eloDelta(a,b,score,k=32){return Math.round(k*(score-1/(1+10**((b-a)/400))));}
function pairEntries(entries,history,round){
 const pool=[...entries].sort((a,b)=>b.user.rating-a.user.rating||a.userId.localeCompare(b.userId)),pairs=[];
 const played=new Set(history.filter(m=>m.blackId).map(m=>[m.whiteId,m.blackId].sort().join(':')));
 const bye=pool.length%2?pool.pop():null;
 while(pool.length){const a=pool.shift();let pos=pool.findIndex(b=>!played.has([a.userId,b.userId].sort().join(':')));if(pos<0)pos=0;const b=pool.splice(pos,1)[0];pairs.push(round%2?[a,b]:[b,a]);}
 if(bye)pairs.push([bye,null]);return pairs;
}
function resultScore(result){
 // score is participant slot 0's score. Slot names in storage are legacy API aliases.
 if(!result||![0,.5,1].includes(result.score))throw Error('Invalid normalized match score.');
 return result.score;
}
module.exports={eloDelta,pairEntries,resultScore};
