const {test}=require('node:test');const assert=require('node:assert/strict');
const {prisma,transaction}=require('../shared/db.cjs');
test('transaction retries a complete P2034 callback and preserves requested isolation',async()=>{
 const original=prisma.$transaction;let calls=0;
 prisma.$transaction=async(fn,options)=>{assert.equal(options.isolationLevel,'ReadCommitted');calls++;if(calls<3)throw Object.assign(Error('conflict'),{code:'P2034'});return fn({fixture:true});};
 try{assert.equal(await transaction(async tx=>tx.fixture,{isolationLevel:'ReadCommitted'}),true);assert.equal(calls,3);}finally{prisma.$transaction=original;await prisma.$disconnect();}
});
test('transaction does not retry unrelated errors',async()=>{
 const original=prisma.$transaction;let calls=0;
 prisma.$transaction=async()=>{calls++;throw Object.assign(Error('disconnected'),{code:'P1001'});};
 try{await assert.rejects(transaction(async()=>{}),{code:'P1001'});assert.equal(calls,1);}finally{prisma.$transaction=original;}
});

test('raw MySQL deadlocks retry without relaxing default tournament isolation',async()=>{
 const original=prisma.$transaction;let calls=0;
 prisma.$transaction=async(fn,options)=>{assert.equal(options.isolationLevel,'Serializable');calls++;if(calls===1)throw Object.assign(Error('deadlock'),{code:'P2010',meta:{code:'1213'}});return fn({});};
 try{assert.equal(await transaction(async()=>42),42);assert.equal(calls,2);}finally{prisma.$transaction=original;}
});
