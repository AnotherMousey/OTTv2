import React,{useLayoutEffect,useRef,useState} from 'react';
import {transitionPieces} from './motion.js';
export function AnimatedPieces({frame,width,height,flipped,compact,selected,onSelect,Piece,animationMs=720}) {
 const [items,setItems]=useState(()=>frame.pieces.map(p=>({...p,exiting:false})));
 const previous=useRef(frame.pieces), lastFrame=useRef(frame);
 useLayoutEffect(()=>{
  const changed=lastFrame.current!==frame;
  const animate=changed&&animationMs>0&&!compact;
  const next=transitionPieces(previous.current,frame.pieces,frame,width,height,animate);
  previous.current=next.filter(p=>!p.exiting);lastFrame.current=frame;setItems(next);
  if(!next.some(p=>p.exiting))return;
  const timer=setTimeout(()=>setItems(current=>current.filter(p=>!p.exiting)),animationMs+35);
  return()=>clearTimeout(timer);
 },[frame,width,height,animationMs,compact]);
 const position=p=>({left:0,top:0,transform:`translate3d(${(flipped?width-1-p.x:p.x)*100}%, ${(flipped?height-1-p.y:p.y)*100}%, 0)`, '--piece-motion':`${animationMs}ms`});
 return <div className="piece-layer">{items.map(p=>{
  const props={key:p.id,'data-piece-id':p.id,className:`piece ${p.side} ${selected===p.id?'selected':''} ${p.exiting?'exiting':''}`,style:position(p)};
  return compact?<div {...props}><Piece kind={p.type} side={p.side}/></div>:<button {...props} aria-hidden={p.exiting||undefined} disabled={p.exiting} aria-pressed={selected===p.id} aria-label={`${p.side} ${p.type} at ${String.fromCharCode(97+p.x)}${height-p.y}`} onClick={()=>onSelect?.(p.id)}><Piece kind={p.type} side={p.side}/></button>;
 })}</div>;
}
