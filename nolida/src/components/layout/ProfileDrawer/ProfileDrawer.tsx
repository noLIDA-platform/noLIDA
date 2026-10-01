"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { DRAWER_SECTIONS } from "@/components/layout/navigation";
import { initialsOf, type ShellUser } from "@/lib/client/shell-user";
import { signOut } from "@/lib/client/auth";
import "./ProfileDrawer.css";

export interface ProfileDrawerProps {
  user: ShellUser;
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE = "a[href], button:not([disabled])";

/**
 * Right-side profile drawer.
 *
 * Opens from the avatar in either top bar and carries the account destinations,
 * the theme row and Sign Out. The drawer renders only while open, so nothing in
 * it is focusable when hidden.
 *
 * While open it locks page scrolling, moves focus to the first control, traps
 * Tab inside the panel and closes on Escape — the same contract `SiteHeader`'s
 * mobile menu already sets, so the app behaves like the marketing site.
 *
 * The theme row is present but disabled: no theme preference is stored or
 * applied anywhere yet, and a toggle that silently does nothing is worse than
 * one that is visibly unavailable.
 */
export function ProfileDrawer({
  user,
  open,
  onClose,
}: ProfileDrawerProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement;
    const overflowBefore = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = (): HTMLElement[] =>
      panelRef.current
        ? Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        : [];

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;

      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowBefore;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      // Only reached if the redirect never happens, e.g. an offline request.
      setIsSigningOut(false);
    }
  };

  return (
    <div
      className="app-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Profile and settings"
    >
      <button
        type="button"
        className="app-drawer__scrim"
        aria-label="Close profile menu"
        onClick={onClose}
      />

      <div ref={panelRef} className="app-drawer__panel">
        <div className="app-drawer__head">
          <div className="app-drawer__identity">
            <span className="app-drawer__avatar" aria-hidden="true">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="app-drawer__avatar-img"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initialsOf(user.displayName)
              )}
            </span>
            <span className="app-drawer__names">
              <span className="app-drawer__name">{user.displayName}</span>
              {user.handle ? (
                <span className="app-drawer__handle">{user.handle}</span>
              ) : null}
            </span>
          </div>

          <button
            type="button"
            className="app-drawer__close"
            aria-label="Close profile menu"
            onClick={onClose}
          >
            <Icon as={X} size={20} />
          </button>
        </div>
        <div className="app-drawer__body" onClick={onClose}>
          {DRAWER_SECTIONS.map((section) => (
            <section key={section.title} className="app-drawer__section">
              <h2 className="app-drawer__section-title">{section.title}</h2>
              <nav aria-label={section.title}>
                <ul className="app-drawer__list">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="app-drawer__link">
                        <Icon as={item.icon} size={18} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </section>
          ))}
        </div>

        <div className="app-drawer__footer">
          <div className="app-drawer__theme">
            <span className="app-drawer__theme-label">Theme</span>
            <button
              type="button"
              role="switch"
              aria-checked="false"
              aria-label="Dark mode (coming soon)"
              disabled
              className="app-drawer__switch"
            >
              <span className="app-drawer__switch-thumb" aria-hidden="true" />
            </button>
          </div>

          <Button
            variant="danger"
            size="sm"
            fullWidth
            loading={isSigningOut}
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}