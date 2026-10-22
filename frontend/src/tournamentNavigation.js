// Return targets stay in the current URL, not persistent login/session storage.
// Only the tournament page is allowed: never navigate to an arbitrary return URL.
const RETURN_LIFETIME = 15 * 60 * 1000;
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 64 && !/[\s/?#\\]/.test(id);
export const routePage = route => route.split('?')[0];
export const tournamentRoute = id => `tournament?tournamentId=${encodeURIComponent(id)}`;
export const entryLoginRoute = (id, now = Date.now()) => `login?returnTo=tournament&tournamentId=${encodeURIComponent(id)}&at=${now}`;
export function tournamentTarget(route, now = Date.now()) {
  const [page, query = ''] = route.split('?'), params = new URLSearchParams(query);
  if (page === 'login') {
    if (!params.has('returnTo')) return null;
    const issued = Number(params.get('at'));
    if (params.get('returnTo') !== 'tournament' || !issued || issued > now + 30000 || now - issued > RETURN_LIFETIME)
      return { invalid: true };
  } else if (page !== 'tournament' || !params.has('tournamentId')) return null;
  const id = params.get('tournamentId');
  return validId(id) ? { id, destination: 'tournament' } : { invalid: true };
}
export function loginDestination(route, now = Date.now()) {
  const target = tournamentTarget(route, now);
  return target ? target.invalid ? 'tournaments' : tournamentRoute(target.id) : 'home';
}
export function requestTournamentEntry({ user, tournamentId, join, go }) {
  if (!user) { go(entryLoginRoute(tournamentId));return; }
  // Existing backend authorization remains authoritative; never auto-join Judges.
  if (user.role === 'player') return join();
}
export function expiredSessionDestination(route, selectedId) {
  return routePage(route) === 'tournament' && validId(selectedId) ? entryLoginRoute(selectedId) : null;
}
export function replaceRoute(route) {
  window.history.replaceState(window.history.state, '', '#' + route);
  window.dispatchEvent(new Event('hashchange'));
}
export const unavailableTournament = error => [403, 404].includes(error?.status)
  ? 'This tournament is unavailable. It may have been hidden or deleted.'
  : 'This tournament could not load. Try again or browse tournaments.';
