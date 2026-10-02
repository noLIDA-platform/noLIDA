"use client";

import React from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import "./Button.css";


export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "inverse"
  | "outline-inverse";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  as?: "button" | "link";
  href?: string;
  ariaLabel?: string;
  onClick?: (
    event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => void;
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
  as = "button",
  href,
  ariaLabel,
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

  if (as === "link") {
    if (!href) {
      throw new Error('Button: href is required when as="link".');
    }

    const handleLinkClick = (
      event: React.MouseEvent<HTMLAnchorElement>
    ): void => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    return (
      <Link
        href={href}
        className={classes}
        aria-label={ariaLabel}
        aria-disabled={isDisabled ? "true" : undefined}
        aria-busy={loading ? "true" : undefined}
        onClick={handleLinkClick}
      >
        {loading ? (
          <>
            <Spinner size="sm" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Link>
    );
  }

  const handleButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ): void => {
    onClick?.(event);
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      onClick={handleButtonClick}
      className={classes}
      aria-label={ariaLabel}
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
