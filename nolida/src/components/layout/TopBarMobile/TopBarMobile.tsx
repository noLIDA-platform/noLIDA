"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo/Logo";
import { Icon } from "@/components/ui/Icon/Icon";
import { AvatarButton } from "@/components/layout/AvatarButton/AvatarButton";
import { NotificationButton } from "@/components/layout/NotificationButton/NotificationButton";
import { CartButton } from "@/components/layout/CartButton/CartButton";
import type { ShellUser } from "@/lib/client/shell-user";
import "./TopBarMobile.css";

export interface TopBarProps {
  user: ShellUser;
  /** Opens the profile drawer. */
  onProfileClick: () => void;
  /** Whether the profile drawer is open, for `aria-expanded`. */
  profileExpanded: boolean;
  className?: string;
}

/**
 * Top bar for phones (<1024px): wordmark left, search as an icon, then the
 * account cluster.
 *
 * Search is a link rather than a field here. A text box 320px wide invites
 * typing that the discovery screen cannot honour yet, and the icon costs one
 * tap less than a disabled input.
 *
 * The shared `.app-topbar` / `.app-icon-button` rules live in `AppShell.css`,
 * which the shell that renders this bar already imports.
 */
export function TopBarMobile({
  user,
  onProfileClick,
  profileExpanded,
  className,
}: TopBarProps): React.JSX.Element {
  const classes = ["app-topbar", "app-topbar--mobile", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classes}>
      <div className="app-topbar__inner">
        <Link href="/home" className="app-topbar__brand" aria-label="noLIDA home">
          <Logo size="sm" />
        </Link>

        <div className="app-topbar__cluster">
          <Link
            href="/discover"
            className="app-icon-button"
            aria-label="Search noLIDA"
          >
            <Icon as={Search} size={20} />
          </Link>

          <NotificationButton />
          <CartButton />
          <AvatarButton
            user={user}
            onClick={onProfileClick}
            expanded={profileExpanded}
          />
        </div>
      </div>
    </header>
  );
}