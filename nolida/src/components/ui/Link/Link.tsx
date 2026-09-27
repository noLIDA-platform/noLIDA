import React from "react";
import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import "./Link.css";

export type LinkVariant = "default" | "muted";

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps>, NextLinkProps {
  variant?: LinkVariant;
  children: React.ReactNode;
  className?: string;
}

export function Link({
  variant = "default",
  href,
  children,
  className,
  ...rest
}: LinkProps): React.JSX.Element {
  const variantClass = `ui-link--${variant}`;
  const combinedClassName = className
    ? `ui-link ${variantClass} ${className}`
    : `ui-link ${variantClass}`;

  return (
    <NextLink href={href} className={combinedClassName} {...rest}>
      {children}
    </NextLink>
  );
}
