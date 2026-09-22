import { useState } from "react";

function normalizeRoomId(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
}

function enterRoom(roomId, color) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  url.searchParams.set("color", color);
  window.location.assign(url.toString());
}

export default function Lobby() {
  const [roomInput, setRoomInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const normalized = normalizeRoomId(roomInput);

  async function createRoom() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/rooms/create", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create room.");
      enterRoom(payload.roomId, payload.color);
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  }

  async function joinRoom() {
    if (!normalized) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: normalized }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not join room.");
      enterRoom(payload.roomId, payload.color);
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  }

  return (
    <main className="lobby-page">
      <section className="lobby-card">
        <div className="brand-mark">OTT<span>V2</span></div>
        <p className="eyebrow">Realtime strategy board</p>
        <h1>Rock. Paper. Scissors.<br />Now with territory.</h1>
        <p className="lobby-copy">
          Two players. Three pieces each. One square per turn. Capture enemy pieces or reach the opposite target to win.
        </p>

        <div className="lobby-actions">
          <button type="button" className="button button--primary button--large" onClick={createRoom} disabled={loading}>
            {loading ? "Connecting..." : "Create room"}
          </button>

          <div className="join-row">
            <input
              value={roomInput}
              onChange={(event) => setRoomInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && normalized) joinRoom();
              }}
              placeholder="Enter Room ID"
              aria-label="Room ID"
            />
            <button type="button" className="button button--secondary" disabled={!normalized || loading} onClick={joinRoom}>
              Join room
            </button>
          </div>
          {error && <p className="error-banner">{error}</p>}
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
