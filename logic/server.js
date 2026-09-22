const http = require('http');
const GameEngine = require('./engine');

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON request body.'));
      }
    });

    req.on('error', () => reject(new Error('Request body stream failed.')));
  });
}

const game = new GameEngine();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  const sendJson = (statusCode, payload) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  };

  try {
    if (req.method === 'GET' && url.pathname === '/api/game/state') {
      const perspective = (url.searchParams.get('view') || 'white').toLowerCase();
      if (!['white', 'black'].includes(perspective)) {
        throw new Error('view must be white or black.');
      }
      sendJson(200, game.getPublicState(perspective));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/game/new') {
      game.reset();
      sendJson(200, { message: 'New game started.', state: game.getPublicState() });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/game/move') {
      const body = await parseJsonBody(req);
      const { from, to } = body;

      if (!from || !to) {
        throw new Error('Both from and to coordinates are required.');
      }

      const updatedState = game.movePiece(from, to);
      sendJson(200, { message: 'Move accepted.', state: updatedState });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/game/forfeit') {
      const body = await parseJsonBody(req);
      const color = (body.color || game.currentTurn || 'white').toLowerCase();

      if (!['white', 'black'].includes(color)) {
        throw new Error('Color must be white or black.');
      }

      game.status = 'finished';
      game.winner = color === 'white' ? 'black' : 'white';
      sendJson(200, { message: `${color} forfeited.`, state: game.getPublicState(color) });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(200, { ok: true, service: 'ott-game-backend' });
      return;
    }

    sendJson(404, { error: 'Not found.' });
  } catch (error) {
    sendJson(400, { error: error.message || 'Bad request.' });
  }
});

module.exports = { server, game };
