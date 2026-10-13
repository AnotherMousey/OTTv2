const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const SESSION_KEY = 'ott-auth-session';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

export async function login(username, password) {
  const session = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({username, password}),
  });
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function readAuthSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

export function clearAuthSession() { sessionStorage.removeItem(SESSION_KEY); }

export function authHeaders() {
  const session = readAuthSession();
  return session?.token ? {Authorization: `Bearer ${session.token}`} : {};
}
