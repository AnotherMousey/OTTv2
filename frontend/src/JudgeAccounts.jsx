import React, { useEffect, useRef, useState } from "react";
import { PasswordField, Symbol } from "./AccountControls.jsx";

import { validate, csvRows } from "./accountValidation.js";
import { post, request } from "./api/platformApi.js";
const blankAccount = { username: "", name: "", password: "", role: "player" };
export function JudgeAccounts({ go }) {
  const [accounts, setAccounts] = useState([]),
    [registrationOpen, setRegistrationOpen] = useState(false),
    [policyReady, setPolicyReady] = useState(false),
    [busy, setBusy] = useState(false),
    [policyBusy, setPolicyBusy] = useState(false),
    [serviceError, setServiceError] = useState("");
  const openRegister = () => go("register");
  useEffect(() => {
    let active = true;
    request("/api/auth/registration")
      .then((data) => {
        if (active) {
          setRegistrationOpen(data.enabled);
          setPolicyReady(true);
        }
      })
      .catch((error) => {
        if (active) setServiceError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function toggleRegistration(enabled) {
    if (policyBusy || !policyReady) return;
    setPolicyBusy(true);
    setServiceError("");
    try {
      const data = await post("/api/auth/registration", { enabled });
      setRegistrationOpen(data.enabled);
    } catch (error) {
      setServiceError(error.message);
    } finally {
      setPolicyBusy(false);
    }
  }
  async function addAccounts(rows) {
    const data =
      rows.length === 1
        ? await post("/api/accounts", rows[0])
        : await post("/api/accounts/bulk", { accounts: rows });
    const added = data.accounts || [data.account];
    setAccounts((current) => [
      ...current,
      ...added.map((account) => ({
        ...account,
        created: true,
        password: rows.find((row) => row.username === account.username)
          ?.password,
      })),
    ]);
  }

  const [draft, setDraft] = useState(blankAccount),
    [errors, setErrors] = useState({}),
    [status, setStatus] = useState(""),
    [epoch, setEpoch] = useState(0);
  const [csv, setCsv] = useState(""),
    [review, setReview] = useState(null),
    [bulkError, setBulkError] = useState(""),
    [bulkStatus, setBulkStatus] = useState("");
  const [details, setDetails] = useState(null),
    [detailEpoch, setDetailEpoch] = useState(0);
  const username = useRef(null),
    file = useRef(null),
    dialog = useRef(null),
    trigger = useRef(null);
  const created = accounts.filter((account) => account.created);
  useEffect(() => {
    if (details) dialog.current?.showModal();
  }, [details, detailEpoch]);
  useEffect(()=>{if(status)username.current?.focus();},[status]);
  function closeDetails() {
    dialog.current?.close();
    setDetails(null);
    trigger.current?.focus();
  }
  function change(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setStatus("");
  }
  async function create(e) {
    e.preventDefault();
    if (busy) return;
    const result = validate(
      draft,
      new Set(accounts.map((account) => account.username)),
    );
    setErrors(result.errors);
    if (Object.keys(result.errors).length) {
      document
        .getElementById("create-" + Object.keys(result.errors)[0])
        ?.focus();
      return;
    }
    setBusy(true);
    try {
      await addAccounts([result.value]);
      setDraft(blankAccount);
      setEpoch((value) => value + 1);
      setStatus(`${result.value.name} was created as a ${result.value.role}.`);
      username.current?.focus();
    } catch (error) {
      setErrors({ username: error.message });
    } finally {
      setBusy(false);
    }
  }
  async function inspectCSV() {
    if (busy) return;
    setBusy(true);
    setBulkError("");
    setBulkStatus("");
    try {
      const rows = csvRows(csv);
      if (!rows.length) throw Error("Paste at least one account row first.");
      if (rows.length > 500)
        throw Error("Review up to 500 accounts at a time.");
      const names = new Set(accounts.map((account) => account.username));
      const parsed = rows.map((fields, index) => {
        if (fields.length < 3 || fields.length > 4)
          return {
            line: index + 1,
            value: { username: fields[0] || "" },
            error: "Use username, team name, password, and optional role.",
          };
        const { value, errors } = validate(
          {
            username: fields[0],
            name: fields[1],
            password: fields[2],
            role: fields[3]?.trim().toLowerCase() || "player",
          },
          names,
        );
        if (!Object.keys(errors).length) names.add(value.username);
        return {
          line: index + 1,
          value,
          error: Object.values(errors).join(" "),
        };
      });
      if (parsed.some((row) => row.error)) {
        setReview(parsed);
        return;
      }
      const remote = await post("/api/accounts/review", {
        accounts: parsed.map((row) => row.value),
      });
      setReview(
        parsed.map((row, index) => ({
          ...row,
          error: row.error || remote.rows[index].error,
        })),
      );
    } catch (error) {
      setReview(null);
      setBulkError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function createBulk() {
    if (busy || !review || review.some((row) => row.error)) return;
    setBusy(true);
    try {
      await addAccounts(review.map((row) => row.value));
      setBulkStatus(
        `${review.length} ${review.length === 1 ? "account" : "accounts"} created.`,
      );
      setReview(null);
      setCsv("");
    } catch (error) {
      setBulkError(error.message);
      setReview(null);
    } finally {
      setBusy(false);
    }
  }
  async function readFile(event) {
    const input = event.currentTarget,
      selected = input.files?.[0];
    if (!selected) return;
    setBulkError("");
    try {
      if (!/\.(csv|txt)$/i.test(selected.name))
        throw Error("Choose a .csv or .txt file.");
      if (selected.size > 1024 * 1024)
        throw Error("Choose a file smaller than 1 MB.");
      setCsv(await selected.text());
      setReview(null);
      setBulkStatus("");
    } catch (error) {
      setBulkError(error.message);
    } finally {
      input.value = "";
    }
  }
  function sample() {
    setCsv(
      "username,team name,password,role\nplayer02,Team Orbit,ArenaDemo2026!,player\nplayer03,Pixel Pioneers,ArenaDemo2026!,player",
    );
    setReview(null);
    setBulkError("");
    setBulkStatus("");
  }
  return (
    <section
      className="account-features judge-accounts"
      aria-labelledby="accounts-title"
    >
      <div className="judge-heading">
        <div>
          <span className="eyebrow">JUDGE / PLAYER MANAGEMENT</span>
          <h1 id="accounts-title">
            THE ACCOUNTS<span className="yellow-dot">.</span>
          </h1>
          <p>Create a place for every player in the arena.</p>
        </div>
        <span className="judge-permission">
          <Symbol kind="lock" /> JUDGE ACCESS
        </span>
      </div>
      {serviceError && (
        <p className="inline-error" role="alert">
          {serviceError}
        </p>
      )}
      <section
        className={`registration-control ${registrationOpen ? "is-open" : ""}`}
        aria-labelledby="registration-title"
      >
        <div className="registration-copy">
          <span className="registration-indicator" aria-hidden="true" />
          <div>
            <h2 id="registration-title">PLAYER SELF-REGISTRATION</h2>
            <p>
              {registrationOpen ? (
                <>
                  Players can create their own accounts at{" "}
                  <button className="route-link" onClick={openRegister}>
                    /register ↗
                  </button>
                  .
                </>
              ) : !policyReady ? (
                "Loading registration settings…"
              ) : (
                "Registration is closed. You can still create player accounts below."
              )}
            </p>
          </div>
        </div>
        <label className="registration-checkbox">
          <input
            type="checkbox"
            checked={registrationOpen}
            disabled={!policyReady || policyBusy}
            onChange={(e) => toggleRegistration(e.target.checked)}
          />
          <span>
            Allow players to register
            <small>
              {registrationOpen
                ? "REGISTRATION OPEN"
                : "ORGANIZER-ISSUED ACCOUNTS"}
            </small>
          </span>
        </label>
      </section>
      <section className="create-account-card" aria-labelledby="add-title">
        <div className="create-heading">
          <div>
            <span className="section-number">01</span>
            <h2 id="add-title">ADD AN ACCOUNT</h2>
          </div>
          <span className="small-caption">ONE PLAYER. ONE IDENTITY.</span>
        </div>
        <form className="create-account-form" noValidate onSubmit={create}>
          <fieldset className="account-fieldset" disabled={busy}>
            <div className="create-field">
              <label htmlFor="create-username">Username</label>
              <input
                ref={username}
                id="create-username"
                value={draft.username}
                onChange={(e) => change("username", e.target.value)}
                placeholder="e.g. player01"
                autoComplete="off"
                maxLength={32}
                required
                aria-invalid={Boolean(errors.username)}
                aria-describedby={
                  errors.username ? "error-username" : "username-help"
                }
              />
            </div>
            <div className="create-field">
              <label htmlFor="create-name">
                Team name <span>(optional)</span>
              </label>
              <input
                id="create-name"
                value={draft.name}
                onChange={(e) => change("name", e.target.value)}
                placeholder="Defaults to username"
                maxLength={80}
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "error-name" : undefined}
              />
            </div>
            <PasswordField
              key={epoch}
              id="create-password"
              label="Password"
              value={draft.password}
              onChange={(e) => change("password", e.target.value)}
              autoComplete="new-password"
              placeholder="12+ characters"
              error={errors.password}
              describedBy={
                errors.password ? "error-password" : "password-create-help"
              }
            />
            <div className="create-field role-field">
              <label htmlFor="create-role">Role</label>
              <select
                id="create-role"
                value={draft.role}
                onChange={(e) => change("role", e.target.value)}
                aria-describedby="role-help"
              >
                <option value="player">Player</option>
                <option value="judge">Judge</option>
              </select>
            </div>
            <button type="submit" className="button add-account">
              <span className="add-person" aria-hidden="true">
                +
              </span>
              Add account
            </button>
          </fieldset>
        </form>
        <div className="create-notes">
          <span id="username-help">Unique username · 3–32 characters</span>
          <span id="password-create-help">Password · 12–128 characters</span>
          <span id="role-help">Players compete. Judges manage.</span>
        </div>
        {Object.entries(errors)
          .filter(([, value]) => value)
          .map(([key, value]) => (
            <p
              key={key}
              id={"error-" + key}
              className="inline-error"
              role="alert"
            >
              <b>
                {key === "name"
                  ? "Team name"
                  : key[0].toUpperCase() + key.slice(1)}
                :
              </b>{" "}
              {value}
            </p>
          ))}
        <p
          className={`creation-status ${status ? "has-message" : ""}`}
          role="status"
        >
          {status && (
            <>
              <Symbol kind="check" />
              {status}
            </>
          )}
        </p>
        <details className="bulk-accounts">
          <summary>
            <span className="bulk-plus" aria-hidden="true">
              +
            </span>
            <span>Add multiple accounts at once</span>
            <span className="bulk-subtitle">CSV / PASTE A LIST</span>
          </summary>
          <div className="bulk-content">
            <fieldset className="account-fieldset" disabled={busy}>
              <div className="bulk-intro">
                <div>
                  <h3>BUILD YOUR PLAYER ROSTER</h3>
                  <p>
                    Paste a CSV list or choose a file. Review every row before
                    creating accounts.
                  </p>
                </div>
                <div className="bulk-tools">
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={sample}
                  >
                    Insert example
                  </button>
                  <button
                    type="button"
                    className="button secondary csv-picker"
                    onClick={() => file.current?.click()}
                  >
                    Choose CSV
                  </button>
                  <input
                    ref={file}
                    className="sr-only"
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    onChange={readFile}
                    aria-label="Upload account CSV"
                  />
                </div>
              </div>
              <label className="csv-label" htmlFor="account-csv">
                Account list <span>username, team name, password, role</span>
              </label>
              <textarea
                maxLength={1048576}
                id="account-csv"
                rows={5}
                value={csv}
                onChange={(e) => {
                  setCsv(e.target.value);
                  setReview(null);
                  setBulkError("");
                  setBulkStatus("");
                }}
                spellCheck="false"
                placeholder={
                  "player02,Team Orbit,ArenaDemo2026!,player\nplayer03,Pixel Pioneers,ArenaDemo2026!,player"
                }
                aria-describedby="csv-help"
              />
              <p className="csv-help" id="csv-help">
                One account per line. Leave team name blank to use the username.
                Role defaults to player. Quote names that contain commas.
              </p>
              <button
                className="button secondary review-accounts"
                disabled={!csv.trim()}
                onClick={inspectCSV}
              >
                Review accounts <span aria-hidden="true">↗</span>
              </button>
              {bulkError && (
                <p className="inline-error" role="alert">
                  {bulkError}
                </p>
              )}
              {review && (
                <div className="bulk-review">
                  <div className="review-heading">
                    <h3>CHECK THE ROSTER</h3>
                    <span>
                      {review.filter((row) => !row.error).length} /{" "}
                      {review.length} READY
                    </span>
                  </div>
                  <div
                    className="review-table-wrap"
                    role="region"
                    aria-label="CSV account review"
                    tabIndex={0}
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Username</th>
                          <th>Team</th>
                          <th>Role</th>
                          <th>Review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {review.map((row) => (
                          <tr key={row.line}>
                            <td>{String(row.line).padStart(2, "0")}</td>
                            <td>{row.value.username}</td>
                            <td>{row.value.name || "—"}</td>
                            <td>{row.value.role || "—"}</td>
                            <td>
                              <span
                                className={
                                  row.error ? "row-error" : "row-ready"
                                }
                              >
                                {row.error || "Ready"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bulk-confirm">
                    <p>
                      {review.some((row) => row.error)
                        ? "Fix the highlighted rows, then review again. Nothing has been created."
                        : "All rows are valid. Ready when you are."}
                    </p>
                    <button
                      className="button"
                      disabled={review.some((row) => row.error)}
                      onClick={createBulk}
                    >
                      Create {review.length}{" "}
                      {review.length === 1 ? "account" : "accounts"}
                    </button>
                  </div>
                </div>
              )}
              {bulkStatus && (
                <p className="inline-status" role="status">
                  <Symbol kind="check" />
                  {bulkStatus}
                </p>
              )}
            </fieldset>
          </div>
        </details>
      </section>
      <section className="created-section" aria-labelledby="created-title">
        <div className="created-heading">
          <div>
            <span className="eyebrow">THIS SESSION</span>
            <h2 id="created-title">RECENTLY CREATED</h2>
          </div>
          <span className="created-counter">
            {String(created.length).padStart(2, "0")}{" "}
            {created.length === 1 ? "ACCOUNT" : "ACCOUNTS"}
          </span>
        </div>
        {created.length ? (
          <div
            className="created-table-wrap"
            role="region"
            aria-label="Recently created accounts"
            tabIndex={0}
          >
            <table className="created-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Team / display name</th>
                  <th>Role</th>
                  <th>Access details</th>
                </tr>
              </thead>
              <tbody>
                {created
                  .slice()
                  .reverse()
                  .map((account) => (
                    <tr key={account.username}>
                      <td>
                        <b>@{account.username}</b>
                      </td>
                      <td>{account.name}</td>
                      <td>
                        <span className="role-badge">
                          {account.role.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button
                          className="preview-link"
                          onClick={(event) => {
                            trigger.current = event.currentTarget;
                            setDetails(account);
                            setDetailEpoch((value) => value + 1);
                          }}
                        >
                          Login details ↗
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="created-empty">
            <span className="empty-pixel" aria-hidden="true">
              +
            </span>
            <div>
              <h3>YOUR NEXT PLAYERS START HERE.</h3>
              <p>New accounts will appear here after you add them.</p>
            </div>
          </div>
        )}
      </section>
      <p className="judge-preview-note">
        <Symbol kind="lock" />
        Accounts and registration settings are saved to the server. Login
        details remain visible only until you leave this page.
      </p>
      <dialog
        ref={dialog}
        className="credential-dialog"
        aria-labelledby="credential-title"
        onCancel={() => {
          setDetails(null);
          trigger.current?.focus();
        }}
      >
        {details && (
          <>
            <span className="eyebrow">
              NEW {details.role.toUpperCase()} ACCOUNT
            </span>
            <h2 id="credential-title">LOGIN DETAILS</h2>
            <p>
              Share these credentials with <b>{details.name}</b>.
            </p>
            <label className="credential-username" htmlFor="detail-username">
              Username
              <input id="detail-username" value={details.username} readOnly />
            </label>
            <PasswordField
              key={detailEpoch}
              id="detail-password"
              label="Password"
              value={details.password}
              readOnly
              autoComplete="off"
            />
            <div className="credential-foot">
              <span className="demo-tag">NEW ACCOUNT</span>
              <button className="button" onClick={closeDetails}>
                Done
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
export function RegisterPage({ go }) {
  const goLogin = () => go("login");
  const [enabled, setEnabled] = useState(null),
    [busy, setBusy] = useState(false),
    [policyError, setPolicyError] = useState("");
  useEffect(() => {
    let active = true;
    request("/api/auth/registration")
      .then((data) => {
        if (active) setEnabled(data.enabled);
      })
      .catch((error) => {
        if (active) setPolicyError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const [draft, setDraft] = useState(blankAccount),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [created, setCreated] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const result = validate({ ...draft, role: "player" }, new Set());
    if (Object.keys(result.errors).length) {
      setError(Object.values(result.errors)[0]);
      return;
    }
    if (confirm !== draft.password) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await post("/api/auth/register", {
        ...result.value,
        confirmPassword: confirm,
      });
      setCreated(result.value.username);
      setError("");
      setDraft(blankAccount);
      setConfirm("");
    } catch (error) {
      setError(error.message);
      if (error.status === 403) setEnabled(false);
    } finally {
      setBusy(false);
    }
  }
  if (enabled === null)
    return (
      <section className="account-features registration-page card">
        <h1>PLAYER REGISTRATION</h1>
        <p role={policyError ? "alert" : "status"}>
          {policyError || "Loading registration settings…"}
        </p>
        <button className="button" onClick={goLogin}>
          Back to login
        </button>
      </section>
    );
  if (!enabled)
    return (
      <section className="account-features registration-page card">
        <span className="eyebrow">PLAYER REGISTRATION</span>
        <h1>
          REGISTRATION CLOSED<span className="yellow-dot">.</span>
        </h1>
        <p>Your organizer can create an account for you.</p>
        <button className="button" onClick={goLogin}>
          Back to login ↗
        </button>
      </section>
    );
  if (created)
    return (
      <section className="account-features registration-page card">
        <span className="eyebrow">PLAYER REGISTRATION</span>
        <h1>
          YOU'RE ON THE ROSTER<span className="yellow-dot">.</span>
        </h1>
        <p role="status">@{created} was created as a player</p>
        <p>
          Your account is ready. Tournament entry still follows the judge's
          approval process.
        </p>
        <button className="button" onClick={goLogin}>
          Go to login ↗
        </button>
      </section>
    );
  return (
    <section className="account-features registration-page card">
      <span className="eyebrow">/REGISTER · PLAYER ACCESS</span>
      <h1>
        YOUR FIRST MOVE<span className="yellow-dot">.</span>
      </h1>
      <p>Create a player account. Your organizer controls tournament entry.</p>
      <form onSubmit={submit} noValidate>
        <fieldset className="account-fieldset" disabled={busy}>
          <label htmlFor="register-username">
            Username
            <input
              id="register-username"
              autoComplete="username"
              value={draft.username}
              onChange={(e) => {
                setDraft({ ...draft, username: e.target.value });
                setError("");
              }}
              maxLength={32}
            />
          </label>
          <label htmlFor="register-team">
            Team name <span>(optional)</span>
            <input
              id="register-team"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Defaults to your username"
              maxLength={80}
            />
          </label>
          <PasswordField
            id="register-password"
            label="Password"
            value={draft.password}
            onChange={(e) => {
              setDraft({ ...draft, password: e.target.value });
              setError("");
            }}
            placeholder="At least 12 characters"
            autoComplete="new-password"
          />
          <PasswordField
            id="register-confirm"
            label="Confirm password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError("");
            }}
            autoComplete="new-password"
          />
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" type="submit">
            Create player account ↗
          </button>
        </fieldset>
      </form>
      <button className="preview-link" onClick={goLogin}>
        Already have an account? Log in
      </button>
      <p className="registration-demo-note">
        Registration creates a player account. Tournament entry still requires
        organizer approval.
      </p>
    </section>
  );
}
