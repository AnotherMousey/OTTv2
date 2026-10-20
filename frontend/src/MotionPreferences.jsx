import React,{useEffect,useState} from 'react';
function stored(){try{return localStorage.getItem('ott-studio-motion')!=='off';}catch{return true;}}
let enabled=stored();
export function useMotion(){
 const [on,setOn]=useState(enabled),[reduce,setReduce]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[visible,setVisible]=useState(!document.hidden);
 useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)');const motion=()=>setOn(enabled),change=()=>setReduce(q.matches),visibility=()=>setVisible(!document.hidden);window.addEventListener('ott-studio-motion',motion);q.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('ott-studio-motion',motion);q.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};},[]);
 return {on,reduce,visible,active:on&&!reduce&&visible};
}
export function MotionControl(){const {on,reduce,visible}=useMotion();useEffect(()=>{document.documentElement.dataset.motion=on&&!reduce&&visible?'on':'off';},[on,reduce,visible]);return <button className="motion-control" type="button" aria-pressed={!on} onClick={()=>{enabled=!on;try{localStorage.setItem('ott-studio-motion',enabled?'on':'off');}catch{}window.dispatchEvent(new Event('ott-studio-motion'));}}>{reduce?'Reduced motion':on?'Pause motion':'Resume motion'}</button>;}
export function useDecorativeVisibility(page){useEffect(()=>{const hero=document.querySelector('.hero');if(!hero)return;const observer=new IntersectionObserver(([entry])=>{hero.dataset.sceneVisible=String(entry.isIntersecting);},{threshold:.03});observer.observe(hero);return()=>observer.disconnect();},[page]);}
