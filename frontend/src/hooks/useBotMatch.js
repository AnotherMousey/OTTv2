import { useEffect, useState } from 'react';
import { getBotMatch, getBotReplay } from '../api/matchApi.js';
import { matchLogToReplay } from '../api/replayAdapter.js';

export function useBotMatch(matchId) {
  const [result, setResult] = useState({ status: null, replay: null, error: '', loading: Boolean(matchId) });
  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    let timer;
    async function poll() {
      try {
        const status = await getBotMatch(matchId);
        const log = status.status === 'finished' ? await getBotReplay(matchId) : null;
        if (!cancelled) {
          const replay = log ? matchLogToReplay(log) : null;
          setResult(current => ({
            status,
            replay: replay && current.replay?.matchId === replay.matchId &&
              current.replay.frames.length === replay.frames.length
              ? current.replay : replay,
            error: '',
            loading: status.status !== 'finished' && status.status !== 'failed',
          }));
        }
      } catch (error) {
        if (!cancelled) setResult(current => ({ ...current, error: error.message, loading: false }));
      } finally {
        if (!cancelled) timer = setTimeout(poll, 1000);
      }
    }
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [matchId]);
  return result;
}
