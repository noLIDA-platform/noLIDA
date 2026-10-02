"use client";

import { AvatarButton } from "@/components/layout/AvatarButton/AvatarButton";
import { NotificationButton } from "@/components/layout/NotificationButton/NotificationButton";
import { CartButton } from "@/components/layout/CartButton/CartButton";
import type { TopBarProps } from "@/components/layout/TopBarMobile/TopBarMobile";
import "./TopBarDesktop.css";

/**
 * Top bar for desktop (≥1024px): search centred and account cluster right.
 *
 * The search field is a plain GET form to `/discover`, so it works without
 * JavaScript and without a client-side router call; `/discover` reads `?q=`.
 *
 * The shared `.app-topbar` / `.app-icon-button` rules live in `AppShell.css`.
 */
export function TopBarDesktop({
  user,
  onProfileClick,
  profileExpanded,
  className,
}: TopBarProps): React.JSX.Element {
  const classes = ["app-topbar", "app-topbar--desktop", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classes}>
      <div className="app-topbar__inner">
        <form action="/discover" className="app-topbar__search" role="search">
          <input
            type="search"
            name="q"
            placeholder="Search posts and people"
            aria-label="Search noLIDA"
            className="app-topbar__field"
          />
        </form>

        <div className="app-topbar__cluster">
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