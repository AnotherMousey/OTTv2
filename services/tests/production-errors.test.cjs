const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { database, loadWithDatabase } = require('./helpers.cjs');
const db = database();
const { createApp } = loadWithDatabase('../api/index.cjs', db);

async function client(t) {
  const logs = [];
  t.mock.method(console, 'error', value => logs.push(JSON.parse(value)));
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return { logs, request: async (path, options) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
    return { status: response.status, body: await response.json() };
  } };
}

test('unexpected database and status-bearing exceptions never expose raw details, and references correlate logs', async t => {
  const { request, logs } = await client(t);
  t.mock.method(db.tournament, 'count', async () => 0);
  const secret = 'SQL SELECT password FROM User /app/private.js Bearer SECRET';
  for (const [code, status] of [['P2022', 503], ['P1001', 500], ['CUSTOM', 400]]) {
    t.mock.method(db.tournament, 'findMany', async () => { throw Object.assign(Error(secret), { code, ...(status === 400 ? { status } : {}) }); });
    const res = await request('/api/tournaments');
    assert.equal(res.status, status);
    assert.match(res.body.referenceId, /^[a-f0-9-]{36}$/);
    assert.ok(!JSON.stringify(res).includes('SECRET'));
    assert.ok(!JSON.stringify(res).includes('/app/'));
    assert.equal(logs.at(-1).referenceId, res.body.referenceId);
  }
  assert.ok(!JSON.stringify(logs).includes(secret));
});

test('invalid JSON does not echo the request body or parser diagnostics', async t => {
  const { request, logs } = await client(t);
  const res = await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"password":"SECRET"' });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'INVALID_JSON');
  assert.ok(!JSON.stringify(res).includes('SECRET'));
  assert.equal(logs.length, 0);
});

test('readiness failure provides user-safe feedback instead of migration instructions', async t => {
  const { request } = await client(t);
  t.mock.method(db, '$queryRaw', async () => { throw Object.assign(Error('private table /app/worker.js'), { code: 'P2022' }); });
  const res = await request('/ready');
  assert.equal(res.status, 503);
  assert.equal(res.body.error, 'The service is temporarily unavailable. Please try again later.');
  assert.ok(!JSON.stringify(res).includes('deployment:check'));
});

test('login keeps the same invalid-credential message for unknown and disabled accounts', async t => {
  const { request } = await client(t);
  t.mock.method(db.rateBucket, 'upsert', async () => ({ count: 1 }));
  for (const account of [null, { active: false, passwordHash: 'invalid' }]) {
    t.mock.method(db.user, 'findUnique', async () => account);
    const res = await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'testplayer', password: 'invalid' }) });
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'Invalid username or password.' });
  }
});
