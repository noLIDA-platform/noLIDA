import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomeDashboard } from "@/components/app/HomeDashboard/HomeDashboard";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { toShellUser } from "@/lib/client/shell-user";

export const metadata: Metadata = {
  title: "Home",
  description: "Pick up where you left off on noLIDA.",
};

/**
 * `/home` — the destination after sign-in, and what `/` sends a signed-in
 * visitor to.
 *
 * The `(main)` layout already refused anyone without a session; the check is
 * repeated here because the page needs the value itself, and because a page that
 * renders a name must not rely on a parent having done its job.
 */
export default async function HomePage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  return <HomeDashboard user={toShellUser(session)} />;
}