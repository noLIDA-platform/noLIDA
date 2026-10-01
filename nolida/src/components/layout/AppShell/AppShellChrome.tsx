"use client";

import { useCallback, useState } from "react";
import { TopBarMobile } from "@/components/layout/TopBarMobile/TopBarMobile";
import { TopBarDesktop } from "@/components/layout/TopBarDesktop/TopBarDesktop";
import { ProfileDrawer } from "@/components/layout/ProfileDrawer/ProfileDrawer";
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
}: {
  user: ShellUser;
}): React.JSX.Element {
  const [profileOpen, setProfileOpen] = useState(false);

  const openProfile = useCallback(() => setProfileOpen(true), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);

  return (
    <>
      <TopBarMobile
        user={user}
        onProfileClick={openProfile}
        profileExpanded={profileOpen}
      />
      <TopBarDesktop
        user={user}
        onProfileClick={openProfile}
        profileExpanded={profileOpen}
      />
      <ProfileDrawer user={user} open={profileOpen} onClose={closeProfile} />
    </>
  );
}