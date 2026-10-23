import {connectionError,responseError,unreadableResponse} from './errorMessages.js';
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try { response = await fetch(`${API_BASE_URL}${path}`, {
    method, signal,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  }); } catch (error) { throw connectionError(error,signal); }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(unreadableResponse);
  }
  const data = await response.json().catch(() => { throw Error(unreadableResponse); });
  if (!response.ok) throw responseError(data,response);
  if (!data || typeof data !== 'object') throw Error(unreadableResponse);
  return data;
}
const roomPath = (roomId) => `/api/rooms/${encodeURIComponent(roomId)}`;
export const createRoom = (clientId, signal) => request('/api/rooms', { method: 'POST', body: { clientId }, signal });
export const joinRoom = (roomId, clientId, signal) => request(`${roomPath(roomId)}/join`, { method: 'POST', body: { clientId }, signal });
export const getRoomState = (roomId, clientId = '', signal) => request(`${roomPath(roomId)}/state?clientId=${encodeURIComponent(clientId)}`, { signal });
export const getRoomRecording = (roomId, signal, cursor) => request(`${roomPath(roomId)}/replay${cursor ? '?' + new URLSearchParams(cursor) : ''}`, { signal });
export const moveInRoom = (roomId, clientId, from, to, signal) => request(`${roomPath(roomId)}/move`, { method: 'POST', body: { clientId, from, to }, signal });
export const resetRoom = (roomId, clientId, signal) => request(`${roomPath(roomId)}/new`, { method: 'POST', body: { clientId }, signal });
export const forfeitRoom = (roomId, clientId, signal) => request(`${roomPath(roomId)}/forfeit`, { method: 'POST', body: { clientId }, signal });
