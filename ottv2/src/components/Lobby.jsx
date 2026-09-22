import { useState } from "react";

function normalizeRoomId(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
}

function createRoomId() {
  const token = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `OTT-${token}`;
}

function enterRoom(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  window.location.assign(url.toString());
}

export default function Lobby() {
  const [roomInput, setRoomInput] = useState("");
  const normalized = normalizeRoomId(roomInput);

  return (
    <main className="lobby-page">
      <section className="lobby-card">
        <div className="brand-mark">OTT<span>V2</span></div>
        <p className="eyebrow">Realtime strategy board</p>
        <h1>Rock. Paper. Scissors.<br />Now with territory.</h1>
        <p className="lobby-copy">
          Two players. Nine pieces each. One square per turn. Capture a complete enemy type or reach the opposite target to win.
        </p>

        <div className="lobby-actions">
          <button type="button" className="button button--primary button--large" onClick={() => enterRoom(createRoomId())}>
            Create room
          </button>

          <div className="join-row">
            <input
              value={roomInput}
              onChange={(event) => setRoomInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && normalized) enterRoom(normalized);
              }}
              placeholder="Enter Room ID"
              aria-label="Room ID"
            />
            <button type="button" className="button button--secondary" disabled={!normalized} onClick={() => enterRoom(normalized)}>
              Join room
            </button>
          </div>
        </div>

        <div className="rules-preview">
          <div><strong>9×9</strong><span>board</span></div>
          <div><strong>8</strong><span>directions</span></div>
          <div><strong>2</strong><span>players</span></div>
          <div><strong>3</strong><span>piece types</span></div>
        </div>
      </section>
    </main>
  );
}
