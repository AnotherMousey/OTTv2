async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

export function submitBot(playerId, language, source) {
  return request('/api/submissions', {
    method: 'POST',
    body: JSON.stringify({ playerId, language, source }),
  });
}

export function createBotMatch(whiteSubmissionId, blackSubmissionId) {
  return request('/api/matches', {
    method: 'POST',
    body: JSON.stringify({ whiteSubmissionId, blackSubmissionId }),
  });
}

export function getBotMatch(matchId, signal) {
  return request(`/api/matches/${encodeURIComponent(matchId)}`, { signal });
}

export async function getBotReplay(matchId, signal) {
  const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}/replay`, { signal });
  const data = await response.json();
  if (response.status === 202) return null;
  if (!response.ok) throw new Error(data.error || `Replay request failed (${response.status}).`);
  return data;
}
