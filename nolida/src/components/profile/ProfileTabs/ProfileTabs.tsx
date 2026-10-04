import Link from "next/link";
import {
  PROFILE_TABS,
  PROFILE_TAB_LABELS,
  type ProfileTab,
} from "@/lib/profile/types";
import "./ProfileTabs.css";

export interface ProfileTabsProps {
  activeTab: ProfileTab;
  isOwnProfile: boolean;
  /** Null on your own profile, whose base path is `/profile`. */
  username: string | null;
}

/**
 * The profile tab bar.
 *
 * A Server Component of plain links, and deliberately not a client component with
 * `useState`. The active tab lives in the `?tab=` query parameter, so:
 *
 * - it survives a refresh, which client state does not;
 * - it can be linked to and shared, which client state cannot;
 * - it works before — or entirely without — hydration.
 *
 * Navigation that needs JavaScript to have happened is navigation that has not
 * happened yet. A tab bar is four links; it does not need a framework.
 */
export function ProfileTabs({
  activeTab,
  isOwnProfile,
  username,
}: ProfileTabsProps): React.JSX.Element {
  const base = isOwnProfile ? "/profile" : `/user/${username}`;

  // "Saved" is yours alone. Offering it on someone else's profile would show a
  // tab that is always empty and invite a question we cannot answer.
  const tabs = PROFILE_TABS.filter((tab) => tab !== "saved" || isOwnProfile);

  return (
    <nav className="profile-tabs" aria-label="Profile sections">
      <ul className="profile-tabs__list">
        {tabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <li key={tab} className="profile-tabs__item">
              <Link
                href={`${base}?tab=${tab}`}
                className={[
                  "profile-tabs__link",
                  active ? "profile-tabs__link--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {PROFILE_TAB_LABELS[tab]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}