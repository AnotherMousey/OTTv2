const crypto=require('node:crypto');
const {fail}=require('../shared/domain.cjs');
function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';}
const digest=value=>crypto.createHash('sha256').update(canonical(value)).digest('hex');
function unique(rows,key){if(!Array.isArray(rows)||new Set(rows.map(r=>r?.[key])).size!==rows.length)fail(400,'Duplicate or invalid '+key);}
function validateManifest(m){
 if(m?.format!=='bot-tournament-bundle'||m.version!==1||m.tournament?.phase!=='finished')fail(400,'Only version 1 completed tournament bundles are supported.');
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(m.tournament.id)||!Array.isArray(m.participants)||m.participants.length<2||m.participants.length>4000||!Array.isArray(m.submissions)||m.submissions.length>80000||!Array.isArray(m.matches)||m.matches.length>40000)fail(400,'Bundle exceeds tournament bounds.');
 unique(m.participants,'id');unique(m.participants,'username');unique(m.submissions,'id');unique(m.matches,'id');
 const users=new Set(m.participants.map(u=>u.id));
 for(const u of m.participants)if(typeof u.id!=='string'||u.id.length>30||typeof u.username!=='string'||typeof u.name!=='string'||u.name.length>80||!Number.isInteger(u.rating)||!Number.isInteger(u.games))fail(400,'Invalid participant.');
 for(const s of m.submissions)if(typeof s.id!=='string'||s.id.length>30||!users.has(s.userId)||!['python','java','cpp'].includes(s.language)||typeof s.filename!=='string'||s.filename.length>100||!/^[a-f0-9]{64}$/.test(s.sourceHash)||!Number.isInteger(s.version)||s.version<1||!Number.isFinite(Date.parse(s.createdAt)))fail(400,'Invalid submission.');
 for(const match of m.matches)if(!/^MATCH-[A-Za-z0-9-]{1,42}$/.test(match.id)||!/^[a-f0-9]{64}$/.test(match.digest))fail(400,'Invalid match descriptor.');
 if(typeof m.tournament.name!=='string'||m.tournament.name.length>80||typeof m.tournament.description!=='string'||m.tournament.description.length>240||!Number.isInteger(m.tournament.totalRounds)||m.tournament.totalRounds<1||m.tournament.totalRounds>20)fail(400,'Invalid tournament.');
 if(m.matches.length!==Math.ceil(m.participants.length/2)*m.tournament.totalRounds)fail(400,'Expected one pairing or bye per participant in every completed round.');return digest(m);
}
function validatePart(part,manifest){
 const descriptor=manifest.matches.find(m=>m.id===part?.match?.id);if(!descriptor||descriptor.digest!==digest(part))fail(409,'Match checksum differs from the manifest.');
 const m=part.match,users=new Set(manifest.participants.map(u=>u.id)),submissions=new Map(manifest.submissions.map(s=>[s.id,s]));
 if(!['finished','bye'].includes(m.status)||!users.has(m.whiteId)||(m.blackId&&!users.has(m.blackId))||!Number.isInteger(m.round)||m.round<1||m.round>manifest.tournament.totalRounds)fail(400,'Invalid match references or status.');
 if(m.blackId===m.whiteId||!submissions.has(m.whiteSubmissionId)||submissions.get(m.whiteSubmissionId).userId!==m.whiteId||(m.blackId&&(!submissions.has(m.blackSubmissionId)||submissions.get(m.blackSubmissionId).userId!==m.blackId)))fail(400,'Submission ownership mismatch.');
 if(m.status==='finished'&&(!m.blackId||![0,.5,1].includes(m.score)||!m.result||!m.runId))fail(400,'Invalid completed result.');
 if(m.status==='bye'&&(m.blackId||m.score!==null))fail(400,'Invalid bye.');
 if(!Array.isArray(part.frames)||part.frames.length>10002)fail(400,'Invalid replay frame count.');
 unique(part.frames,'seq');for(const f of part.frames)if(!Number.isInteger(f.seq)||f.seq<0||f.seq>10001||!f.payload||typeof f.payload!=='object')fail(400,'Invalid replay frame.');
 for(const key of ['whiteBefore','blackBefore','whiteDelta','blackDelta'])if(!Number.isInteger(m[key]))fail(400,'Invalid rating evidence.');
 return descriptor.digest;
}
module.exports={canonical,digest,validateManifest,validatePart};
