export function motionTiming(speed=1) {
 const valid=[0.5,1,2,4].includes(speed)?speed:1;
 return {intervalMs:900/valid,durationMs:720/valid};
}
export function captureExitPosition(piece,frame,width,height) {
 const parse=s=>{const m=/^([a-z])(\d{1,2})$/i.exec(s||'');return m?{x:m[1].toLowerCase().charCodeAt(0)-97,y:height-Number(m[2])}:null;};
 const from=parse(frame.from),to=parse(frame.to);
 if(from&&to&&piece.x===from.x&&piece.y===from.y&&to.x>=0&&to.x<width&&to.y>=0&&to.y<height&&Math.max(Math.abs(from.x-to.x),Math.abs(from.y-to.y))===1)return to;
 return {x:piece.x,y:piece.y};
}
export function transitionPieces(previous,next,frame,width,height,animate=true) {
 if(!animate)return next.map(p=>({...p,exiting:false}));
 const byId=new Map(next.map(p=>[p.id,p]));
 const previousIds=new Set(previous.map(p=>p.id));
 // Preserve node order during captures: moving a keyed DOM node can cancel its transition.
 return [...previous.filter(p=>!p.exiting).map(p=>byId.has(p.id)?{...byId.get(p.id),exiting:false}:{...p,...captureExitPosition(p,frame,width,height),exiting:true}),...next.filter(p=>!previousIds.has(p.id)).map(p=>({...p,exiting:false}))];
}
