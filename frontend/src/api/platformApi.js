const BASE=(import.meta.env.VITE_API_BASE_URL||'').trim().replace(/\/$/,'');
const KEY='ott-production-session';
export function session(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null');}catch{return null;}}
export function storeSession(value){if(value)sessionStorage.setItem(KEY,JSON.stringify(value));else sessionStorage.removeItem(KEY);}
export async function request(path,{method='GET',body,signal,headers={}}={}){const token=session()?.token;const response=await fetch(BASE+path,{method,signal,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});if(response.status===304)return null;const data=await response.json().catch(()=>({error:'Backend response was not JSON. Check VITE_API_BASE_URL.'}));if(!response.ok){if(response.status===401&&path!=='/api/auth/login'){storeSession(null);window.dispatchEvent(new Event('ott-session-expired'));}throw Object.assign(Error(data.error||'Request failed.'),{status:response.status});}return data;}
export const post=(path,body={})=>request(path,{method:'POST',body});
export async function authenticate(username,password){const value=await post('/api/auth/login',{username,password});storeSession(value);return value.account;}
export async function signOut(){try{await post('/api/auth/logout');}finally{storeSession(null);}}
