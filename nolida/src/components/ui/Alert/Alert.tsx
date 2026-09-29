import React from "react";
import "./Alert.css";

export type AlertVariant = "error" | "success" | "info";

export interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  /**
   * Live-region role. Defaults to `alert` for errors (announced immediately)
   * and `status` for everything else (announced when the user is idle).
   */
  role?: "alert" | "status";
  className?: string;
}

const DEFAULT_ROLE: Record<AlertVariant, "alert" | "status"> = {
  error: "alert",
  success: "status",
  info: "status",
};

/**
 * Inline message banner for form-level errors, confirmations and notices.
 *
 * Server Component — it renders a live region and nothing interactive. The
 * caller owns when it appears, so this stays a pure presentation primitive.
 *
 * Uses the Phase 1 semantic tint tokens, which already carry dark-mode
 * overrides, so no colour is hardcoded here.
 */
export function Alert({
  variant = "info",
  children,
  role,
  className,
}: AlertProps): React.JSX.Element {
  const classes = ["ui-alert", `ui-alert--${variant}`, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <p className={classes} role={role ?? DEFAULT_ROLE[variant]}>
      {children}
    </p>
  );
}

export default Alert;
