import React from "react";
import "./Card.css";

export type CardVariant = "default" | "elevated";

export interface CardProps {
  variant?: CardVariant;
  as?: "div" | "article" | "section" | "aside" | "main";
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({
  variant = "default",
  as: Component = "div",
  children,
  className,
  style,
}: CardProps): React.JSX.Element {
  const variantClass = `ui-card--${variant}`;
  const combinedClassName = className
    ? `ui-card ${variantClass} ${className}`
    : `ui-card ${variantClass}`;

  return (
    <Component className={combinedClassName} style={style}>
      {children}
    </Component>
  );
}

