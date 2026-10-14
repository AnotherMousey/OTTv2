import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';

// Render the actual JSX components with controlled account data.
// The virtual context exists only in this test server, never in the app build.
test('My Bot handles missing entries, loading, roles and readiness without throwing', async () => {
  const virtual = '\0my-bot-test-accounts';
  const server = await createServer({
    configFile: false,
    root: new URL('../', import.meta.url).pathname,
    server: {middlewareMode: true},
    plugins: [{
      name: 'my-bot-account-fixture',
      enforce: 'pre',
      resolveId(id) { if (id.endsWith('PreviewAccounts.jsx')) return virtual; },
      load(id) { if (id === virtual) return 'export function useAccounts(){return globalThis.__myBotTestAccounts;}'; },
    }],
  });
  try {
    const {MyBot, TournamentBotPanel} = await server.ssrLoadModule('/src/BotSubmission.jsx');
    const user = {id: 'new-player', name: 'New Player', role: 'player'};
    const tournament = {id: 'cup', name: 'Cup', phase: 'registration', players: []};
    const render = (component, accounts) => {
      globalThis.__myBotTestAccounts = {loading: false, error: '', events: [tournament], saveBot() {}, selectEvent() {}, ...accounts};
      return renderToStaticMarkup(React.createElement(component, {go() {}}));
    };
    assert.match(render(MyBot, {user, tournament}), /ENTRY REQUIRED/);
    assert.match(render(MyBot, {user, tournament, loading: true}), /LOADING TOURNAMENTS/);
    assert.match(render(MyBot, {user, tournament: {...tournament, id: ''}}), /NO TOURNAMENT SELECTED/);
    assert.match(render(TournamentBotPanel, {user: null, tournament}), /Log in/);
    assert.match(render(TournamentBotPanel, {user: {...user, role: 'judge'}, tournament}), /Manage bot readiness/);
    for (const entry of ['pending', 'declined']) {
      assert.match(render(TournamentBotPanel, {user, tournament: {...tournament, players: [{id: user.id, entry}]}}), /ENTRY REQUIRED/);
    }
    const accepted = {...tournament, phase: 'preparation', players: [{id: user.id, entry: 'accepted', botReady: false}]};
    assert.match(render(TournamentBotPanel, {user, tournament: accepted}), /Save tournament bot/);
    const ready = {...accepted, players: [{...accepted.players[0], botReady: true, botName: 'bot.py', language: 'Python', botVersion: 1}]};
    assert.match(render(TournamentBotPanel, {user, tournament: ready}), /Validated bot/);
    assert.match(render(TournamentBotPanel, {user, tournament: ready}), /Update tournament bot/);
  } finally {
    delete globalThis.__myBotTestAccounts;
    await server.close();
  }
});
