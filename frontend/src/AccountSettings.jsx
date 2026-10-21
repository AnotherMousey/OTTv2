import React, { useState, useRef } from "react";
import { useAccounts } from "./PreviewAccounts.jsx";
import { ParticipantAvatar } from "./ParticipantAvatar.jsx";
import { PasswordField, Symbol } from "./AccountControls.jsx";
import { post } from "./api/platformApi.js";
export function AccountSettings() {
  const { user, saveProfile } = useAccounts();
  const { name, username, role } = user;
  const [teamBusy, setTeamBusy] = useState(false),
    [passwordBusy, setPasswordBusy] = useState(false);
  const [draft, setDraft] = useState(name),
    [teamStatus, setTeamStatus] = useState(""),
    [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [passwordError, setPasswordError] = useState(""),
    [passwordStatus, setPasswordStatus] = useState("");
  const [errorField, setErrorField] = useState(""),
    [passwordEpoch, setPasswordEpoch] = useState(0);
  const teamInput = useRef(null);
  const length = next.length,
    hasLength = length >= 12 && length <= 128,
    matches = Boolean(confirmation) && next === confirmation,
    dirty = draft.trim() !== name;
  async function saveTeam(e) {
    e.preventDefault();
    if (teamBusy) return;
    const value = draft.trim();
    if (value.length < 2 || value.length > 80) {
      setTeamStatus("Use 2–80 characters for your team name.");
      teamInput.current?.focus();
      return;
    }
    setTeamBusy(true);
    setTeamStatus("");
    try {
      await saveProfile(value);
      setDraft(value);
      setTeamStatus("Team name saved.");
    } catch (error) {
      setTeamStatus(error.message);
    } finally {
      setTeamBusy(false);
    }
  }
  async function changePassword(e) {
    e.preventDefault();
    if (passwordBusy) return;
    setPasswordError("");
    setPasswordStatus("");
    let message = "",
      field = "";
    if (!current) {
      message = "Enter your current password.";
      field = "current-password";
    } else if (!hasLength) {
      message = "Use 12–128 characters for the new password.";
      field = "new-password";
    } else if (next === current) {
      message = "Choose a password different from your current one.";
      field = "new-password";
    } else if (!matches) {
      message = "The new passwords do not match.";
      field = "confirm-password";
    }
    if (message) {
      setErrorField(field);
      setPasswordError(message);
      document.getElementById(field)?.focus();
      return;
    }
    setPasswordBusy(true);
    try {
      await post("/api/auth/password", {
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirmation,
      });
      setPasswordEpoch((epoch) => epoch + 1);
      setCurrent("");
      setNext("");
      setConfirmation("");
      setErrorField("");
      setPasswordStatus(
        "Password updated. Other sessions have been signed out.",
      );
    } catch (error) {
      setPasswordError(error.message);
      if(error.message.startsWith("Current password")){setErrorField("current-password");document.getElementById("current-password")?.focus();}
    } finally {
      setPasswordBusy(false);
    }
  }
  function editPassword(setter) {
    return (e) => {
      setter(e.target.value);
      setPasswordError("");
      setPasswordStatus("");
      setErrorField("");
    };
  }
  return (
    <section
      className="account-features account-settings"
      aria-labelledby="settings-title"
    >
      <div className="settings-heading">
        <div>
          <span className="eyebrow">
            {role.toUpperCase()} / ACCOUNT SETTINGS
          </span>
          <h1 id="settings-title">
            YOUR ACCOUNT<span className="yellow-dot">.</span>
          </h1>
          <p>Your identity in the arena. Your keys to the account.</p>
        </div>
        <div className="identity-stamp">
          <ParticipantAvatar participant={user} portrait />
          <div>
            <strong>{name}</strong>
            <span>
              @{username} · {role.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      <div className="settings-grid">
        <section className="identity-panel" aria-labelledby="team-title">
          <div className="panel-title">
            <span className="section-number">01</span>
            <div>
              <span className="eyebrow">YOUR ARENA IDENTITY</span>
              <h2 id="team-title">TEAM NAME</h2>
            </div>
            <Symbol kind="pencil" />
          </div>
          <p className="panel-description">
            A name the leaderboard will remember.
          </p>
          <div className="team-ticket">
            <div className="ticket-top">
              <span>PLAYER CARD</span>
              <span className="ticket-live">PREVIEW</span>
            </div>
            <div className="ticket-person">
              <div className="portrait-plinth">
                <ParticipantAvatar participant={user} portrait={false} />
              </div>
              <div>
                <strong>{draft.trim() || "Your team name"}</strong>
                <span>@{username}</span>
                <span className="rating-line">
                  {role === "judge" ? (
                    "TOURNAMENT ORGANIZER"
                  ) : (
                    <>
                      <b>{user.rating}</b> ELO <span aria-hidden="true">·</span>{" "}
                      PLAYER
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className="ticket-bottom">
              <span>
                <i /> YOUR ARENA IDENTITY
              </span>
              <span aria-hidden="true">▥</span>
            </div>
          </div>
          <form onSubmit={saveTeam} noValidate>
            <fieldset className="account-fieldset" disabled={teamBusy}>
              <div className="label-row">
                <label htmlFor="team-name">New team name</label>
                <span>{draft.length}/80</span>
              </div>
              <input
                ref={teamInput}
                id="team-name"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setTeamStatus("");
                }}
                maxLength={80}
                minLength={2}
                required
                autoComplete="off"
                aria-describedby="team-help team-feedback"
              />
              <p className="field-note" id="team-help">
                Your login stays <b>@{username}</b>. Your current name appears
                on the leaderboard and tournament roster.
              </p>
              <div className="save-line">
                <button
                  className="button"
                  type="submit"
                  disabled={!dirty || teamBusy}
                >
                  <Symbol kind="pencil" />
                  {teamBusy ? "Saving…" : "Save team name"}
                </button>
                {dirty && (
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => {
                      setDraft(name);
                      setTeamStatus("");
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="inline-status" id="team-feedback" role="status">
                {teamStatus && (
                  <>
                    <Symbol kind="check" />
                    {teamStatus}
                  </>
                )}
              </p>
            </fieldset>
          </form>
          <div className="identity-foot">
            <Symbol kind="lock" />
            <p>
              Your username is your permanent login.
              <br />
              Changing your team name does not change your login.
            </p>
          </div>
        </section>
        <section className="security-panel" aria-labelledby="security-title">
          <div className="panel-title">
            <span className="section-number">02</span>
            <div>
              <span className="eyebrow">KEEP YOUR ACCOUNT YOURS</span>
              <h2 id="security-title">PASSWORD</h2>
            </div>
            <Symbol kind="lock" />
          </div>
          <p className="panel-description">
            A fresh key. Same place in the tournament.
          </p>
          <form onSubmit={changePassword} noValidate>
            <fieldset className="account-fieldset" disabled={passwordBusy}>
              <PasswordField
                key={"current-password-" + passwordEpoch}
                id="current-password"
                label="Current password"
                value={current}
                onChange={editPassword(setCurrent)}
                autoComplete="current-password"
                error={errorField === "current-password"}
                describedBy={
                  errorField === "current-password"
                    ? "password-error"
                    : undefined
                }
              />
              <div className="new-password-group">
                <PasswordField
                  key={"new-password-" + passwordEpoch}
                  id="new-password"
                  label="New password"
                  value={next}
                  onChange={editPassword(setNext)}
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  error={errorField === "new-password"}
                  describedBy="password-rules"
                />
                <div className="password-rules" id="password-rules">
                  <span data-met={hasLength}>
                    <span aria-hidden="true">{hasLength ? "✓" : "▪"}</span>{" "}
                    12–128 characters
                  </span>
                  <span data-met={matches}>
                    <span aria-hidden="true">{matches ? "✓" : "▪"}</span>{" "}
                    Confirmation matches
                  </span>
                </div>
              </div>
              <PasswordField
                key={"confirm-password-" + passwordEpoch}
                id="confirm-password"
                label="Confirm new password"
                value={confirmation}
                onChange={editPassword(setConfirmation)}
                autoComplete="new-password"
                placeholder="Type it once more"
                error={errorField === "confirm-password"}
                describedBy={
                  errorField === "confirm-password"
                    ? "password-error"
                    : undefined
                }
              />
              {passwordError && (
                <p className="inline-error" id="password-error" role="alert">
                  {passwordError}
                </p>
              )}
              <button className="button security-submit" type="submit">
                <Symbol kind="lock" />
                {passwordBusy ? "Updating…" : "Update password"}
              </button>
              <p className="inline-status" role="status">
                {passwordStatus && (
                  <>
                    <Symbol kind="check" />
                    {passwordStatus}
                  </>
                )}
              </p>
            </fieldset>
          </form>
        </section>
      </div>
      <div className="settings-bottom">
        <span>
          <Symbol kind="lock" />
          Your bots, ratings and match history stay with your account.
        </span>
        <span>ACCOUNT CHANGES ARE SAVED SECURELY</span>
      </div>
    </section>
  );
}
