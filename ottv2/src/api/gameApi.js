async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

export function getClientId() {
  const key = 'ottv2-client-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function createRoom(clientId) {
  return request('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ clientId }),
  });
}

export function joinRoom(roomId, clientId) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
    method: 'POST',
    body: JSON.stringify({ clientId }),
  });
}

export function getRoomState(roomId, clientId) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}/state?clientId=${encodeURIComponent(clientId)}`);
}

export function moveInRoom(roomId, clientId, from, to) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}/move`, {
    method: 'POST',
    body: JSON.stringify({ clientId, from, to }),
  });
}

export function resetRoom(roomId, clientId) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}/new`, {
    method: 'POST',
    body: JSON.stringify({ clientId }),
  });
}

export function forfeitRoom(roomId, clientId) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}/forfeit`, {
    method: 'POST',
    body: JSON.stringify({ clientId }),
  });
}
