import { useEffect, useState } from 'react';
import { getRoomRecording } from '../api/roomApi.js';
import { recordingToReplay } from '../api/replayAdapter.js';
export function useRoomReplay(roomId, enabled = true) {
  const [result, setResult] = useState({ replay: null, error: '', loading: Boolean(roomId) });
  useEffect(() => {
    if (!roomId || !enabled) return;
    let cancelled = false, timer, controller, revision;
    setResult({ replay: null, error: '', loading: true });
    async function poll() {
      controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 10000);
      try {
        const recording = await getRoomRecording(roomId, controller.signal);
        const replay = recordingToReplay(recording);
        const nextRevision = `${replay.matchId}:${replay.frames.length}`;
        if (!cancelled) {
          if (revision !== nextRevision) {
            revision = nextRevision;
            setResult({ replay, error: '', loading: false });
          } else setResult(current => current.error ? { ...current, error: '', loading: false } : current);
        }
      } catch (error) {
        if (!cancelled) setResult(current => ({ ...current, error: error.name === 'AbortError' ? 'Room request timed out. Retrying…' : `${error.message} Retrying…`, loading: false }));
      } finally {
        clearTimeout(deadline);
        if (!cancelled) timer = setTimeout(poll, 1000);
      }
    }
    poll();
    return () => { cancelled = true; clearTimeout(timer); controller?.abort(); };
  }, [roomId, enabled]);
  return result;
}
