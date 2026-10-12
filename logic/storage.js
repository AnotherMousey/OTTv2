const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const directory=path.resolve(process.env.DATA_DIR||path.join(__dirname,'../data'));
// One backend process owns this directory. Each record is atomically replaced.
function folder(kind){const p=path.join(directory,kind);fs.mkdirSync(p,{recursive:true,mode:0o700});return p;}
function save(kind,record){
  if(!/^[A-Z0-9-]+$/.test(record.id))throw Error('Invalid record ID.');
  const target=path.join(folder(kind),record.id+'.json');
  const temp=target+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';
  try{fs.writeFileSync(temp,JSON.stringify(record),{mode:0o600});fs.renameSync(temp,target);}
  finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
function load(kind){return fs.readdirSync(folder(kind)).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(folder(kind),f),'utf8')));}
module.exports={save,load};
