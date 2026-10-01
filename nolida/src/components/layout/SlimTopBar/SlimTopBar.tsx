import Link from "next/link";
import { Logo } from "@/components/brand/Logo/Logo";
import { Button } from "@/components/ui/Button/Button";
import { Link as UiLink } from "@/components/ui/Link/Link";
import "./SlimTopBar.css";

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

/**
 * Slim 56px navigation bar for the auth/login screen.
 *
 * The marketing pages keep the full `SiteHeader`; this bar exists because the
 * login screen must not compete with the form for vertical space.
 *
 * Server Component: the link row simply hides below 768px rather than
 * collapsing into a drawer, so there is no state here to justify "use client".
 * A call to action stays visible at every width.
 */
export function SlimTopBar({ className }: { className?: string }) {
  const classes = ["slim-top-bar", className ?? ""].filter(Boolean).join(" ");

  return (
    <header className={classes}>
      <div className="slim-top-bar__inner">
        <Link
          href="/"
          className="slim-top-bar__brand"
          aria-label="noLIDA home"
        >
          <Logo size="sm" showWordmark={false} />
          <span className="slim-top-bar__wordmark">noLIDA</span>
        </Link>

        <nav className="slim-top-bar__nav" aria-label="Primary">
          {NAV_LINKS.map((item) => (
            <UiLink key={item.href} href={item.href} variant="muted">
              {item.label}
            </UiLink>
          ))}
        </nav>

        {/* Two CTAs, toggled by width. On wide screens the nav row already
            reaches the marketing pages, so the CTA pushes sign-up. Below
            768px the nav is hidden, so the CTA has to carry the marketing
            path instead — sign-up stays reachable from the login form's own
            "Create one" footer link. */}
        <Button
          as="link"
          href="/signup"
          size="sm"
          className="slim-top-bar__cta slim-top-bar__cta--wide"
        >
          Get started
        </Button>

        <Button
          as="link"
          href="/how-it-works"
          size="sm"
          variant="secondary"
          className="slim-top-bar__cta slim-top-bar__cta--narrow"
        >
          Explore
        </Button>
      </div>
    </header>
  );
}

export default SlimTopBar;
