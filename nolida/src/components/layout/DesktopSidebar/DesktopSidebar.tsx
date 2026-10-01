"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo/Logo";
import { Icon } from "@/components/ui/Icon/Icon";
import { SIDEBAR_NAV } from "@/components/layout/navigation";
import "./DesktopSidebar.css";

/**
 * Desktop sidebar (≥1024px), fixed 260px.
 *
 * Hidden entirely below 1024px rather than collapsed to an icon rail: an icon
 * rail without labels is a guessing game, and the bottom nav already covers
 * small screens.
 */
export function DesktopSidebar({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const pathname = usePathname();
  const classes = ["app-sidebar", className ?? ""].filter(Boolean).join(" ");

  const isActive = (href: string): boolean =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className={classes}>
      <div className="app-sidebar__brand">
        <Link href="/home" aria-label="noLIDA home">
          <Logo size="md" />
        </Link>
      </div>

      <nav className="app-sidebar__nav" aria-label="Sidebar">
        <ul className="app-sidebar__list">
          {SIDEBAR_NAV.map((item) => {
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "app-sidebar__link",
                    active ? "app-sidebar__link--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Icon as={item.icon} size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="app-sidebar__note">
        Balances, orders and messages arrive in later phases. The screens are
        already where they will live.
      </p>
    </aside>
  );
}