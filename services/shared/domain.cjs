const crypto=require('node:crypto');
class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new ApiError(status,message);};
const int=(value,min,max,label)=>{const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)fail(400,`${label} must be ${min}-${max}.`);return n;};
const text=(value,min,max,label)=>{if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)fail(400,`${label} must contain ${min}-${max} characters.`);return value.trim();};
const username=value=>{const v=text(value,3,32,'Username').toLowerCase();if(!/^[a-z0-9][a-z0-9._-]+$/.test(v))fail(400,'Username contains invalid characters.');return v;};
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
async function passwordHash(value){if(typeof value!=='string'||value.length<12||value.length>128)fail(400,'Password must contain 12-128 characters.');const salt=crypto.randomBytes(16).toString('hex');return `${salt}:${(await scrypt(value,salt)).toString('hex')}`;}
const scrypt=(v,salt)=>new Promise((resolve,reject)=>crypto.scrypt(v,salt,64,(e,key)=>e?reject(e):resolve(key)));
async function verifyPassword(value,encoded){if(typeof value!=='string'||value.length>128)return false;const [salt,hash]=encoded.split(':');if(!salt||!/^[a-f0-9]{128}$/.test(hash))return false;return crypto.timingSafeEqual(await scrypt(value,salt),Buffer.from(hash,'hex'));}
function publicUser(u){return {id:u.id,username:u.username,name:u.name,role:u.role,rating:u.rating,games:u.games,lastDelta:u.lastDelta};}
function botInput(body){const language=String(body.language||'').toLowerCase();if(!['python','java','cpp'].includes(language))fail(400,'Language must be python, java or cpp.');const filename=text(body.filename||`bot.${{python:'py',java:'java',cpp:'cpp'}[language]}`,1,100,'Filename');if(!filename.toLowerCase().endsWith('.'+{python:'py',java:'java',cpp:'cpp'}[language]))fail(400,'Filename and language do not match.');if(typeof body.source!=='string'||!body.source.trim()||Buffer.byteLength(body.source)>256*1024)fail(400,'Source must be nonempty and at most 256 KB.');return {filename,language,source:body.source,sourceHash:digest(body.source)};}
function eloDelta(a,b,score,k=32){return Math.round(k*(score-1/(1+10**((b-a)/400))));}
function pairEntries(entries,history,round){const pool=[...entries].sort((a,b)=>b.user.rating-a.user.rating||a.userId.localeCompare(b.userId)),pairs=[];const played=new Set(history.filter(m=>m.blackId).map(m=>[m.whiteId,m.blackId].sort().join(':')));const bye=pool.length%2?pool.pop():null;while(pool.length){const a=pool.shift();let pos=pool.findIndex(b=>!played.has([a.userId,b.userId].sort().join(':')));if(pos<0)pos=0;const b=pool.splice(pos,1)[0];pairs.push(round%2?[a,b]:[b,a]);}if(bye)pairs.push([bye,null]);return pairs;}
module.exports={ApiError,fail,int,text,username,digest,passwordHash,verifyPassword,publicUser,botInput,eloDelta,pairEntries};
