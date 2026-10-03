import Link from "next/link";
import { Logo } from "@/components/brand/Logo/Logo";
import { Button } from "@/components/ui/Button/Button";
import { Link as UiLink } from "@/components/ui/Link/Link";
import SiteFooter from "@/components/layout/SiteFooter/SiteFooter";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import "./public.css";

/**
 * The `(public)` route group: pages anyone may read without the app shell.
 *
 * Phase 8B puts `/business/[slug]` and `/categories/[slug]` here. They are
 * NOT in `(marketing)` — those pages get the full nav and marketing chrome —
 * and NOT in `(main)` — those require a session. What a public profile needs
 * is smaller: the wordmark, a way in (or back), and the footer.
 *
 * The header is a Server Component that reads the session directly, so the
 * signed-in variant ("Back to noLIDA") is decided on the server. No client
 * fetch, no flash of the wrong buttons.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSessionUser();

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header__inner">
          <Link href="/" className="public-header__brand" aria-label="noLIDA home">
            <Logo size="sm" />
          </Link>

          <nav className="public-header__actions" aria-label="Account">
            {session ? (
              <Button as="link" href="/home" size="sm" variant="secondary">
                Back to noLIDA
              </Button>
            ) : (
              <>
                <UiLink href="/login" variant="muted">
                  Log in
                </UiLink>
                <Button as="link" href="/signup" size="sm">
                  Sign up
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="public-main">{children}</main>

      <SiteFooter />
    </div>
  );
}
