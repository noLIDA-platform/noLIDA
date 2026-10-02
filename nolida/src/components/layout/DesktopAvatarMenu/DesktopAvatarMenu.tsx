"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { ICON_MAP } from "@/lib/nav/icon-map";
import { AVATAR_MENU_SECTIONS } from "@/lib/nav/items";
import { signOut } from "@/lib/client/auth";
import type { ShellUser } from "@/lib/client/shell-user";
import "./DesktopAvatarMenu.css";

export interface DesktopAvatarMenuProps {
  user: ShellUser;
  isOpen: boolean;
  onClose: () => void;
  ownsBusiness: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export function DesktopAvatarMenu({
  user,
  isOpen,
  onClose,
  ownsBusiness: _ownsBusiness,
  triggerRef,
}: DesktopAvatarMenuProps): React.JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpen.current) {
        wasOpen.current = false;
        triggerRef.current?.focus();
      }
      return;
    }

    wasOpen.current = true;
    menuRef.current?.querySelector<HTMLElement>("[data-first-menu-item]")?.focus();

    const onPointerDown = (event: PointerEvent): void => {
      if (!(event.target instanceof Node)) return;
      if (menuRef.current?.contains(event.target)) return;
      if (triggerRef.current?.contains(event.target)) return;
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  }

  return (
    <div
      ref={menuRef}
      className="desktop-avatar-menu"
      role="menu"
      aria-label="Account menu"
    >
      <div className="desktop-avatar-menu__identity">
        <Avatar src={user.avatarUrl} name={user.displayName} size="md" />
        <div className="desktop-avatar-menu__user-text">
          <span className="desktop-avatar-menu__name">{user.displayName}</span>
          {user.handle ? <span className="desktop-avatar-menu__handle">{user.handle}</span> : null}
        </div>
        <Link
          href="/settings/account"
          className="desktop-avatar-menu__edit"
          role="menuitem"
          data-first-menu-item
          onClick={onClose}
        >
          Edit profile
        </Link>
      </div>

      <div className="desktop-avatar-menu__sections">
        {AVATAR_MENU_SECTIONS.map((section, sectionIndex) => (
          <nav
            key={sectionIndex}
            className="desktop-avatar-menu__section"
            aria-label={`Account section ${sectionIndex + 1}`}
          >
            {section.map((item) => {
              const ItemIcon = ICON_MAP[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="desktop-avatar-menu__item"
                  role="menuitem"
                  onClick={onClose}
                >
                  {ItemIcon ? <Icon as={ItemIcon} size={20} /> : null}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        ))}
      </div>

      <div className="desktop-avatar-menu__footer">
        <Button
          type="button"
          variant="danger"
          size="sm"
          fullWidth
          loading={isSigningOut}
          onClick={handleSignOut}
        >
          <Icon as={ICON_MAP.LogoutIcon} size={18} />
          <span>Sign out</span>
        </Button>
      </div>
    </div>
  );
}