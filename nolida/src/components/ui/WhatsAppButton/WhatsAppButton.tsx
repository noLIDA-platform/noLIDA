import React from "react";
import { buildWhatsAppHref } from "@/lib/support/whatsapp";
import { WhatsAppIcon } from "./WhatsAppIcon";
import "./WhatsAppButton.css";

export interface WhatsAppButtonProps {
  message: string;
  label: string;
  className?: string;
  inverse?: boolean;
  size?: "sm" | "md";
}

export function WhatsAppButton({
  message,
  label,
  className,
  inverse = false,
  size = "md",
}: WhatsAppButtonProps): React.JSX.Element {
  const baseHref = buildWhatsAppHref(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP);
  const href = baseHref
    ? `${baseHref}${baseHref.includes("?") ? "&" : "?"}text=${encodeURIComponent(message)}`
    : null;
  const classes = [
    "ui-whatsapp-button",
    `ui-whatsapp-button--${size}`,
    inverse ? "ui-whatsapp-button--inverse" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!href) {
    return (
      <button
        type="button"
        className={classes}
        aria-label={label}
        title="WhatsApp not configured"
        disabled
      >
        <WhatsAppIcon size={size === "sm" ? 18 : 22} />
      </button>
    );
  }

  return (
    <a
      className={classes}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
    >
      <WhatsAppIcon size={size === "sm" ? 18 : 22} />
    </a>
  );
}