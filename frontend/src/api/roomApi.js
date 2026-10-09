export async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(path, {
    method, signal,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
const roomPath = (roomId) => `/api/rooms/${encodeURIComponent(roomId)}`;
export const createRoom = (clientId, signal) => request('/api/rooms', { method: 'POST', body: { clientId }, signal });
export const joinRoom = (roomId, clientId, signal) => request(`${roomPath(roomId)}/join`, { method: 'POST', body: { clientId }, signal });
export const getRoomState = (roomId, clientId = '', signal) => request(`${roomPath(roomId)}/state?clientId=${encodeURIComponent(clientId)}`, { signal });
export const getRoomRecording = (roomId, signal) => request(`${roomPath(roomId)}/replay`, { signal });
export const moveInRoom = (roomId, clientId, from, to, signal) => request(`${roomPath(roomId)}/move`, { method: 'POST', body: { clientId, from, to }, signal });
export const resetRoom = (roomId, clientId, signal) => request(`${roomPath(roomId)}/new`, { method: 'POST', body: { clientId }, signal });
export const forfeitRoom = (roomId, clientId, signal) => request(`${roomPath(roomId)}/forfeit`, { method: 'POST', body: { clientId }, signal });
