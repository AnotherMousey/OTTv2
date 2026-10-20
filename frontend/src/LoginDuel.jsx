import React,{useEffect,useRef,useState} from 'react';
import {Avatar,defaults} from './Avatar.jsx';
import {Pixel} from './Pixel.jsx';
import {useMotion} from './MotionPreferences.jsx';
// Decorative illustration only. Official matches still use the engine.
const rounds=[['rock','scissors'],['paper','scissors'],['paper','paper'],['scissors','paper'],['rock','paper'],['scissors','scissors']];
const phases=['ready','windup','reveal','result','recover'];
const duration=[750,1350,400,2600,800];
export function duelResult(left,right){return left===right?'draw':({rock:'scissors',paper:'rock',scissors:'paper'}[left]===right?'gold':'blue');}
export function LoginDuel(){
 const {active,reduce}=useMotion();const [onscreen,setOnscreen]=useState(true),[round,setRound]=useState(0),[phase,setPhase]=useState(0);const ref=useRef(null);
 useEffect(()=>{const observer=new IntersectionObserver(([entry])=>setOnscreen(entry.isIntersecting),{threshold:.05});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const running=active&&onscreen;
 useEffect(()=>{if(!running)return;const timer=setTimeout(()=>{if(phase===phases.length-1){setRound(r=>r+1);setPhase(0);}else setPhase(p=>p+1);},duration[phase]);return()=>clearTimeout(timer);},[running,phase,round]);
 const [left,right]=rounds[round%rounds.length],winner=duelResult(left,right),revealed=phase>=2||reduce,resolved=phase>=3||reduce;
 let gold=0,blue=0;for(let i=0;i<round%rounds.length;i++){const result=duelResult(...rounds[i]);gold+=result==='gold';blue+=result==='blue';}if(resolved){gold+=winner==='gold';blue+=winner==='blue';}
 const emotion=side=>resolved?(winner==='draw'?'draw':winner===side?'win':'lose'):undefined;
 return <section className="duel-scene" ref={ref} data-phase={phases[phase]} data-running={running} data-onscreen={onscreen} data-reduced={reduce} data-winner={resolved?winner:'none'} aria-label="Decorative rock paper scissors duel">
 <div className="duel-heading"><span className="eyebrow">A FRIENDLY RIVALRY</span><span className="duel-round">ROUND {String(round%rounds.length+1).padStart(2,'0')}</span></div>
 <div className="duel-stage"><span className="duel-star one"/><span className="duel-star two"/><div className="duel-floor"/>
 {['gold','blue'].map((side,i)=><div className={`duel-contender ${side}`} key={side} data-emotion={emotion(side)||'ready'}>
 <div className={`duel-bubble ${revealed?'revealed':''}`} aria-hidden="true">{revealed?<Pixel kind={i?right:left} side={i?'black':'white'}/>:<span className="duel-ellipsis">· · ·</span>}</div>
 <div className="duel-actor"><Avatar emotion={emotion(side)} look={i?{...defaults,hat:'fez',hatColor:'#458DE0',bodyColor:'#458DE0',accessory:'flower'}:{...defaults,hat:'fez',accessory:'bow'}}/></div>
 <span className="duel-team">{side.toUpperCase()}</span></div>)}
 <div className="duel-score" aria-label={`Illustration score: gold ${gold}, blue ${blue}`}><b>{gold}</b><span>:</span><b>{blue}</b></div>
 <div className="duel-result" aria-live="off">{resolved?(winner==='draw'?'A DRAW. WOW!':winner==='gold'?'GOLD WINS!':'BLUE WINS!'):phase===0?'READY FOR ANOTHER ROUND?':phase===1?'ROCK. PAPER. SCISSORS.':'THE REVEAL…'}</div>
 </div>

 </section>;
}
