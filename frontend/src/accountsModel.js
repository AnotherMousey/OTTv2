export const emptyTournament = {
  id: "",
  name: "Select a tournament",
  phase: "registration",
  round: 1,
  totalRounds: 0,
  capacity: 0,
  mapId: "standard-9",
  firstSide: "white",
  maxTurns: 31,
  players: [],
  pairs: [],
  history: [],
  counts: { accepted: 0, pending: 0, botsReady: 0 },
};

export const normalizeTournament = (e) => ({
  ...e,
  players: (e.players || []).map((p) => ({
    ...p,
    language:
      { python: "Python", java: "Java", cpp: "C++" }[p.language] || p.language,
  })),
  history: e.history || [],
  pairs: e.pairs || [],
  pagination: e.pagination || {},
  counts: e.counts || { accepted: 0, pending: 0, botsReady: 0 },
});

// Keep first occurrence and original ordering. Entry rows remain a separate page.
const uniqueById = (rows) =>
  rows.filter(
    (row, index, list) =>
      list.findIndex((value) => value.id === row.id) === index,
  );

export function mergeTournamentDirectory(current, events, offset) {
  const normalized = events.map(normalizeTournament);
  return offset ? uniqueById([...current, ...normalized]) : normalized;
}

export function tournamentWorkspace(event) {
  const value = normalizeTournament(event);
  value.entryRows = value.players;
  value.players = uniqueById([
    ...value.players,
    ...(event.pairingPlayers || []),
    ...(event.myEntry ? [event.myEntry] : []),
  ]);
  value.pairs = uniqueById([
    ...value.pairs,
    ...(event.myMatch ? [event.myMatch] : []),
  ]);
  return value;
}
