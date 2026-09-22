const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const GameEngine = require('./engine');

const rooms = new Map();
const FRONTEND_DIST = path.resolve(__dirname, '../ottv2/dist');
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON request body.'));
      }
    });

    req.on('error', () => reject(new Error('Request body stream failed.')));
  });
}

function normalizeRoomId(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 20);
}

function createRoomId() {
  let id;
  do {
    id = `OTT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  } while (rooms.has(id));
  return id;
}

function createRoom(ownerClientId) {
  const id = createRoomId();
  const room = {
    id,
    game: new GameEngine(),
    players: {
      white: ownerClientId || null,
      black: null,
    },
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };
  rooms.set(id, room);
  return room;
}

function getRoom(roomId) {
  const room = rooms.get(normalizeRoomId(roomId));
  if (!room) {
    throw new Error('Room not found. Check the room code and try again.');
  }
  room.lastActivityAt = Date.now();
  return room;
}

function getRole(room, clientId) {
  if (!clientId) return 'spectator';
  if (room.players.white === clientId) return 'white';
  if (room.players.black === clientId) return 'black';
  return 'spectator';
}

function joinRoom(room, clientId) {
  if (!clientId) throw new Error('clientId is required.');

  const existingRole = getRole(room, clientId);
  if (existingRole !== 'spectator') return existingRole;

  if (!room.players.white) {
    room.players.white = clientId;
    return 'white';
  }

  if (!room.players.black) {
    room.players.black = clientId;
    return 'black';
  }

  return 'spectator';
}

function roomPayload(room, clientId) {
  const role = getRole(room, clientId);
  const perspective = role === 'black' ? 'black' : 'white';
  return {
    roomId: room.id,
    role,
    seats: {
      white: Boolean(room.players.white),
      black: Boolean(room.players.black),
    },
    state: room.game.getPublicState(perspective),
  };
}

function cleanupOldRooms() {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const [roomId, room] of rooms.entries()) {
    if (room.lastActivityAt < cutoff) rooms.delete(roomId);
  }
}

setInterval(cleanupOldRooms, 30 * 60 * 1000).unref();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
  }[ext] || 'application/octet-stream';
}

function serveFrontend(req, res, url) {
  if (!fs.existsSync(FRONTEND_DIST)) {
    sendJson(res, 503, {
      error: 'Frontend build not found. Run npm run build before starting the server.',
    });
    return;
  }

  let requestPath = decodeURIComponent(url.pathname);
  if (requestPath === '/') requestPath = '/index.html';

  const requestedFile = path.resolve(FRONTEND_DIST, `.${requestPath}`);
  const insideDist = requestedFile.startsWith(FRONTEND_DIST + path.sep) || requestedFile === FRONTEND_DIST;
  const filePath = insideDist && fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()
    ? requestedFile
    : path.join(FRONTEND_DIST, 'index.html');

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 500, { error: 'Could not read frontend build.' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'ottv2',
        rooms: rooms.size,
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/rooms') {
      const body = await parseJsonBody(req);
      if (!body.clientId) throw new Error('clientId is required.');
      const room = createRoom(body.clientId);
      sendJson(res, 201, roomPayload(room, body.clientId));
      return;
    }

    const roomMatch = /^\/api\/rooms\/([A-Z0-9-]+)(?:\/(join|state|move|new|forfeit))?$/i.exec(url.pathname);

    if (roomMatch) {
      const roomId = normalizeRoomId(roomMatch[1]);
      const action = roomMatch[2] || 'state';
      const room = getRoom(roomId);

      if (req.method === 'POST' && action === 'join') {
        const body = await parseJsonBody(req);
        joinRoom(room, body.clientId);
        sendJson(res, 200, roomPayload(room, body.clientId));
        return;
      }

      if (req.method === 'GET' && action === 'state') {
        const clientId = url.searchParams.get('clientId') || '';
        sendJson(res, 200, roomPayload(room, clientId));
        return;
      }

      if (req.method === 'POST' && action === 'move') {
        const body = await parseJsonBody(req);
        const role = getRole(room, body.clientId);
        if (!['white', 'black'].includes(role)) {
          throw new Error('Spectators cannot move pieces.');
        }

        if (room.game.currentTurn !== role) {
          throw new Error(`It is ${room.game.currentTurn}'s turn.`);
        }

        const piece = room.game.getPiece(body.from);
        if (!piece || piece.color !== role) {
          throw new Error('You can only move your own pieces.');
        }

        room.game.movePiece(body.from, body.to);
        sendJson(res, 200, roomPayload(room, body.clientId));
        return;
      }

      if (req.method === 'POST' && action === 'new') {
        const body = await parseJsonBody(req);
        const role = getRole(room, body.clientId);
        if (!['white', 'black'].includes(role)) {
          throw new Error('Only players can reset a match.');
        }
        room.game.reset();
        sendJson(res, 200, roomPayload(room, body.clientId));
        return;
      }

      if (req.method === 'POST' && action === 'forfeit') {
        const body = await parseJsonBody(req);
        const role = getRole(room, body.clientId);
        if (!['white', 'black'].includes(role)) {
          throw new Error('Only players can forfeit.');
        }
        room.game.status = 'finished';
        room.game.winner = role === 'white' ? 'black' : 'white';
        sendJson(res, 200, roomPayload(room, body.clientId));
        return;
      }

      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: 'API route not found.' });
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      serveFrontend(req, res, url);
      return;
    }

    sendJson(res, 404, { error: 'Not found.' });
  } catch (error) {
    sendJson(res, 400, { error: error.message || 'Bad request.' });
  }
});

module.exports = { server, rooms };
