import { useState } from 'react';
import { createRoom, getClientId, joinRoom } from '../api/gameApi.js';

function normalizeRoomId(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
}

function enterRoom(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  window.location.assign(url.toString());
}

export default function Lobby() {
  const [roomInput, setRoomInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const normalized = normalizeRoomId(roomInput);

  async function handleCreate() {
    try {
      setBusy(true);
      setError('');
      const payload = await createRoom(getClientId());
      enterRoom(payload.roomId);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!normalized) return;
    try {
      setBusy(true);
      setError('');
      const payload = await joinRoom(normalized, getClientId());
      enterRoom(payload.roomId);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="lobby-page">
      <section className="lobby-card">
        <div className="brand-mark">OTT<span>V2</span></div>
        <p className="eyebrow">Online multiplayer strategy board</p>
        <h1>Rock. Paper. Scissors.<br />Play online.</h1>
        <p className="lobby-copy">
          Create a room, send the room code or URL to a friend, and play from different devices. Extra visitors can watch as spectators.
        </p>

        {error && <p className="error-banner lobby-error">{error}</p>}

        <div className="lobby-actions">
          <button type="button" className="button button--primary button--large" disabled={busy} onClick={handleCreate}>
            {busy ? 'Connecting…' : 'Create online room'}
          </button>

          <div className="join-row">
            <input
              value={roomInput}
              onChange={(event) => setRoomInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && normalized && !busy) handleJoin();
              }}
              placeholder="OTT-ABC123"
              aria-label="Room ID"
            />
            <button type="button" className="button button--secondary" disabled={!normalized || busy} onClick={handleJoin}>
              Join room
            </button>
          </div>
        </div>

        <div className="rules-preview">
          <div><strong>9×9</strong><span>board</span></div>
          <div><strong>2</strong><span>players</span></div>
          <div><strong>∞</strong><span>rooms</span></div>
          <div><strong>Live</strong><span>online play</span></div>
        </div>
      </section>
    </main>
  );
}
