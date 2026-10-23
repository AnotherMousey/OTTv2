import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responseError, connectionError } from './api/errorMessages.js';
import { request, storeSession, session } from './api/platformApi.js';
import { accountRequest } from './api/authApi.js';
import { request as roomRequest } from './api/roomApi.js';
import { getBotMatch, getBotReplay } from './api/matchApi.js';
import { matchFailure } from './submissionHistory.js';

function setup(t, fetch) {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key),
  };
  for (const [key, value] of Object.entries({ sessionStorage: storage, window: new EventTarget() })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => { if (original) Object.defineProperty(globalThis, key, original); else delete globalThis[key]; });
  }
  t.mock.method(globalThis, 'fetch', fetch);
}
const clients = [() => request('/api/tournaments'), () => accountRequest('/api/auth/me'),
  () => roomRequest('/api/rooms/test'), () => getBotMatch('test'), () => getBotReplay('test')];

test('API clients replace non-JSON, malformed JSON and network failures with actionable messages', async t => {
  setup(t, async () => new Response('<html>PRIVATE_SERVER_STACK</html>', { status: 502 }));
  for (const client of clients) await assert.rejects(client, error => !/VITE_|PRIVATE_|JSON|deployment/.test(error.message));
  t.mock.method(globalThis, 'fetch', async () => new Response('{invalid', { headers: { 'Content-Type': 'application/json' } }));
  for (const client of clients) await assert.rejects(client, /unexpected response/);
  t.mock.method(globalThis, 'fetch', async () => Response.json(null));
  for (const client of clients) await assert.rejects(client, /unexpected response/);
  t.mock.method(globalThis, 'fetch', async () => { throw TypeError('Failed to fetch /app/private.js'); });
  for (const client of clients) await assert.rejects(client, /Unable to connect to the server/);
});

test('API clients do not display raw error objects, traces, paths or database diagnostics', async t => {
  setup(t, async () => {});
  for (const raw of [{ stack: 'SECRET' }, 'Traceback /app/grader.py SECRET', 'Prisma SQLSTATE SECRET', 'TOKEN=SECRET']) {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ error: raw }, { status: 400 }));
    for (const client of clients) await assert.rejects(client, error => error.message === 'Something went wrong. Please try again.');
  }
});

test('safe field validation, HTTP status, rate-limit codes and Retry-After are preserved', () => {
  const response = new Response('', { status: 429, headers: { 'Retry-After': '30' } });
  const error = responseError({ error: 'Too many requests. Wait and try again.', code: 'LOGIN_THROTTLED' }, response);
  assert.equal(error.message, 'Too many requests. Wait and try again.');
  assert.equal(error.status, 429); assert.equal(error.code, 'LOGIN_THROTTLED'); assert.equal(error.retryAfter, '30');
  assert.equal(responseError({ error: 'Filename and language do not match.' }, { status: 400 }).message, 'Filename and language do not match.');
});

test('unexpected server references remain usable without raw details', () => {
  const referenceId = '12345678-1234-1234-1234-123456789abc';
  const error = responseError({ error: 'PRIVATE_SERVER_STACK', referenceId, code: 'REQUEST_FAILED' }, { status: 500 });
  assert.equal(error.referenceId, referenceId); assert.match(error.message, /Reference:/); assert.ok(!error.message.includes('PRIVATE_'));
});

test('intentional cancellation is preserved rather than displayed as a network error', () => {
  const error = new DOMException('Aborted', 'AbortError');
  assert.equal(connectionError(error), error);
});

test('request deadlines show a retry message without exposing timeout exceptions', async t => {
  setup(t, async () => { throw new DOMException('PRIVATE_TIMEOUT_DETAIL', 'TimeoutError'); });
  t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort());
  await assert.rejects(() => request('/api/tournaments'), /The request took too long. Please try again./);
});

test('session expiry still clears only the matching session and does not fire on invalid login', async t => {
  setup(t, async () => Response.json({ error: 'Your session expired. Log in again.' }, { status: 401 }));
  let expired = 0; window.addEventListener('ott-session-expired', () => expired++);
  storeSession({ token: 'current', account: { id: 'a' } });
  await assert.rejects(() => request('/api/tournaments')); assert.equal(session(), null); assert.equal(expired, 1);
  storeSession({ token: 'current', account: { id: 'a' } });
  await assert.rejects(() => request('/api/auth/login', { method: 'POST', body: {} }));
  assert.equal(session().token, 'current'); assert.equal(expired, 1);
  t.mock.method(globalThis, 'fetch', async () => {
    storeSession({ token: 'new-session', account: { id: 'b' } });
    return Response.json({ error: 'Your session expired. Log in again.' }, { status: 401 });
  });
  await assert.rejects(() => request('/api/tournaments')); assert.equal(session().token, 'new-session'); assert.equal(expired, 1);
});

test('historical replay failure notices do not display raw runner diagnostics', () => {
  const failure = matchFailure({ result: { reason: 'bot-error' }, frames: [{ event: 'process stopped. /app/private.js SECRET' }] });
  assert.ok(!JSON.stringify(failure).includes('SECRET')); assert.ok(!JSON.stringify(failure).includes('/app/'));
});
