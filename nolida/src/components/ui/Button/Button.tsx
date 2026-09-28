"use client";

import React from "react";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import "./Button.css";


export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  type = "button",
  onClick,
  children,
  className,
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;

  const classes = [
    "ui-button",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    fullWidth ? "ui-button--full-width" : "",
    isDisabled ? "ui-button--disabled" : "",
    loading ? "ui-button--loading" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      onClick={onClick}
      className={classes}
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
