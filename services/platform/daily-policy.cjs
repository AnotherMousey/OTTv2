const { fail } = require('../shared/domain.cjs');
const FORMAT = 'daily-round-robin';
const DAY = 86400000;
const isDaily = event => event?.format === FORMAT;
const instant = (date, time = '00:00') => new Date(`${date}T${time}:00+07:00`);
function localDate(now = new Date()) { return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10); }
const nextDate = date => new Date(instant(date).getTime() + DAY + 7 * 3600000).toISOString().slice(0, 10);
function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(instant(value).getTime()) || localDate(instant(value)) !== value)
    fail(400, 'Dates must be valid YYYY-MM-DD dates in Asia/Ho_Chi_Minh.');
  return value;
}
// Start must precede the first 21:00 cutoff so the start date still plays a round.
function timeValue(value = '00:00') {
  if (typeof value !== 'string' || !/^([01]\d|20):[0-5]\d$/.test(value))
    fail(400, 'Start time must be HH:MM between 00:00 and 20:59 Asia/Ho_Chi_Minh.');
  return value;
}
function schedule(start, end, time) {
  start = dateValue(start); end = dateValue(end);
  const days = Math.round((instant(end) - instant(start)) / DAY) + 1;
  if (days < 1 || days > 366) fail(400, 'Tournament duration must be 1–366 days.');
  return { startDate: start, endDate: end, startTime: timeValue(time), totalRounds: days };
}
const startsAt = event => instant(event.startDate, event.startTime || '00:00');
const started = (event, now = new Date()) => isDaily(event) && now >= startsAt(event);
// Daily entries stay possible until the event ends: each 21:00 snapshot takes the
// accepted roster at that moment, so late players start from the next evening.
// The judge decides whether entry is actually open (registrationOpen/entryMode).
function entryWindow(event, now = new Date()) {
  if (!isDaily(event)) return event?.phase === 'registration';
  return event.phase !== 'finished' && localDate(now) <= event.endDate;
}
function botLocked(event, now = new Date()) {
  if (!isDaily(event)) return false;
  const day = localDate(now);
  return day >= event.startDate && day <= event.endDate && now >= instant(day, '21:00') && now < instant(day, '21:30');
}
function assertBotOpen(event, now = new Date()) {
  if (isDaily(event)) {
    if (event.phase === 'finished' || localDate(now) > event.endDate) fail(409, 'Tournament bot submissions have ended.');
    if (botLocked(event, now)) fail(409, 'Tournament bots are locked from 21:00 until 21:30 Asia/Ho_Chi_Minh.');
  } else if (event.phase !== 'preparation') fail(409, 'Bot preparation is closed.');
}
function nextLock(event, now = new Date()) {
  let date = localDate(now);
  if (date < event.startDate) date = event.startDate;
  else if (now >= instant(date, '21:00')) date = nextDate(date);
  return date <= event.endDate ? instant(date, '21:00').toISOString() : null;
}
function display(event, now = new Date()) {
  if (!isDaily(event)) return event;
  return { ...event, phase: event.phase === 'finished' ? 'finished' : started(event, now) ? 'live' : 'registration',
    timezone: 'Asia/Ho_Chi_Minh', registrationClosesAt: startsAt(event).toISOString(),
    serverNow: now.toISOString(), botLocked: botLocked(event, now), entryWindow: entryWindow(event, now),
    botSubmissionsOpen: event.phase !== 'finished' && localDate(now) <= event.endDate && !botLocked(event, now),
    nextLockAt: nextLock(event, now) };
}
// Each ordered pair occurs once. Rows 0/1 are opposite sides of the same pair.
function pairingAt(ids, sequence) {
  const n = ids.length; let pair = Math.floor(sequence / 2), a = 0;
  while (a < n - 1 && pair >= n - a - 1) { pair -= n - a - 1; a++; }
  if (a >= n - 1 || sequence < 0) throw Error('Pair sequence out of range.');
  const b = a + 1 + pair;
  return sequence % 2 ? [ids[b], ids[a]] : [ids[a], ids[b]];
}
function applyRating(white, black, score) {
  const { eloDelta } = require('./tournament.cjs');
  const delta = eloDelta(white.rating, black.rating, score);
  for (const [row, points, change] of [[white, score, delta], [black, 1 - score, -delta]]) {
    row.rating += change; row.lastDelta += change; row.games++; row.points += points;
    row.wins += points === 1 ? 1 : 0; row.draws += points === .5 ? 1 : 0; row.losses += points === 0 ? 1 : 0;
  }
  return delta;
}
module.exports = { FORMAT, isDaily, instant, localDate, nextDate, dateValue, timeValue, schedule, startsAt, started, entryWindow, botLocked, assertBotOpen, nextLock, display, pairingAt, applyRating };
