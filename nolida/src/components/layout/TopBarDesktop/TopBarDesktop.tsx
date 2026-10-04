"use client";

import { useCallback, useRef, useState } from "react";
import { AvatarButton } from "@/components/layout/AvatarButton/AvatarButton";
import { DesktopAvatarMenu } from "@/components/layout/DesktopAvatarMenu/DesktopAvatarMenu";
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
  ownsBusiness,
  className,
}: TopBarProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
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
            aria-label="Search NOlida"
            className="app-topbar__field"
          />
        </form>

        <div className="app-topbar__cluster">
          <NotificationButton />
          <CartButton />
          <AvatarButton
            user={user}
            onClick={toggleMenu}
            isOpen={menuOpen}
            popupType="menu"
            buttonRef={avatarRef}
          />
        </div>
      </div>
      <DesktopAvatarMenu
        user={user}
        ownsBusiness={ownsBusiness}
        isOpen={menuOpen}
        onClose={closeMenu}
        triggerRef={avatarRef}
      />
    </header>
  );
}