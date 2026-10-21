import React, { useState } from "react";
export function Symbol({ kind, ...props }) {
  if (kind === "lock")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        {...props}
      >
        <path
          d="M7 3h10v3h2v6h2v10H3V12h2V6h2zm2 3v6h6V6zm2 9v4h2v-4z"
          fillRule="evenodd"
        />
      </svg>
    );
  if (kind === "pencil")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        {...props}
      >
        <path d="M17 2h3v2h2v3l-3 3-5-5zM12 7l5 5L8 21H3v-5zm-7 9v3h3l-3-3z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3 10h3v3h3v3h3v-3h3v-3h3V7h3v6h-3v3h-3v3h-3v3H9v-3H6v-3H3z" />
    </svg>
  );
}
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
  describedBy,
  readOnly = false,
  disabled = false,
  placeholder = "Enter your password",
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className={`password-shell ${error ? "invalid" : ""}`}>
        <input
          disabled={disabled}
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          required
          maxLength={128}
        />
        <button
          disabled={disabled}
          className={`lookout ${visible ? "revealed" : ""}`}
          type="button"
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Reveal ${label.toLowerCase()}`
          }
          aria-controls={id}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <svg
            className="lookout-eye"
            viewBox="0 0 28 24"
            aria-hidden="true"
            shapeRendering="crispEdges"
          >
            <path
              className="eye-shape"
              d="M8 5h12v3h4v3h3v3h-3v3h-4v3H8v-3H4v-3H1v-3h3V8h4z"
            />
            <path
              className="eye-interior"
              d="M9 8h10v3h4v3h-4v3H9v-3H5v-3h4z"
            />
            <g className="eye-iris">
              <path d="M11 8h6v9h-6z" />
              <path d="M12 9h2v3h-2z" fill="#fffdf6" />
            </g>
            <g className="eye-lid">
              <path d="M1 8h4v3h4v2h10v-2h4V8h4v6h-4v3h-4v2H9v-2H5v-3H1z" />
              <path d="M4 14h3v6H4zM12 18h3v5h-3zM21 14h3v6h-3z" />
            </g>
          </svg>
          <span className="lookout-tip">
            {visible ? "Hide password" : "Reveal password"}
          </span>
        </button>
      </div>
    </div>
  );
}
