import { AppShellChrome } from "@/components/layout/AppShell/AppShellChrome";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav/MobileBottomNav";
import type { ShellUser } from "@/lib/client/shell-user";
import "./AppShell.css";

export interface AppShellProps {
  user: ShellUser;
  children: React.ReactNode;
  className?: string;
}

/**
 * The frame every signed-in page renders inside: sidebar, top bar, content,
 * bottom nav.
 *
 * A Server Component. Only the bars and the drawer are a client island — see
 * `AppShellChrome` — so page content stays on the server.
 *
 * This is layout only and enforces nothing. The guard is the `redirect()` in
 * `(main)/layout.tsx`; a shell that merely looks authenticated is worse than no
 * shell, because it reads as safe.
 */
export function AppShell({
  user,
  children,
  className,
}: AppShellProps): React.JSX.Element {
  const classes = ["app-shell", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <DesktopSidebar />
      <AppShellChrome user={user} />
      <main className="app-shell__main">{children}</main>
      <MobileBottomNav />
    </div>
  );
}