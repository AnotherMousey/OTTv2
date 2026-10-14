// Publish the initial board immediately, then batch remote database writes.
// All flushes are serialized; the terminal result must wait for close().
class FrameBuffer {
  constructor(persist, {intervalMs=250, batchSize=20, onError=()=>{}}={}) {
    this.persist=persist; this.intervalMs=intervalMs; this.batchSize=batchSize;
    this.onError=onError; this.frames=[]; this.chain=Promise.resolve();
    this.first=true; this.closed=false; this.error=null; this.timer=null;
  }
  async add(frame) {
    if(this.closed)throw Error('Frame buffer is closed.');
    if(this.error)throw this.error;
    this.frames.push(frame);
    if(this.first||this.frames.length>=this.batchSize) {
      this.first=false; await this.flush();
    } else if(!this.timer) {
      this.timer=setTimeout(()=>{this.timer=null;this.flush().catch(()=>{});},this.intervalMs);
    }
  }
  flush() {
    clearTimeout(this.timer); this.timer=null;
    const batch=this.frames.splice(0);
    this.chain=this.chain.then(async()=>{
      if(this.error)throw this.error;
      if(batch.length&&!await this.persist(batch))throw Error('Job ownership changed.');
    });
    // Attach a handler immediately, including for timer-triggered flushes.
    this.chain.catch(error=>{if(!this.error){this.error=error;this.onError(error);}});
    return this.chain;
  }
  async close() {this.closed=true;await this.flush();}
  async discard() {
    this.closed=true;clearTimeout(this.timer);this.timer=null;this.frames=[];
    await this.chain.catch(()=>{});
  }
}
module.exports={FrameBuffer};
