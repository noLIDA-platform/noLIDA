"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MY_BUSINESS_TABS } from "@/lib/nav/items";
import "./MyBusinessTabs.css";

export interface MyBusinessTabsProps {
  className?: string;
}

/**
 * Is `href` the page we are on, or a child of it?
 *
 * Exact match for `/my-business` — without it the Overview tab would light up
 * on every sub-page, since every one of them starts with `/my-business/`. The
 * prefix arm needs the trailing slash so `/my-business` does not also match
 * `/my-business/services`.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/my-business") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * My Business navigation — a horizontal tab bar, not a second sidebar.
 *
 * ## Why tabs and not a sidebar
 *
 * The app already has one: `DesktopSidebar` carries Home/Discover/Create and
 * everything else. A second vertical rail inside the content area would put
 * two competing navigation columns side by side, and on a laptop the My
 * Business one would be squeezed into whatever width the main column had left.
 * A tab bar reads as "sections of this one thing", which is what it is.
 *
 * It scrolls horizontally on a phone and wraps on a wide screen — sixteen tabs
 * will not fit in one row at any width, so the honest behaviour is to let them
 * move rather than to hide most of them behind a menu nobody would find.
 *
 * The active tab comes from `usePathname`, not from a prop: the server page
 * would have to re-derive the route it just rendered, and this component is
 * already on the client where the answer is free.
 */
export function MyBusinessTabs({
  className,
}: MyBusinessTabsProps): React.JSX.Element {
  const pathname = usePathname();

  const classes = ["my-biz-tabs", className ?? ""].filter(Boolean).join(" ");

  return (
    <nav className={classes} aria-label="My Business">
      <ul className="my-biz-tabs__list">
        {MY_BUSINESS_TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={[
                  "my-biz-tabs__tab",
                  active ? "my-biz-tabs__tab--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
                {tab.placeholder ? (
                  <span className="my-biz-tabs__soon" aria-hidden="true" />
                ) : null}
                {/* "Soon" needs a text form for assistive tech — a bare dot
                    is decoration, and the link's own href already says the
                    route exists. `sr-only` is the existing utility for this
                    in `styles/utilities.css`. */}
                {tab.placeholder ? (
                  <span className="sr-only"> (coming soon)</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
