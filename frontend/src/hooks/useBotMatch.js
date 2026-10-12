import { useEffect, useState } from 'react';
import { getBotMatch, getBotReplay } from '../api/matchApi.js';
import { matchLogToReplay } from '../api/replayAdapter.js';

export function useBotMatch(matchId) {
  const [result, setResult] = useState({ status: null, replay: null, error: '', loading: Boolean(matchId) });
  useEffect(() => {
    if (!matchId) {setResult({status:null,replay:null,error:'',loading:false});return;}
    let cancelled = false;
    let timer, controller;
    let terminal = false;
    async function poll() {
      controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 10000);
      try {
        const status = await getBotMatch(matchId, controller.signal);
        const log = status.status === 'finished' ? await getBotReplay(matchId, controller.signal) : null;
        terminal = status.status === 'failed' || (status.status === 'finished' && Boolean(log));
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
        clearTimeout(deadline);
        if (!cancelled && !terminal) timer = setTimeout(poll, 1000);
      }
    }
    poll();
    return () => { cancelled = true; clearTimeout(timer); controller?.abort(); };
  }, [matchId]);
  return result;
}
