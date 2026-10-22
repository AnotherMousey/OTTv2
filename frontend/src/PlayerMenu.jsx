import React, { useEffect, useId, useRef, useState } from "react";
import { useAccounts } from "./PreviewAccounts.jsx";
import { ParticipantAvatar } from "./ParticipantAvatar.jsx";
import { Button } from "./ui.jsx";

export function PlayerMenu({ go }) {
  const { user, logout, authChecking } = useAccounts();
  const [open, setOpen] = useState(false);
  const root = useRef(null),
    trigger = useRef(null),
    panel = useRef(null),
    id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("hashchange", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("hashchange", close);
    };
  }, [open]);
  useEffect(() => {
    setOpen(false);
  }, [user?.id]);
  function enter(event) {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    setOpen(true);
    requestAnimationFrame(() =>
      panel.current?.querySelector("button")?.focus(),
    );
  }
  if (authChecking) return <span role="status">Checking session…</span>;
  if (!user) return <Button onClick={() => go("login")}>Log in</Button>;
  const judge = user.role === "judge";
  const actions = judge
    ? [
        ["⚑", "Manage tournaments", "tournaments"],
        ["+", "Manage accounts", "accounts"],
      ]
    : [
        ["▣", "My tournament bot", "mybot"],
        ["↗", "Practice match", "practice"],
        ["≡", "Practice history", "submissions"],
      ];
  actions.push(
    ["▥", "Account settings", "settings"],
    ["✦", "Customize character", "customize"],
  );
  return (
    <div
      className="profile-dock"
      ref={root}
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="player-pass"
        aria-expanded={open}
        aria-controls={id}
        aria-label="Open account menu"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={enter}
      >
        <span className="pass-portrait">
          <ParticipantAvatar participant={user} portrait={false} />
        </span>
        <span className="pass-name">
          <b>{user.name}</b>
          <small>
            <span className="pass-dot" />
            {judge ? "JUDGE" : "PLAYER"}
            {!judge && <span className="pass-rating">{user.rating} ELO</span>}
          </small>
        </span>
        <span className="pass-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      {open && (
        <section
          id={id}
          ref={panel}
          className="player-menu"
          aria-label="Account actions"
        >
          <div className="menu-topline">
            <span>YOUR ARENA PASS</span>
            <span className="ticket-cut" aria-hidden="true">
              ▥
            </span>
          </div>
          <div className="menu-identity">
            <span>
              <ParticipantAvatar participant={user} portrait={false} />
            </span>
            <div>
              <h2>{user.name}</h2>
              <p>
                @{user.username} · {judge ? "JUDGE" : "PLAYER"} ACCOUNT
              </p>
            </div>
            <span className="menu-rating">
              {judge ? "J" : user.rating}
              <small>{judge ? "JUDGE" : "ELO"}</small>
            </span>
          </div>
          <div className="menu-statline">
            <span>YOUR WORKSPACE</span>
            <b>
              {judge ? "Organize. Pair. Oversee." : "Build. Submit. Compete."}
            </b>
          </div>
          <div className="menu-actions">
            {actions.map(([icon, label, route]) => (
              <button
                type="button"
                key={route}
                onClick={() => {
                  setOpen(false);
                  go(route);
                }}
              >
                <span className="menu-icon" aria-hidden="true">
                  {icon}
                </span>
                {label}
                <span aria-hidden="true">↗</span>
              </button>
            ))}
            <button
              className="sign-out"
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
                go("login");
              }}
            >
              <span className="menu-icon" aria-hidden="true">
                ↪
              </span>
              Sign out<span aria-hidden="true">↗</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
