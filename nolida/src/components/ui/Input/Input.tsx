"use client";

import React from "react";
import "./Input.css";

export interface InputProps {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Lets callers set correct browser autofill, IME and form semantics. The
   * auth forms rely on `autoComplete="username"` / `"current-password"` so
   * password managers offer the right account.
   */
  name?: string;
  autoComplete?: string;
  inputMode?: "none" | "text" | "decimal" | "email" | "tel" | "url" | "numeric" | "search";
  autoFocus?: boolean;
  /**
   * Hard cap enforced by the browser — a courtesy, not a rule. The server
   * validates the same length again; this only stops the field and the server
   * from silently disagreeing.
   */
  maxLength?: number;
  required?: boolean;
  /**
   * Accessible name for fields that have no visible `label` — an icon-only
   * control in a toolbar, say. Prefer a visible `label` when there is room for
   * one.
   */
  ariaLabel?: string;
  /** For inputs that act on Enter, or need to react on losing focus. */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}

export function Input({
  id: explicitId,
  label,
  error,
  hint,
  type = "text",
  value,
  defaultValue,
  onChange,
  placeholder,
  disabled = false,
  name,
  autoComplete,
  inputMode,
  autoFocus = false,
  maxLength,
  required = false,
  ariaLabel,
  onBlur,
  onKeyDown,
  className,
}: InputProps): React.JSX.Element {
  const generatedId = React.useId();
  const inputId = explicitId || generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const inputClasses = [
    "ui-input",
    error ? "ui-input--error" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="ui-field">
      {label && (
        <label htmlFor={inputId} className="ui-field__label">
          {label}
        </label>
      )}

      {hint && (
        <span id={hintId} className="ui-field__hint">
          {hint}
        </span>
      )}

      <input
        id={inputId}
        type={type}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        autoFocus={autoFocus}
        maxLength={maxLength}
        required={required}
        aria-label={ariaLabel}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className={inputClasses}
      />

      {error && (
        <span id={errorId} role="alert" className="ui-field__error">
          {error}
        </span>
      )}
    </div>
  );
}
