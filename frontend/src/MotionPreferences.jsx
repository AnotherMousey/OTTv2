import React,{useEffect,useState} from 'react';

// Motion follows OS preferences and visibility. No visible motion toggles or
// legacy per-browser pause setting are used.
export function useMotion(){
 const [reduce,setReduce]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [visible,setVisible]=useState(!document.hidden);
 useEffect(()=>{
  const query=matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>setReduce(query.matches),visibility=()=>setVisible(!document.hidden);
  query.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);
  return()=>{query.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 return {reduce,visible,active:!reduce&&visible};
}
export function MotionEnvironment(){
 const {active}=useMotion();
 useEffect(()=>{document.documentElement.dataset.motion=active?'on':'off';},[active]);
 return null;
}
export function useDecorativeVisibility(page){useEffect(()=>{const hero=document.querySelector('.hero');if(!hero)return;const observer=new IntersectionObserver(([entry])=>{hero.dataset.sceneVisible=String(entry.isIntersecting);},{threshold:.03});observer.observe(hero);return()=>observer.disconnect();},[page]);}
