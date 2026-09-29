import SlimTopBar from "@/components/layout/SlimTopBar/SlimTopBar";
import "./auth.css";

/**
 * Shared chrome for every auth screen.
 *
 * Deliberately slimmer than the marketing layout: a 56px bar instead of the
 * full SiteHeader/SiteFooter, because on these screens the form is the point
 * and vertical space is scarce. The marketing pages stay reachable from the
 * bar's link row (>=768px) and from the site footer elsewhere.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-shell">
      <SlimTopBar />
      <main className="auth-shell__main">{children}</main>
    </div>
  );
}
