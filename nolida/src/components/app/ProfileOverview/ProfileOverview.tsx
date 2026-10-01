import Link from "next/link";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import { Receipt, Settings, Sparkles, Wallet } from "lucide-react";
import { initialsOf, type ShellUser } from "@/lib/client/shell-user";
import "./ProfileOverview.css";

export interface ProfileOverviewProps {
  user: ShellUser;
  emailVerified: boolean;
  phoneVerified: boolean;
  /** Pre-formatted on the server so the locale stays deterministic. */
  memberSince: string;
  className?: string;
}

/**
 * `/profile` — a user's own profile, the only screen besides `/home` with real
 * content in Phase 5A.
 *
 * The name, handle and verification state come from the session on the server;
 * the avatar falls back to initials because photo upload does not exist yet.
 *
 * What is *not* here is the point: no post grid, no follower counts, no
 * earnings. Posts arrive with Phase 7 and money with the wallet phase, so those
 * areas are one honest empty state rather than a row of zeros that a user would
 * read as a bug in their own account.
 */
export function ProfileOverview({
  user,
  emailVerified,
  phoneVerified,
  memberSince,
  className,
}: ProfileOverviewProps): React.JSX.Element {
  const classes = ["mp-page", "app-profile", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <h1 className="mp-title">Profile</h1>

      <section className="app-profile__card">
        <div className="app-profile__head">
          <span className="app-profile__avatar" aria-hidden="true">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="app-profile__avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              initialsOf(user.displayName)
            )}
          </span>

          <div className="app-profile__identity">
            <h2 className="app-profile__name">{user.displayName}</h2>
            {user.handle ? (
              <p className="app-profile__handle">{user.handle}</p>
            ) : null}
            <p className="app-profile__meta">Member since {memberSince}</p>
          </div>
        </div>

        <div className="app-profile__badges">
          <Badge variant={emailVerified ? "success" : "warning"}>
            {emailVerified ? "Email verified" : "Email not verified"}
          </Badge>
          <Badge variant={phoneVerified ? "success" : "default"}>
            {phoneVerified ? "Phone verified" : "Phone not linked"}
          </Badge>
        </div>

        <div className="app-profile__actions">
          <Button as="link" href="/settings" size="sm">
            <Icon as={Settings} size={16} />
            <span>Edit profile</span>
          </Button>
        </div>
      </section>

      <section className="app-profile__card">
        <EmptyState
          icon={<Icon as={Sparkles} size={28} />}
          title="No posts yet"
          description="Posts, followers and your activity summary appear here once publishing opens up in a later phase."
        />
      </section>

      <nav className="app-profile__quick" aria-label="Quick links">
        <Link href="/wallet" className="app-profile__quick-link">
          <Icon as={Wallet} size={18} />
          <span>Wallet</span>
        </Link>
        <Link href="/orders" className="app-profile__quick-link">
          <Icon as={Receipt} size={18} />
          <span>Orders</span>
        </Link>
        <Link href="/settings" className="app-profile__quick-link">
          <Icon as={Settings} size={18} />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}