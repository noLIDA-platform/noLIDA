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
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
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
