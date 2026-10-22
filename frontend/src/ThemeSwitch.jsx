import React, { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

function pixelIris(x, y, radius) {
  const corners = [
    [-1, -0.4],
    [-0.4, -0.4],
    [-0.4, -1],
    [0.4, -1],
    [0.4, -0.4],
    [1, -0.4],
    [1, 0.4],
    [0.4, 0.4],
    [0.4, 1],
    [-0.4, 1],
    [-0.4, 0.4],
    [-1, 0.4],
  ];
  return `polygon(${corners.map(([a, b]) => `${x + a * radius}px ${y + b * radius}px`).join(",")})`;
}
export function ThemeSwitch({ theme, onChange }) {
  const transition = useRef(null),
    animation = useRef(null),
    request = useRef(0),
    nextTheme = useRef(theme);
  useEffect(() => {
    nextTheme.current = theme;
  }, [theme]);
  useEffect(
    () => () => {
      request.current++;
      transition.current?.skipTransition();
      animation.current?.cancel();
    },
    [],
  );
  function toggle(event) {
    const next = nextTheme.current === "dark" ? "light" : "dark";
    nextTheme.current = next;
    const identity = ++request.current;
    transition.current?.skipTransition();
    animation.current?.cancel();
    const apply = () => {
      if (identity !== request.current) return;
      flushSync(() => onChange(next));
      document.documentElement.dataset.theme = next;
    };
    if (
      !document.startViewTransition ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      apply();
      return;
    }
    const box = event.currentTarget.getBoundingClientRect(),
      x = box.left + box.width / 2,
      y = box.top + box.height / 2;
    const current = document.startViewTransition(apply);
    transition.current = current;
    current.ready
      .then(() => {
        if (identity !== request.current) return;
        animation.current = document.documentElement.animate(
          {
            clipPath: [
              pixelIris(x, y, 0),
              pixelIris(x, y, Math.hypot(innerWidth, innerHeight) * 3),
            ],
          },
          {
            duration: 570,
            easing: "cubic-bezier(.22,1,.36,1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {});
    current.finished
      .catch(() => {})
      .finally(() => {
        if (transition.current === current) transition.current = null;
      });
  }
  const dark = theme === "dark";
  return (
    <button
      className="sky-switch"
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      onClick={toggle}
    >
      <span className="sky-window" aria-hidden="true">
        <span className="sky-stars">
          ✦ ·<br /> · ✦
        </span>
        <span className="sky-sun" />
        <span className="sky-moon" />
        <span className="sky-horizon" />
      </span>
      <span className="sky-copy">
        <b>{dark ? "MOONLIT" : "DAYLIGHT"}</b>
        <small>{dark ? "Bring the sun ↗" : "Go moonlit ↗"}</small>
      </span>
    </button>
  );
}
