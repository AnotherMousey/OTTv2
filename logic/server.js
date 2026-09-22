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

const rooms = new Map();

function normalizeRoomId(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
}

function createRoomId() {
  let roomId;
  do {
    roomId = `OTT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  } while (rooms.has(roomId));
  return roomId;
}

function createRoom() {
  const roomId = createRoomId();
  const room = {
    id: roomId,
    game: new GameEngine(),
    players: { white: true, black: false },
  };
  rooms.set(roomId, room);
  return room;
}

function getRoom(roomId) {
  const normalized = normalizeRoomId(roomId);
  if (!normalized) {
    throw new Error('Room code is required.');
  }

  const room = rooms.get(normalized);
  if (!room) {
    throw new Error('Room not found. Check the room code.');
  }
  return room;
}

function getState(room, color = 'white') {
  return room.game.getPublicState(color);
}

const demoRoom = createRoom();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  const sendJson = (statusCode, payload) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  };

  try {
    if (req.method === 'POST' && url.pathname === '/api/rooms/create') {
      const room = createRoom();
      sendJson(201, {
        message: 'Room created.',
        roomId: room.id,
        color: 'white',
        state: getState(room, 'white'),
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/rooms/join') {
      const body = await parseJsonBody(req);
      const room = getRoom(body.roomId);

      if (room.players.black) {
        throw new Error('This room already has two players.');
      }

      room.players.black = true;
      sendJson(200, {
        message: 'Room joined.',
        roomId: room.id,
        color: 'black',
        state: getState(room, 'black'),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/game/state') {
      const perspective = (url.searchParams.get('view') || 'white').toLowerCase();
      if (!['white', 'black'].includes(perspective)) {
        throw new Error('view must be white or black.');
      }
      const room = url.searchParams.get('room') ? getRoom(url.searchParams.get('room')) : demoRoom;
      sendJson(200, getState(room, perspective));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/game/new') {
      const room = url.searchParams.get('room') ? getRoom(url.searchParams.get('room')) : demoRoom;
      room.game.reset();
      sendJson(200, { message: 'New game started.', state: getState(room) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/game/move') {
      const body = await parseJsonBody(req);
      const { from, to } = body;

      if (!from || !to) {
        throw new Error('Both from and to coordinates are required.');
      }

      const room = body.roomId ? getRoom(body.roomId) : demoRoom;
      const updatedState = room.game.movePiece(from, to);
      sendJson(200, { message: 'Move accepted.', state: updatedState });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/game/forfeit') {
      const body = await parseJsonBody(req);
      const room = body.roomId ? getRoom(body.roomId) : demoRoom;
      const color = (body.color || room.game.currentTurn || 'white').toLowerCase();

      if (!['white', 'black'].includes(color)) {
        throw new Error('Color must be white or black.');
      }

      room.game.status = 'finished';
      room.game.winner = color === 'white' ? 'black' : 'white';
      sendJson(200, { message: `${color} forfeited.`, state: getState(room, color) });
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

module.exports = { server, rooms };
