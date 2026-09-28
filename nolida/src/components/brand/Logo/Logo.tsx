import Image from "next/image";
import "./Logo.css";

export type LogoSize = "sm" | "md" | "lg";
export type LogoVariant = "default" | "mono-light" | "mono-dark";

export interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  showWordmark?: boolean;
  className?: string;
}

const ICON_PX: Record<LogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 48,
};

/**
 * noLIDA brand lockup: the app icon plus the "noLIDA" wordmark.
 * Server Component — no interactivity of its own. Wrap it in a Link when it
 * needs to navigate (see SiteHeader).
 */
export function Logo({
  size = "md",
  variant = "default",
  showWordmark = true,
  className,
}: LogoProps): React.JSX.Element {
  const iconPx = ICON_PX[size];
  const classes = ["logo", `logo--${size}`, `logo--${variant}`, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      {/* Decorative: the wordmark carries the accessible name when shown, and
          the wrapping link carries it when the wordmark is hidden. */}
      <Image
        src="/branding/logo-app-icon-512.png"
        alt=""
        width={iconPx}
        height={iconPx}
        className="logo__icon"
      />
      {showWordmark ? <span className="logo__wordmark">noLIDA</span> : null}
    </span>
  );
}

export default Logo;
