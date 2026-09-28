import React from "react";
import "./Spinner.css";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps): React.JSX.Element {
  const sizeClass = `ui-spinner--${size}`;
  const combinedClassName = className ? `ui-spinner ${sizeClass} ${className}` : `ui-spinner ${sizeClass}`;

  return (
    <span
      className={combinedClassName}
      role="status"
      aria-label="Loading"
    />
  );
}
