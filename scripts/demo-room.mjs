const base=process.env.OTT_BASE_URL || 'http://localhost:3000';
async function post(path,body){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
const suffix=Date.now().toString(36),white=`demo-white-${suffix}`,black=`demo-black-${suffix}`;
const {roomId}=await post('/api/rooms',{clientId:white});
const path=`/api/rooms/${roomId}`;
await post(path+'/join',{clientId:black});
await post(path+'/move',{clientId:white,from:'b1',to:'a1'});
await post(path+'/move',{clientId:black,from:'h9',to:'i9'});
await post(path+'/forfeit',{clientId:black});
console.log('Scripted human-room API fixture (not autonomous bots).');
console.log(`${base}/?room=${roomId}#match`);
console.log(`Client IDs: white=${white}, black=${black}`);
