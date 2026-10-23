const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { database, loadWithDatabase } = require('./helpers.cjs');
const db = database();
const { createApp } = loadWithDatabase('../api/index.cjs', db);
const { digest } = require('../shared/domain.cjs');
const { entrant } = require('../api/tournament-presenters.cjs');
const { executionFrame, submissionFeedback, diagnosticDetails } = require('../api/bot-diagnostics.cjs');
const diagnostics = id => `/tmp/ott-private/player.cpp:7: error: SECRET_${id}_SOURCE\n  private_strategy_${id}();`;
const users = Object.fromEntries(['alice', 'bob', 'judge', 'otherJudge'].map(id => [id,
  { id, name: id, role: id.includes('udge') ? 'judge' : 'player', active: true }]));
const entries = ['alice', 'bob'].map(id => ({ userId: id, tournamentId: 't', status: 'accepted',
  user: users[id], activeSubmissionId: 's-' + id,
  activeSubmission: { id: 's-' + id, filename: 'bot.cpp', language: 'cpp', version: 1,
    status: 'invalid', error: diagnostics(id), createdAt: new Date() } }));
const frame = { event: 'white-forfeit: ' + diagnostics('alice'), state: { status: 'finished' }, moveNumber: 1 };
const match = { id: 'm', tournamentId: 't', batchId: 'b', round: 1, status: 'finished',
  whiteId: 'alice', blackId: 'bob', error: diagnostics('alice') + diagnostics('bob'),
  snapshot: frame, runId: 'run', result: { score: 0, winner: 'black' }, score: 0,
  tournament: { id: 't', name: 'Test', ownerId: 'judge' } };

