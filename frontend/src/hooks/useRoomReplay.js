import { useEffect, useState } from 'react';
import { getRoomRecording } from '../api/roomApi.js';
import { recordingToReplay } from '../api/replayAdapter.js';
export function useRoomReplay(roomId, enabled = true) {
  const [result, setResult] = useState({ replay: null, error: '', loading: Boolean(roomId) });
  useEffect(() => {
    if (!roomId || !enabled) return;
    let cancelled = false, timer, controller, revision, accumulated=null, cursor=-1, recordingId="";
    setResult({ replay: null, error: '', loading: true });
    async function poll() {
      controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 10000);
      try {
        const page = await getRoomRecording(roomId, controller.signal, {afterSeq:cursor,limit:200,recordingId});
        if (page.protocolVersion === 2 && accumulated && page.matchId === recordingId && !page.reset && page.frames.length === 0) {
          if (!cancelled) setResult(current => current.error ? {...current,error:'',loading:false} : current);
          return; // No new frames: avoid decoding the entire accumulated replay again.
        }
        let recording;
        if (page.protocolVersion === 2 && Number.isInteger(page.nextSeq)) {
          if (!accumulated || page.reset || page.matchId !== recordingId) { accumulated={...page,frames:[]};cursor=-1; }
          const frames=accumulated.frames;
          for(const frame of page.frames) {
            if(frame.seq !== frames.length) throw Error('Replay frame sequence is incomplete.');
            frames.push(frame);
          }
          accumulated={...page,frames};cursor=page.nextSeq;recordingId=page.matchId;
          recording=accumulated;
        } else recording=page; // Old servers retain full-recording compatibility.
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
