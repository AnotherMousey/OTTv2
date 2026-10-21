import { useEffect, useRef, useState } from "react";
import { request } from "../api/platformApi.js";

export function useRoundMapData({
  tournament,
  round,
  offsets,
  status,
  query,
  selected,
  revision,
}) {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const requestGeneration = useRef(0);
  useEffect(() => {
    const controller = new AbortController(),
      generation = ++requestGeneration.current;
    let pending = false,
      timer;
    const load = async () => {
      if (pending || document.hidden) return;
      pending = true;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          round: String(round),
          limit: "12",
          status,
          q: query,
          ...(selected ? { focus: selected } : {}),
        });
        for (const [n, offset] of Object.entries(offsets))
          params.set("offset" + n, String(offset));
        const next = await request(
          `/api/tournaments/${encodeURIComponent(tournament.id)}/rounds?${params}`,
          { signal: controller.signal },
        );
        if (
          generation !== requestGeneration.current ||
          controller.signal.aborted
        )
          return;
        setData(next);
        setError("");
      } catch (e) {
        if (
          !controller.signal.aborted &&
          generation === requestGeneration.current
        )
          setError(e.message);
      } finally {
        pending = false;
        if (
          !controller.signal.aborted &&
          generation === requestGeneration.current
        )
          setLoading(false);
      }
    };
    const visible = () => {
      if (!document.hidden) load();
    };
    load();
    timer = setInterval(load, 10000);
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [
    tournament.id,
    tournament.round,
    tournament.phase,
    round,
    offsets,
    status,
    query,
    selected,
    revision,
  ]);
  return { data, loading, error, setError };
}