async function setup(t, format = 'daily-round-robin', published = true) {
  const event = { id: 't', ownerId: 'judge', name: 'Test', phase: 'live', format,
    startDate: '2026-10-22', endDate: '2026-10-29', totalRounds: 7, round: 1,
    publishedBatchId: published ? 'b' : null };
  t.mock.method(db.session, 'findUnique', async ({ where }) => {
    const user = Object.values(users).find(u => digest(u.id) === where.tokenHash);
    return user ? { user, userId: user.id, expiresAt: new Date(Date.now() + 60000) } : null;
  });
  t.mock.method(db.tournament, 'findUnique', async () => event);
  t.mock.method(db.entry, 'findMany', async () => entries);
  t.mock.method(db.entry, 'findUnique', async ({ where }) => entries.find(e => e.userId === where.tournamentId_userId.userId) || null);
  t.mock.method(db.entry, 'count', async () => 2);
  t.mock.method(db.match, 'findMany', async ({ select } = {}) => [select
    ? Object.fromEntries(Object.keys(select).map(key => [key, match[key]])) : match]);
  t.mock.method(db.match, 'findUnique', async () => ({ ...match, ...(format === 'legacy' ? { batchId: null } : {}) }));
  t.mock.method(db.match, 'findFirst', async () => match);
  t.mock.method(db.match, 'count', async () => 1);
  t.mock.method(db.match, 'groupBy', async () => []);
  t.mock.method(db.user, 'findMany', async () => Object.values(users));
  t.mock.method(db.user, 'findUnique', async ({ where }) => users[where.id]);
  t.mock.method(db.syncReceipt, 'findUnique', async () => null);
  const batch = { id: 'b', date: '2026-10-22', publishAfter: new Date(0),
    publishedAt: published ? new Date() : null };
  t.mock.method(db.dailyBatch, 'findUnique', async () => batch);
  t.mock.method(db.dailyBatch, 'findFirst', async () => batch);
  t.mock.method(db.dailyBatch, 'findMany', async () => [batch]);
  t.mock.method(db.dailyStanding, 'findMany', async () => entries.map(e => ({ userId: e.userId, rating: 1000 })));
  t.mock.method(db.frame, 'findMany', async () => [{ payload: frame, seq: 1 }]);
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); });
  return async (path, as) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`,
      { headers: as ? { Authorization: 'Bearer ' + as } : {} });
    return { status: response.status, body: await response.json() };
  };
}

for (const format of ['daily-round-robin', 'legacy']) {
  test(`${format}: state and rankings expose diagnostics only to the submitter or organizing Judge`, async t => {
    const request = await setup(t, format);
    for (const viewer of [undefined, 'alice', 'bob', 'judge', 'otherJudge']) {
      for (const suffix of ['', '/rankings']) {
        const res = await request('/api/tournaments/t' + suffix, viewer);
        assert.equal(res.status, 200);
        const rows = res.body.players || res.body.rankings;
        for (const row of rows) {
          const allowed = viewer === row.id || viewer === 'judge';
          assert.equal(row.validationError, allowed ? 'This bot could not be compiled. Check the code and try again.' : 'Bot validation failed.');
          assert.equal(row.validationDetails, allowed ? 'player.cpp, line 7: compilation error.' : null);
          assert.ok(!JSON.stringify(res.body).includes('/tmp/ott-private'));
          assert.ok(!JSON.stringify(res.body).includes('SECRET_'));
          if (!allowed) assert.ok(!JSON.stringify(res.body).includes(diagnostics(row.id)));
        }
        if (res.body.myEntry) assert.match(res.body.myEntry.validationError, /could not be compiled/);
      }
    }
    // Redaction must not erase stored diagnostics or mutate shared DB objects.
    assert.equal(entries[0].activeSubmission.error, diagnostics('alice'));
  });
}

test('submitter history keeps safe diagnostic locations, while source inspection remains owner-Judge only', async t => {
  const request = await setup(t);
  t.mock.method(db.submission, 'findMany', async ({ where }) => {
    assert.ok(['alice', 'bob'].includes(where.userId));
    return [{ ...entries.find(e => e.userId === where.userId).activeSubmission }];
  });
  t.mock.method(db.submission, 'findUnique', async () => ({ id: 's-alice', userId: 'alice',
    tournamentId: 't', status: 'invalid', source: 'SECRET_alice_SOURCE', error: diagnostics('alice') }));
  for (const viewer of ['alice', 'bob']) {
    const res = await request('/api/tournaments/t/bots?userId=bob', viewer);
    assert.equal(res.status, 200);
    assert.match(res.body.submissions[0].error, /could not be compiled/);
    assert.equal(res.body.submissions[0].diagnostics, 'player.cpp, line 7: compilation error.');
    assert.ok(!JSON.stringify(res.body).includes('SECRET_'));
  }
  assert.equal((await request('/api/tournaments/t/bots')).status, 401);
  for (const viewer of ['alice', 'bob', 'otherJudge'])
    assert.equal((await request('/api/tournaments/t/source/s-alice', viewer)).status, 403);
  const source = await request('/api/tournaments/t/source/s-alice', 'judge');
  assert.equal(source.status, 200);
  assert.match(source.body.error, /could not be compiled/);
  assert.equal(source.body.source, 'SECRET_alice_SOURCE');
  assert.equal(source.body.diagnostics, 'player.cpp, line 7: compilation error.');
  const versions = await request('/api/tournaments/t/source?userId=alice', 'judge');
  assert.equal(versions.status, 200);
  assert.equal(versions.body.submissions[0].diagnostics, 'player.cpp, line 7: compilation error.');
});

test('match list, direct reads, live snapshots and replays hide both bots’ diagnostic text', async t => {
  const request = await setup(t);
  for (const viewer of [undefined, 'alice', 'bob', 'otherJudge', 'judge']) {
    for (const path of ['/api/matches?status=all', '/api/matches/m', '/api/matches/m/live', '/api/matches/m/replay', '/api/tournaments/t/rounds']) {
      const res = await request(path, viewer);
      assert.equal(res.status, 200);
      const text = JSON.stringify(res.body);
      if (viewer !== 'judge') {
        assert.ok(!text.includes('SECRET_'), path);
        assert.ok(!text.includes('/tmp/ott-private'), path);
        assert.ok(!text.includes('private_strategy'), path);
      } else if (!path.endsWith('/rounds')) {
        assert.ok(text.includes('player.cpp, line 7'), path);
        assert.ok(!text.includes('SECRET_'), path);
        assert.ok(!text.includes('/tmp/ott-private'), path);
      }
    }
  }
});

test('unpublished match read guards remain in force', async t => {
  const request = await setup(t, 'daily-round-robin', false);
  for (const viewer of [undefined, 'alice', 'otherJudge'])
    for (const suffix of ['', '/live', '/replay'])
      assert.equal((await request('/api/matches/m' + suffix, viewer)).status, 404);
  assert.equal((await request('/api/matches/m', 'judge')).status, 200);
});

test('private practice diagnostics remain available only to the practice owner', async t => {
  const request = await setup(t);
  t.mock.method(db.match, 'findUnique', async () => ({ ...match, tournamentId: null, batchId: null, ownerId: 'alice' }));
  for (const suffix of ['', '/live', '/replay']) {
    const own = await request('/api/matches/m' + suffix, 'alice');
    assert.equal(own.status, 200);assert.ok(JSON.stringify(own.body).includes('player.cpp, line 7'));
    assert.ok(!JSON.stringify(own.body).includes('SECRET_'));
    assert.equal((await request('/api/matches/m' + suffix, 'bob')).status, 403);
    assert.equal((await request('/api/matches/m' + suffix)).status, 403);
  }
});

test('practice history sanitizes stored failures before serialization', async t => {
  const request = await setup(t);
  t.mock.method(db.match, 'findMany', async ({ where }) => {
    assert.equal(where.ownerId, 'alice');
    return [{ ...match, tournamentId: null, config: {} }];
  });
  const res = await request('/api/practice/history', 'alice');
  assert.equal(res.status, 200);
  assert.ok(!JSON.stringify(res.body).includes('/tmp/ott-private'));
  assert.ok(!JSON.stringify(res.body).includes('SECRET_'));
  assert.match(res.body.records[0].error, /player.cpp, line 7/);
});

test('redaction preserves successful states, normal move logs and stored errors', () => {
  const ready = { ...entries[0], activeSubmission: { ...entries[0].activeSubmission, status: 'ready', error: null } };
  assert.equal(entrant(ready).validationError, null);
  const normal = { ...frame, event: 'white-move' };
  assert.equal(executionFrame(normal), normal);
  const before = structuredClone(frame);
  assert.equal(executionFrame(frame).event, 'white-forfeit: Bot execution failed.');
  assert.deepEqual(frame, before);
  assert.equal(executionFrame({ ...frame, event: 'black-timeout: ' + diagnostics('bob') }).event, 'black-timeout: turn skipped.');
});

test('historical Python tracebacks retain useful categories and bot line numbers, never paths or source', () => {
  const raw = 'Player process stopped. Traceback (most recent call last):\n' +
    '  File "/app/logic/grader/python_runner.py", line 90, in main\n' +
    '    SECRET_RUNNER_SOURCE\n  File "/tmp/bots/player.py", line 12, in make_move\n' +
    '    private_strategy()\nNameError: SECRET_USER_EXPRESSION\nTOKEN=secret-value';
  const bot = { status: 'invalid', error: raw };
  const own = submissionFeedback(bot, true);
  assert.equal(own.errorCode, 'BOT_RUNTIME_FAILED');
  assert.equal(own.diagnostics, 'player.py, line 12.\nNameError: check the submitted code.');
  assert.equal(submissionFeedback(bot).diagnostics, null);
  assert.equal(bot.error, raw);
  assert.equal(diagnosticDetails('C:\\temp\\RobotPlayer.java:21: error: SECRET_SOURCE'), 'RobotPlayer.java, line 21: compilation error.');
});

test('infrastructure failures are not presented as invalid student code', () => {
  for (const status of ['error', 'queued']) {
    const feedback = submissionFeedback({ status, error: 'Prisma error /app/worker.js TOKEN=secret' }, true);
    assert.equal(feedback.errorCode, 'BOT_VALIDATION_UNAVAILABLE');
    assert.match(feedback.error, /server problem/);
    assert.equal(feedback.diagnostics, null);
  }
  assert.equal(submissionFeedback({ status: 'invalid', error: 'Could not start python: spawn python ENOENT' }, true).errorCode, 'BOT_VALIDATION_UNAVAILABLE');
});

test('time limits, invalid moves and unknown validation failures have actionable summaries', () => {
  for (const [error, code] of [['Bot exceeded 1000 ms thinking limit.', 'BOT_TIME_LIMIT'],
    ['Player returned an invalid move.', 'BOT_INVALID_MOVE'], ['Unrecognized failure /app/private.js', 'BOT_INVALID']]) {
    const feedback = submissionFeedback({ status: 'invalid', error }, true);
    assert.equal(feedback.errorCode, code);
    assert.ok(!feedback.error.includes('/app/'));
  }
});

test('long, adversarial diagnostics are bounded and arbitrary text is never returned', () => {
  assert.equal(diagnosticDetails('PRIVATE '.repeat(20000)), null);
  assert.equal(diagnosticDetails('/app/server.js:1: error: SECRET_SERVER_SOURCE'), null);
  const text = Array.from({ length: 1000 }, (_, i) => `/tmp/player.cpp:${i}: error: PASSWORD=SECRET`).join('\n');
  const detail = diagnosticDetails(text);
  assert.equal(detail.split('\n').length, 12);
  assert.ok(!detail.includes('SECRET'));
});
