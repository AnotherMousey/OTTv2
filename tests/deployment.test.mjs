import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
process.env.SERVE_FRONTEND = 'false';
process.env.ALLOWED_ORIGINS = 'https://ott-test.vercel.app';
const { server, rooms } = createRequire(import.meta.url)('../logic/server.js');

test('API-only deployment serves health, CORS preflight, rooms and replay without frontend files', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const origin = 'https://ott-test.vercel.app';
  try {
    assert.equal((await (await fetch(base)).json()).service, 'ottv2-api');
    assert.equal((await (await fetch(base + '/health')).json()).ok, true);
    assert.equal((await fetch(base + '/missing')).status, 404);
    const preflight = await fetch(base + '/api/rooms', {method:'OPTIONS', headers:{Origin:origin, 'Access-Control-Request-Method':'POST', 'Access-Control-Request-Headers':'content-type'}});
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.match(preflight.headers.get('access-control-allow-headers'), /Content-Type/);
    const denied = await fetch(base + '/api/rooms', {method:'POST', headers:{Origin:'https://other.vercel.app', 'Content-Type':'application/json'}, body:JSON.stringify({clientId:'denied'})});
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    assert.equal(rooms.size, 0);
    const response = await fetch(base + '/api/rooms', {method:'POST', headers:{Origin:origin, 'Content-Type':'application/json'}, body:JSON.stringify({clientId:'deployment-test'})});
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    const {roomId} = await response.json();
    const replay = await fetch(base + `/api/rooms/${roomId}/replay`, {headers:{Origin:origin}});
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).frames.length, 1);
    const error = await fetch(base + '/api/rooms/OTT-MISSING/replay', {headers:{Origin:origin}});
    assert.equal(error.status, 400);
    assert.equal(error.headers.get('access-control-allow-origin'), origin);
  } finally {
    rooms.clear(); server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
