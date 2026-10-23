import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTournamentDateRange } from './tournamentDateFormat.js';

test('same-day schedule shows one date, ICT start time, and inclusive end-day semantics', () => {
  assert.equal(formatTournamentDateRange({ startDate: '2026-10-23', startTime: '20:30', endDate: '2026-10-23' }),
    '23 Oct 2026 · 20:30 ICT — ends same day (inclusive)');
});
test('multi-day schedule displays a date-only inclusive end without inventing an end time', () => {
  assert.equal(formatTournamentDateRange({ startDate: '2026-10-23', startTime: '00:00', endDate: '2026-10-25' }),
    '23 Oct 2026 · 00:00 ICT — 25 Oct 2026 (inclusive)');
});
test('calendar-day display is independent of host timezone', () => {
  assert.equal(formatTournamentDateRange({ startDate: '2026-01-01', startTime: '08:00', endDate: '2026-01-02' }).split(' · ')[0], '1 Jan 2026');
});
test('invalid or unavailable dates and start times are not guessed', () => {
  assert.equal(formatTournamentDateRange({ startDate: '2026-02-30', startTime: '20:00', endDate: '2026-03-01' }), '');
  assert.equal(formatTournamentDateRange({ startDate: '2026-10-23', startTime: '21:30', endDate: '2026-10-24' }), '');
});
