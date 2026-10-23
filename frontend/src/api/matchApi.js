import {connectionError,responseError,unreadableResponse} from './errorMessages.js';
import {request as platformRequest,post as platformPost,session} from './platformApi.js';
import {submissionClientId} from '../submissionHistory.js';
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

async function request(path, options = {}) {
  let response;
  try { response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(session()?.token?{Authorization:'Bearer '+session().token}:{}), ...(options.headers || {}) },
  }); } catch (error) { throw connectionError(error,options.signal); }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      unreadableResponse,
    );
  }
  const data = await response.json().catch(() => { throw Error(unreadableResponse); });
  if (!response.ok) throw responseError(data,response);
  if (!data || typeof data !== 'object') throw Error(unreadableResponse);
  return data;
}

export function submitBot(playerId, language, source) {
  return request('/api/submissions', {
    method: 'POST',
    body: JSON.stringify({ playerId, language, source, clientId:submissionClientId() }),
  });
}

export function createBotMatch(whiteSubmissionId, blackSubmissionId, options = {}) {
  return request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({ whiteSubmissionId, blackSubmissionId, ...options, clientId:submissionClientId() }),
  });
}

export function getBotMatch(matchId, signal) {
  return request(`/api/matches/${encodeURIComponent(matchId)}`, { signal });
}

export async function getBotReplay(matchId, signal) {
  let response;
  try { response = await fetch(`${API_BASE_URL}/api/matches/${encodeURIComponent(matchId)}/replay`, { signal,headers:(session()?.token?{Authorization:'Bearer '+session().token}:{}) }); }
  catch (error) { throw connectionError(error,signal); }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      unreadableResponse,
    );
  }
  const data = await response.json().catch(() => { throw Error(unreadableResponse); });
  if (response.status === 202) return null;
  if (!response.ok) throw responseError(data,response);
  if (!data || typeof data !== 'object') throw Error(unreadableResponse);
  return data;
}

export function getGameSpecification(signal) { return request("/api/games/current", {signal}); }

export function getSubmissionHistory(signal){return platformRequest('/api/practice/history',{signal});}
export function startPractice(body){return platformPost('/api/practice',body);}

export async function waitForBackend(){
 const deadline=Date.now()+120000;
 while(Date.now()<deadline){
  let response;
  try{response=await fetch(`${API_BASE_URL}/health`,{cache:'no-store',signal:AbortSignal.timeout(10000)});}catch{}
  if(response?.status===403)throw Error('Unable to connect to this service. Please contact your organizer.');
  try{if(response?.ok&&(await response.json()).ok)return;}catch{}
  await new Promise(r=>setTimeout(r,2000));
 }
 throw Error('Backend is unavailable. Please try again shortly.');
}
