const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {resolveGame,resolveConfig,specification} = require('./games/registry');
const { resetRecording, recordMove, recordTerminal } = require('./recording');
const { createSubmission } = require('./submissions');
const { createMatch, getMatch, publicMatch, listHistory } = require('./match');

const {runtimes}=require('./runtime');
const rooms = new Map();
const FRONTEND_DIST = path.resolve(__dirname, '../frontend/dist');
const SERVE_FRONTEND = process.env.SERVE_FRONTEND !== 'false';
const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map(value => value.trim()).filter(Boolean));
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 512 * 1024) {
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

function createRoom(ownerClientId, {gameId='ottv2',mapId,config}={}) {
  const id = createRoomId();
  const room = {
    id,
    game: resolveGame(gameId).create(resolveConfig(mapId,config,'room'),'room'),
    players: {
      white: ownerClientId || null,
      black: null,
    },
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };
  resetRecording(room);
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

function replayPage(log,url) {
  if (!url.searchParams.has('afterSeq')) return log;
  const after=Number(url.searchParams.get('afterSeq'));
  const limit=Number(url.searchParams.get('limit') || 200);
  if (!Number.isInteger(after)||after < -1||!Number.isInteger(limit)||limit<1||limit>500) throw Error('Invalid replay cursor.');
  const reset=Boolean(url.searchParams.get('recordingId') && url.searchParams.get('recordingId')!==log.matchId);
  const start=reset ? 0 : Math.min(after+1,log.frames.length);
  const frames=log.frames.slice(start,start+limit).map((frame,i)=>({...frame,seq:start+i}));
  return {...log,frames,reset,totalFrames:log.frames.length,nextSeq:frames.length?frames.at(-1).seq:(reset?-1:after),hasMore:start+frames.length<log.frames.length};
}

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
    '.ttf': 'font/ttf',
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

  // Only explicit frontend origins receive permission for cross-origin API calls.
  const origin = req.headers.origin;
  const isApiRequest = url.pathname === '/health' || url.pathname.startsWith('/api/');
  if (origin && isApiRequest) {
    res.setHeader('Vary', 'Origin');
    if (!ALLOWED_ORIGINS.has(origin)) {
      sendJson(res, 403, { error: 'Origin is not allowed. Configure ALLOWED_ORIGINS on the backend.' });
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if(req.method==='GET' && url.pathname==='/api/runtime'){sendJson(res,200,{languages:Object.fromEntries(Object.entries(runtimes()).map(([language,r])=>[language,{available:r.available,message:r.available?'':r.message}]))});return;}
    if(req.method==='GET' && url.pathname==='/api/submission-history'){sendJson(res,200,{records:listHistory(url.searchParams.get('clientId'))});return;}
    if (req.method === 'GET' && ['/api/games/current','/api/games/ottv2/spec'].includes(url.pathname)) {
      sendJson(res,200,specification()); return;
    }
    if (!SERVE_FRONTEND && (req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/') {
      sendJson(res, 200, { ok: true, service: 'ottv2-api', health: '/health' });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'ottv2',
        rooms: rooms.size,
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/submissions') {
      const body = await parseJsonBody(req);
      const submission = createSubmission(body);
      sendJson(res, 201, submission);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/matches') {
      const body = await parseJsonBody(req);
      const match = createMatch({
        whiteSubmissionId: body.whiteSubmissionId,
        blackSubmissionId: body.blackSubmissionId,
        clientId: body.clientId, gameId: body.gameId, mapId: body.mapId, config: body.config,
      });
      sendJson(res, 202, match);
      return;
    }

    const matchReplay = /^\/api\/matches\/([A-Z0-9-]+)\/replay$/i.exec(url.pathname);
    if (req.method === 'GET' && matchReplay) {
      const match = getMatch(matchReplay[1]);
      if (match.status === 'failed') {
        sendJson(res, 409, { error: match.error, match: publicMatch(match) });
      } else if (!match.replay) {
        sendJson(res, 202, publicMatch(match));
      } else {
        sendJson(res, 200, replayPage(match.replay,url));
      }
      return;
    }

    const matchState = /^\/api\/matches\/([A-Z0-9-]+)$/i.exec(url.pathname);
    if (req.method === 'GET' && matchState) {
      sendJson(res, 200, publicMatch(getMatch(matchState[1])));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/rooms') {
      const body = await parseJsonBody(req);
      if (!body.clientId) throw new Error('clientId is required.');
      const room = createRoom(body.clientId,body);
      sendJson(res, 201, roomPayload(room, body.clientId));
      return;
    }

    const roomMatch = /^\/api\/rooms\/([A-Z0-9-]+)(?:\/(join|state|move|new|forfeit|replay))?$/i.exec(url.pathname);

    if (roomMatch) {
      const roomId = normalizeRoomId(roomMatch[1]);
      const action = roomMatch[2] || 'state';
      const room = getRoom(roomId);

      if (req.method === 'GET' && action === 'replay') {
        recordTerminal(room);
        sendJson(res, 200, replayPage(room.recording,url));
        return;
      }

      if (req.method === 'POST' && action === 'join') {
        const body = await parseJsonBody(req);
        joinRoom(room, body.clientId);
        sendJson(res, 200, roomPayload(room, body.clientId));
        return;
      }

      if (req.method === 'GET' && action === 'state') {
        const clientId = url.searchParams.get('clientId') || '';
        const payload = roomPayload(room, clientId);
        recordTerminal(room);
        sendJson(res, 200, payload);
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
        recordMove(room);
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
        resetRecording(room);
        sendJson(res, 200, roomPayload(room, body.clientId));
        return;
      }

      if (req.method === 'POST' && action === 'forfeit') {
        const body = await parseJsonBody(req);
        const role = getRole(room, body.clientId);
        if (!['white', 'black'].includes(role)) {
          throw new Error('Only players can forfeit.');
        }
        room.game.forfeit(role);
        recordTerminal(room, `${role} forfeited. Winner: ${room.game.winner}.`);
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
      if (SERVE_FRONTEND) serveFrontend(req, res, url);
      else sendJson(res, 404, { error: 'Not found. This service hosts the API; open the Vercel frontend.' });
      return;
    }

    sendJson(res, 404, { error: 'Not found.' });
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: error.message || 'Bad request.', code:error.code });
  }
});

module.exports = { server, rooms };
