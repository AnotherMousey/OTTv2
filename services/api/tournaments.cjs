// Keep the route-facing API stable while reads, writes and DTOs stay separate.
const { list, state, rankings } = require("./tournament-queries.cjs");
const {
  create,
  join,
  review,
  registration,
  entryMode,
  addParticipants,
  settings,
  advance,
  audit,
} = require("./tournament-commands.cjs");
const { entrant, pair } = require("./tournament-presenters.cjs");

module.exports = {
  list,
  state,
  rankings,
  create,
  join,
  review,
  registration,
  entryMode,
  addParticipants,
  settings,
  advance,
  entrant,
  pair,
  audit,
};
