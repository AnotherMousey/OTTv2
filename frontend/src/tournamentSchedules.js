// Optional display schedules, keyed by the real tournament ID and its phase.
// Use ISO 8601 dates with an explicit timezone, for example 2026-12-01T18:00:00+07:00.
// Example shape (replace the ID and dates with your actual schedule):
// 'actual-tournament-id': {
//   registration: '2026-12-01T18:00:00+07:00',
//   preparation: '2026-12-02T18:00:00+07:00',
//   live: '2026-12-03T18:00:00+07:00',
// }
// An empty entry shows "Not scheduled". Expiry never advances a phase or locks bots;
// the existing backend and organizing judge remain authoritative.
export const tournamentSchedules = Object.freeze({});

export function tournamentDeadline(tournament, schedules = tournamentSchedules) {
  const value = tournament.format==='daily-round-robin' ? tournament.nextLockAt : schedules[tournament.id]?.[tournament.phase];
  const deadline = typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? Date.parse(value) : NaN;
  if (!Number.isFinite(deadline)) return null;
  return new Date(deadline).toISOString();
}

export function remaining(deadline, now) {
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  return [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60, seconds % 60];
}
