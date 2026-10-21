import { useLayoutEffect, useState } from "react";

// Keep observer, font and animation-frame cleanup with connector measurement.
export function useRoundMapPaths(map, data, selected, view) {
  const [paths, setPaths] = useState([]);
  useLayoutEffect(() => {
    if (view !== "map" || !map.current) {
      setPaths([]);
      return;
    }
    let raf;
    const draw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const root = map.current;
        if (!root || !selected) {
          setPaths([]);
          return;
        }
        const bounds = root.getBoundingClientRect();
        const anchors = [...root.querySelectorAll("[data-path-player]")].filter(
          (e) => e.dataset.pathPlayer === selected,
        );
        setPaths(
          anchors.slice(1).flatMap((to, i) => {
            const from = anchors[i];
            if (
              Number(to.dataset.pathRound) !==
              Number(from.dataset.pathRound) + 1
            )
              return [];
            const a = from.getBoundingClientRect(),
              b = to.getBoundingClientRect(),
              x = a.right - bounds.left,
              y = a.top + a.height / 2 - bounds.top,
              u = b.left - bounds.left,
              v = b.top + b.height / 2 - bounds.top,
              mid = (x + u) / 2;
            return [{ d: `M${x},${y} H${mid} V${v} H${u}`, x, y, u, v }];
          }),
        );
      });
    };
    const observer = new ResizeObserver(draw);
    observer.observe(map.current);
    draw();
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) draw();
    });
    window.addEventListener("resize", draw);
    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", draw);
    };
  }, [data, selected, view]);
  return paths;
}
