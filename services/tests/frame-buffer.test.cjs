const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrameBuffer}=require('../worker/frame-buffer.cjs');

test('first board publishes immediately, subsequent frames batch in order before finish',async()=>{
  const batches=[];
  const buffer=new FrameBuffer(async frames=>{batches.push(frames.map(f=>f.seq));return true;});
  await buffer.add({seq:0});assert.deepEqual(batches,[[0]]);
  for(let seq=1;seq<=500;seq++)await buffer.add({seq});
  await buffer.close();
  assert.deepEqual(batches.flat(),Array.from({length:501},(_,i)=>i));
  assert.equal(batches.length,26,'501 frames use 26 publication transactions rather than 501');
});
test('slow matches flush pending frames without waiting for the next bot move',async()=>{
  const batches=[];
  let resolve;const published=new Promise(r=>resolve=r);
  const buffer=new FrameBuffer(async frames=>{batches.push(frames.map(f=>f.seq));if(frames[0].seq===1)resolve();return true;},{intervalMs:10});
  await buffer.add({seq:0});await buffer.add({seq:1});
  await published;await buffer.close();assert.deepEqual(batches,[[0],[1]]);
});
test('lease loss interrupts publication and close cannot silently finish',async()=>{
  let errors=0;
  const buffer=new FrameBuffer(async()=>false,{onError:()=>errors++});
  await assert.rejects(buffer.add({seq:0}),/ownership changed/);
  await assert.rejects(buffer.close(),/ownership changed/);
  await buffer.discard();assert.equal(errors,1);
});
