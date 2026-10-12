import {submissionClientId} from '../submissionHistory.js';
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Backend returned a non-JSON response (${response.status}). ` +
      'Check VITE_API_BASE_URL and make sure the backend is deployed.',
    );
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
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
  const response = await fetch(`${API_BASE_URL}/api/matches/${encodeURIComponent(matchId)}/replay`, { signal });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Backend returned a non-JSON replay response (${response.status}). ` +
      'Check VITE_API_BASE_URL.',
    );
  }
  const data = await response.json();
  if (response.status === 202) return null;
  if (!response.ok) throw new Error(data.error || `Replay request failed (${response.status}).`);
  return data;
}

export function getGameSpecification(signal) { return request("/api/games/current", {signal}); }

export function getSubmissionHistory(signal){return request(`/api/submission-history?clientId=${encodeURIComponent(submissionClientId())}`,{signal});}

export async function waitForBackend(){
 const deadline=Date.now()+120000;
 while(Date.now()<deadline){
  let response;
  try{response=await fetch(`${API_BASE_URL}/health`,{cache:'no-store',signal:AbortSignal.timeout(10000)});}catch{}
  if(response?.status===403)throw Error('Backend refused this frontend origin. Check ALLOWED_ORIGINS.');
  try{if(response?.ok&&(await response.json()).ok)return;}catch{}
  await new Promise(r=>setTimeout(r,2000));
 }
 throw Error('Backend is unavailable. Please try again shortly.');
}
