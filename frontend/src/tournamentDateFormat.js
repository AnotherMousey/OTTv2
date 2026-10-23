const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

function dateLabel(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? dateFormatter.format(date)
    : '';
}

export function formatTournamentDateRange({ startDate, startTime = '00:00', endDate } = {}) {
  const start = dateLabel(startDate), end = dateLabel(endDate);
  if (!start || !end || !/^([01]\d|20):[0-5]\d$/.test(startTime)) return '';
  const startLabel = `${start} · ${startTime} ICT`;
  return startDate === endDate
    ? `${startLabel} — ends same day (inclusive)`
    : `${startLabel} — ${end} (inclusive)`;
}
