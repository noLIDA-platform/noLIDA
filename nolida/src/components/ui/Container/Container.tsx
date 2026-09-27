import React from "react";
import "./Container.css";

export type ContainerSize = "sm" | "md" | "lg" | "full";

export interface ContainerProps {
  size?: ContainerSize;
  children: React.ReactNode;
  className?: string;
}

export function Container({
  size = "lg",
  children,
  className,
}: ContainerProps): React.JSX.Element {
  const sizeClass = `ui-container--${size}`;
  const combinedClassName = className
    ? `ui-container ${sizeClass} ${className}`
    : `ui-container ${sizeClass}`;

  return <div className={combinedClassName}>{children}</div>;
}
