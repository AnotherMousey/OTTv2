import React from 'react';
export const defaults={hatColor:'#F5A641',bodyColor:'#F5A641',hat:'antenna',eyes:'bright',mouth:'smile',cheeks:'blush',accessory:'none'};
export const palette=[['Gold','#F5A641'],['Blue','#458DE0'],['Violet','#AA83D4'],['Rose','#E481A9'],['Coral','#E97164'],['Mint','#63B8A4'],['Teal','#299AAB'],['Ivory','#E8DDB9'],['Crimson','#BF465C'],['Sky','#91C9ED'],['Copper','#B7754B'],['Midnight','#45475B']];
export const hats=[['antenna','Antenna'],['fez','Fez'],['cap','Cap'],['crown','Crown'],['wizard','Wizard'],['cat','Cat ears'],['headphones','Headphones'],['none','No hat']];
export const eyes=[['bright','Bright'],['sparkle','Sparkling'],['happy','Happy'],['sleepy','Sleepy'],['wow','Surprised'],['wink','Wink'],['angry','Determined'],['star','Star eyes']];
export const mouths=[['smile','Smile'],['grin','Grin'],['neutral','Neutral'],['wow','Wow'],['tongue','Playful'],['smirk','Smirk'],['teeth','Teeth'],['sad','Sad']];
export const cheeks=[['none','None'],['blush','Blush'],['freckles','Freckles']];
export const accessories=[['none','None'],['glasses','Glasses'],['shades','Shades'],['mustache','Mustache'],['bow','Bow tie'],['bandage','Bandage'],['monocle','Monocle'],['flower','Flower']];
export function Avatar({look=defaults,emotion,pose='idle',className=''}){
 const a={...defaults,...look};const e=emotion==='win'?'happy':emotion==='lose'?'cry':emotion==='draw'?'wow':a.eyes;
 const m=emotion==='win'?'grin':emotion==='lose'?'sad':emotion==='draw'?'wow':a.mouth;
 return <svg viewBox="0 0 48 64" className={`avatar ${className}`} shapeRendering="crispEdges" aria-hidden="true" data-emotion={emotion||'custom'} data-pose={pose}>
 <ellipse cx="24" cy="61" rx="14" ry="2" fill="currentColor" opacity=".12"/>
 <g className="avatar-person" fill="#171725">
 <g className="avatar-leg left"><path d="M17 46h5v12h-2v3h-7v-3h4z"/></g><g className="avatar-leg right"><path d="M27 46h5v12h4v3h-9z"/></g>
 <g className="avatar-arm left"><path d="M13 35h5v15h-5z"/><path d="M14 44h4v5h-4z" fill="#fff0d8"/></g><g className="avatar-arm right"><path d="M31 35h5v15h-5z"/><path d="M31 44h4v5h-4z" fill="#fff0d8"/></g>
 <path d="M15 32h18v18H15z"/><path d="M18 34h12v13H18z" fill={a.bodyColor}/><path d="M19 35h3v10h-3z" fill="#fff9ea" opacity=".45"/>
 <g className="avatar-head">
 <path d="M13 14h22v3h3v14h-3v3H13v-3h-3V17h3z"/><path d="M14 17h20v2h2v10h-2v3H14v-3h-2V19h2z" fill="#fff0d8"/>
 {a.cheeks==='blush'&&<path d="M13 26h5v3h-5zM30 26h5v3h-5z" fill="#ee8d9b"/>}
 {a.cheeks==='freckles'&&<path d="M13 27h1v1h-1zM16 28h1v1h-1zM31 27h1v1h-1zM34 28h1v1h-1z" fill="#b7754b"/>}
 {e==='happy'?<path d="M15 22h2v-2h3v2h2v2h-2v-2h-3v2h-2zM27 22h2v-2h3v2h2v2h-2v-2h-3v2h-2z"/>:
 e==='cry'?<><path d="M15 21h7v2h-7zM27 21h7v2h-7z"/><g className="avatar-tears" fill="#57bdf0"><path d="M16 23h3v8h-3zM30 23h3v8h-3z"/><path d="M16 33h2v2h-2zM31 34h2v2h-2z"/></g></>:
 e==='wow'?<><path d="M15 20h7v6h-7zM27 20h7v6h-7z"/><path d="M17 21h3v3h-3zM29 21h3v3h-3z" fill="#fff"/></>:
 e==='star'?<path d="M17 19h2v3h3v2h-3v3h-2v-3h-3v-2h3zM29 19h2v3h3v2h-3v3h-2v-3h-3v-2h3z" fill="#ba8a15"/>:
 e==='sleepy'?<path d="M15 23h7v2h-7zM27 23h7v2h-7z"/>:
 e==='wink'?<path d="M16 21h4v5h-4zM27 23h7v2h-7z"/>:
 e==='angry'?<path d="M15 19h3v2h4v2h-3v3h-3v-4h-1zM31 19h3v3h-1v4h-3v-3h-3v-2h4z"/>:
 <><path d="M16 21h5v5h-5zM28 21h5v5h-5z"/>{e==='sparkle'&&<path d="M17 21h2v2h-2zM29 21h2v2h-2z" fill="#fff"/>}</>}
 {m==='grin'?<><path d="M19 27h11v4H19z"/><path d="M21 29h7v2h-7z" fill="#ee8d9b"/></>:
 m==='wow'?<path d="M22 27h5v5h-5z"/>:
 m==='sad'?<path d="M20 30h2v-2h6v2h2v2h-2v-2h-6v2h-2z"/>:
 m==='neutral'?<path d="M20 29h9v1h-9z"/>:
 m==='tongue'?<><path d="M20 28h10v2H20z"/><path d="M25 29h4v4h-4z" fill="#df7993"/></>:
 m==='smirk'?<path d="M20 29h7v-2h2v4h-9z"/>:
 m==='teeth'?<><path d="M19 27h12v5H19z"/><path d="M21 28h8v2h-8z" fill="#fff"/></>:
 <path d="M20 27h2v2h6v-2h2v3h-2v1h-6v-1h-2z"/>}
 {a.hat==='antenna'?<><path d="M22 4h4v9h-4zM20 2h8v5h-8zM12 12h24v5H12z"/><path d="M21 3h6v3h-6zM14 13h20v2H14z" fill={a.hatColor}/></>:
 a.hat==='fez'?<><path d="M16 2h16l3 14H13zM12 4h4v3h-3v8h-3V5h2z"/><path d="M18 4h12l2 10H16z" fill={a.hatColor}/></>:
 a.hat==='cap'?<><path d="M14 6h19v9h6v4h-9v-3H12v-6h2z"/><path d="M16 8h15v6H14v-4h2zM32 16h5v1h-5z" fill={a.hatColor}/></>:
 a.hat==='crown'?<><path d="M12 6h5v5h4V4h6v7h4V6h5v11H12z"/><path d="M14 8h1v5h8V6h2v7h8V8h1v7H14z" fill={a.hatColor}/></>:
 a.hat==='wizard'?<><path d="M21 1h7l7 13h4v4H9v-4h5z"/><path d="M23 3h3l6 12H16zM12 15h24v1H12z" fill={a.hatColor}/><path d="M24 8h2v3h-2z" fill="#fff0d8"/></>:
 a.hat==='cat'?<><path d="M11 3h6l6 9h3l6-9h5v14H11z"/><path d="M13 6h2l6 9h-8zM34 6h1v9h-7z" fill={a.hatColor}/></>:
 a.hat==='headphones'?<><path d="M12 10h3V7h18v3h3v7h4v12h-6V15h-2v-5H16v5h-2v14H8V17h4z"/><path d="M9 19h4v8H9zM35 19h4v8h-4z" fill={a.hatColor}/></>:null}
 {a.accessory==='glasses'&&<><path d="M13 20h11v7H13zM25 20h11v7H25zM23 22h3v2h-3z"/><path d="M15 22h7v3h-7zM27 22h7v3h-7z" fill="#b8d7ef" opacity=".7"/></>}
 {a.accessory==='shades'&&<path d="M12 20h25v3h-2v4h-9v-4h-2v4h-9v-4h-3z"/>}
 {a.accessory==='mustache'&&<path d="M20 26h4v1h2v-1h4v2h2v2h-7v-1h-1v1h-7v-2h3z"/>}
 {a.accessory==='bandage'&&<><path d="M30 15h7v4h-7z" fill="#b7754b"/><path d="M32 16h3v2h-3z" fill="#fff0d8"/></>}
 {a.accessory==='monocle'&&<><path d="M26 19h9v9h-9zM33 28h2v6h-2z" fill="#c69734"/><path d="M28 21h5v5h-5z" fill="#b8d7ef" opacity=".7"/></>}
 {a.accessory==='flower'&&<><path d="M33 10h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="#e481a9"/><path d="M33 14h4v4h-4z" fill="#ffe29a"/></>}
 </g>
 {a.accessory==='bow'&&<><path d="M18 33h4v2h4v-2h4v6h-4v-2h-4v2h-4z" fill="#bf465c"/><path d="M23 35h2v2h-2z" fill="#fff0d8"/></>}
 </g></svg>;
}
