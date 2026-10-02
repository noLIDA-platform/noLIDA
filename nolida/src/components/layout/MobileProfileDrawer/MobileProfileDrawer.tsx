"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { MOBILE_DRAWER_SECTIONS } from "@/lib/nav/items";
import { resolveNavIcon } from "@/lib/nav/icon-map";
import { initialsOf, type ShellUser } from "@/lib/client/shell-user";
import { signOut } from "@/lib/client/auth";
import "./MobileProfileDrawer.css";

export interface MobileProfileDrawerProps {
  user: ShellUser;
  open: boolean;
  onClose: () => void;
  ownsBusiness: boolean;
}

const FOCUSABLE = "a[href], button:not([disabled])";
const SECTION_TITLES = ["Activity", "Growth", "Business", "Account"];

export function MobileProfileDrawer({
  user,
  open,
  onClose,
  ownsBusiness,
}: MobileProfileDrawerProps): React.JSX.Element | null {
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
              <Link href="/settings/account" className="app-drawer__edit" onClick={onClose}>
                Edit profile
              </Link>
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
          {MOBILE_DRAWER_SECTIONS.map((section, sectionIndex) => {
            const items = section.filter((item) => !item.ownerOnly || ownsBusiness);
            if (items.length === 0) return null;
            const title = SECTION_TITLES[sectionIndex] ?? "More";

            return (
              <section key={title} className="app-drawer__section">
                <h2 className="app-drawer__section-title">{title}</h2>
                <nav aria-label={title}>
                  <ul className="app-drawer__list">
                    {items.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="app-drawer__link">
                          <Icon as={resolveNavIcon(item.icon)} size={18} />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </section>
            );
          })}
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