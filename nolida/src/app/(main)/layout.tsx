import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell/AppShell";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness } from "@/lib/server/services/business.service";
import { toShellUser } from "@/lib/client/shell-user";
import "./pages.css";

/**
 * Reading the session cookie already makes every page in this group dynamic;
 * saying so explicitly keeps a future static export from quietly caching one
 * person's shell and serving it to everyone.
 */
export const dynamic = "force-dynamic";

/**
 * The gate and the frame for the whole signed-in app.
 *
 * The guard lives here, in one place, rather than in each page. A page cannot
 * forget to check, because it never renders without this layout having checked.
 *
 * Anyone without a live session for an ACTIVE account is sent to `/`, which is
 * the sign-in screen. `/home` is the default destination once they are back.
 * Nothing is rendered while the session is being looked up, so a slow database
 * shows Next.js's loading boundary rather than a flash of an empty shell.
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");
  const business = await getMyBusiness(session.user.id);
  const ownsBusiness = business?.status === "APPROVED";

  return (
    <AppShell user={toShellUser(session)} ownsBusiness={ownsBusiness}>
      {children}
    </AppShell>
  );
}