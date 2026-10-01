"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Logo } from "@/components/brand/Logo/Logo";
import { Button } from "@/components/ui/Button/Button";
import { Link as UiLink } from "@/components/ui/Link/Link";
import { Icon } from "@/components/ui/Icon/Icon";
import "./SiteHeader.css";

interface NavItem {
  readonly label: string;
  readonly href: string;
}

const NAV_LINKS: readonly NavItem[] = [
  { label: "Explore", href: "/explore" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "For Business", href: "/for-business" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

const DESKTOP_QUERY = "(min-width: 1024px)";
const FOCUSABLE = "a[href], button:not([disabled])";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the drawer automatically once the viewport is wide enough for the
  // inline navigation, so the overlay can never linger on resize.
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event: MediaQueryListEvent): void => {
      if (event.matches) setMenuOpen(false);
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  // While open: lock scrolling, move focus into the panel, trap Tab, and
  // close on Escape. Restoring focus happens in the cleanup.
  useEffect(() => {
    if (!menuOpen) return;

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
        setMenuOpen(false);
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
  }, [menuOpen]);

  const menuId = "site-navigation";

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand" aria-label="noLIDA home">
          <Logo size="md" />
        </Link>

        <nav className="site-header__nav" aria-label="Primary">
          {NAV_LINKS.map((item) => (
            <UiLink key={item.href} href={item.href} variant="muted">
              {item.label}
            </UiLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <UiLink href="/login" variant="muted">
            Log in
          </UiLink>
          <Button as="link" href="/signup" size="sm">
            Get started
          </Button>
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="site-header__toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-controls={menuId}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="site-header__bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {menuOpen ? (
        <div
          className="site-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <button
            type="button"
            className="site-drawer__scrim"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div ref={panelRef} className="site-drawer__panel">
            <div className="site-drawer__head">
              <Logo size="sm" />
              <button
                type="button"
                className="site-drawer__close"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <Icon as={X} size={20} />
              </button>
            </div>

            <nav
              id={menuId}
              className="site-drawer__nav"
              aria-label="Mobile"
              onClick={() => setMenuOpen(false)}
            >
              {NAV_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="site-drawer__link">
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="site-drawer__actions">
              <UiLink href="/login" variant="muted">
                Log in
              </UiLink>
              <Button as="link" href="/signup" size="sm" fullWidth>
                Get started
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
