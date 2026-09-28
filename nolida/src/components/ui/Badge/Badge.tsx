import React from "react";
import "./Badge.css";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "brand";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps): React.JSX.Element {
  const variantClass = `ui-badge--${variant}`;
  const combinedClassName = className
    ? `ui-badge ${variantClass} ${className}`
    : `ui-badge ${variantClass}`;

  return <span className={combinedClassName}>{children}</span>;
}
