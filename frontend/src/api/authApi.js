import {connectionError,responseError,unreadableResponse} from './errorMessages.js';
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const SESSION_KEY = 'ott-auth-session';
export function readAuthSession() {
  try { const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); return value?.token && value?.account ? value : null; }
  catch { return null; }
}
export function clearAuthSession() { try { sessionStorage.removeItem(SESSION_KEY); } catch {} }
export function authHeaders() { const session = readAuthSession(); return session?.token ? {Authorization: `Bearer ${session.token}`} : {}; }
export async function accountRequest(path, options = {}) {
  let response;
  try { response = await fetch(`${API_BASE_URL}${path}`, {...options, headers: {'Content-Type': 'application/json', ...authHeaders(), ...options.headers}}); }
  catch (error) { throw connectionError(error, options.signal); }
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw Error(unreadableResponse);
  const data = await response.json().catch(() => { throw Error(unreadableResponse); });
  if (!response.ok) {
    const error = responseError(data,response);
    if (response.status === 401 && path !== '/api/auth/login') { clearAuthSession(); window.dispatchEvent(new Event('ott-auth-expired')); }
    throw error;
  }
  if (!data || typeof data !== 'object') throw Error(unreadableResponse);
  return data;
}
export async function login(username, password) {
  const session = await accountRequest('/api/auth/login', {method: 'POST', body: JSON.stringify({username, password})});
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
  catch { throw Error('Session storage is unavailable. Enable browser storage to log in.'); }
  return session;
}
export async function logout() {
  try { await accountRequest('/api/auth/logout', {method:'POST'}); }
  finally { clearAuthSession(); }
}
