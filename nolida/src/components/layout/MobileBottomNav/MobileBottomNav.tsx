"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CREATE_HREF, MOBILE_NAV } from "@/components/layout/navigation";
import { Icon } from "@/components/ui/Icon/Icon";
import "./MobileBottomNav.css";

/**
 * Bottom navigation, mobile only (<1024px).
 *
 * Active state comes from the pathname, not from a click handler: a deep link
 * or a browser back gesture must land with the right tab lit. A tab is active
 * for its own route and anything beneath it, so `/profile/handle` still reads
 * as Profile.
 *
 * Create is centred and filled so it survives one-handed use, and it stays a
 * real link rather than a modal trigger — there is no post composer yet.
 */
export function MobileBottomNav({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const pathname = usePathname();
  const classes = ["app-bottom-nav", className ?? ""].filter(Boolean).join(" ");

  const isActive = (href: string): boolean =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className={classes} aria-label="Primary">
      <ul className="app-bottom-nav__list">
        {MOBILE_NAV.map((item) => {
          const active = isActive(item.href);
          const isCreate = item.href === CREATE_HREF;

          return (
            <li key={item.href} className="app-bottom-nav__item">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "app-bottom-nav__link",
                  active ? "app-bottom-nav__link--active" : "",
                  isCreate ? "app-bottom-nav__link--create" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Icon as={item.icon} size={isCreate ? 22 : 20} />
                <span className="app-bottom-nav__label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}