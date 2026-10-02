"use client";

import { TopBarMobile } from "@/components/layout/TopBarMobile/TopBarMobile";
import { TopBarDesktop } from "@/components/layout/TopBarDesktop/TopBarDesktop";
import type { ShellUser } from "@/lib/client/shell-user";

/**
 * The one client island of the app shell: the two top bars plus the profile
 * drawer, and the single piece of state they share — whether the drawer is
 * open.
 *
 * The bars and the drawer are separate components but must agree on that one
 * boolean (the avatar needs `aria-expanded`, the panel needs to exist), so the
 * state lives in the closest component that owns both. Everything else in the
 * shell stays a Server Component.
 */
export function AppShellChrome({
  user,
  ownsBusiness,
}: {
  user: ShellUser;
  ownsBusiness: boolean;
}): React.JSX.Element {
  return (
    <>
      <TopBarMobile user={user} ownsBusiness={ownsBusiness} />
      <TopBarDesktop user={user} ownsBusiness={ownsBusiness} />
    </>
  );
}