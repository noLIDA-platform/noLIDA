"use client";

import React from "react";
import "../Input/Input.css";
import "./Textarea.css";

export interface TextareaProps {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
  value?: string;
  defaultValue?: string;
  rows?: number;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Textarea({
  id: explicitId,
  label,
  error,
  hint,
  value,
  defaultValue,
  rows = 4,
  onChange,
  placeholder,
  disabled = false,
  className,
}: TextareaProps): React.JSX.Element {
  const generatedId = React.useId();
  const textareaId = explicitId || generatedId;
  const hintId = hint ? `${textareaId}-hint` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;

  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const textareaClasses = [
    "ui-textarea",
    error ? "ui-textarea--error" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="ui-field">
      {label && (
        <label htmlFor={textareaId} className="ui-field__label">
          {label}
        </label>
      )}

      {hint && (
        <span id={hintId} className="ui-field__hint">
          {hint}
        </span>
      )}

      <textarea
        id={textareaId}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className={textareaClasses}
      />

      {error && (
        <span id={errorId} role="alert" className="ui-field__error">
          {error}
        </span>
      )}
    </div>
  );
}
