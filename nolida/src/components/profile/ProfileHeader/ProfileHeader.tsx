import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Store,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { FollowButton } from "@/components/profile/FollowButton/FollowButton";
import { ShareProfileButton } from "@/components/profile/ShareProfileButton/ShareProfileButton";
import type {
  ProfileBusinessCard,
  ProfileCard,
  ProfileStatsCard,
} from "@/lib/profile/types";
import "./ProfileHeader.css";

export interface ProfileHeaderProps {
  profile: ProfileCard;
  stats: ProfileStatsCard;
  isOwnProfile: boolean;
  isFollowing: boolean;
  business: ProfileBusinessCard | null;
}

/**
 * Abbreviate a count the way a profile does — 940, 1.2K, 3.4M.
 *
 * The exact number never disappears: it stays in the `title` and in the
 * accessible name, so "1.2K" is a summary rather than a replacement. A rounded
 * number that is also the only number is a number nobody can trust.
 */
export function formatProfileCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const thousands = value / 1000;
    return `${thousands < 10 ? thousands.toFixed(1) : Math.round(thousands)}K`;
  }
  const millions = value / 1_000_000;
  return `${millions < 10 ? millions.toFixed(1) : Math.round(millions)}M`;
}

/** "March 2026", fixed locale so an account reads the same in every browser. */
function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/** Best available place name. Never invents one out of the other field. */
function formatLocation(profile: ProfileCard): string | null {
  const parts = [profile.city, profile.country].filter(
    (part): part is string => Boolean(part && part.trim()),
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * The profile header: who this is, how big they are, and what you can do.
 *
 * A Server Component. The only interactive parts are two small client islands —
 * the follow toggle and the share button — so the header itself ships no
 * JavaScript, and neither of those two blocks the page from rendering.
 *
 * The order is deliberate and is the order a phone is held in: avatar and counts
 * across the top, then who they are, then what they do, then what you can do to
 * them. Action buttons last rather than first, because on a 375px screen a row of
 * buttons above the fold pushes the person's name off it.
 */
export function ProfileHeader({
  profile,
  stats,
  isOwnProfile,
  isFollowing,
  business,
}: ProfileHeaderProps): React.JSX.Element {
  const displayName =
    profile.display_name ?? profile.full_name ?? profile.username ?? "Someone";
  const location = formatLocation(profile);
  const sharePath = isOwnProfile ? "/profile" : `/user/${profile.username}`;

  const statItems = [
    { label: "posts", value: stats.postsCount },
    { label: "followers", value: stats.followersCount },
    { label: "following", value: stats.followingCount },
  ];

  return (
    <header className="profile-header">
      <div className="profile-header__top">
        <div className="profile-header__avatar">
          <Avatar src={profile.avatar_url} name={displayName} size="xl" />
        </div>

        <dl className="profile-header__stats">
          {statItems.map((stat) => (
            <div key={stat.label} className="profile-header__stat">
              <dt className="profile-header__stat-label">{stat.label}</dt>
              <dd
                className="profile-header__stat-value"
                // The visible number may be abbreviated; the accessible name
                // always carries the real one.
                aria-label={`${stat.value} ${stat.label}`}
                title={String(stat.value)}
              >
                {formatProfileCount(stat.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="profile-header__identity">
        <h1 className="profile-header__name">{displayName}</h1>
        {profile.username ? (
          <p className="profile-header__handle">@{profile.username}</p>
        ) : null}
      </div>
{profile.bio ? (
        <p className="profile-header__bio">{profile.bio}</p>
      ) : null}

      <p className="profile-header__meta">
        {location ? (
          <span className="profile-header__meta-item">
            <Icon as={MapPin} size={14} />
            {location}
          </span>
        ) : null}
        <span className="profile-header__meta-item">
          <Icon as={CalendarDays} size={14} />
          Joined {formatJoined(profile.created_at)}
        </span>
      </p>
<div className="profile-header__actions">
        {isOwnProfile ? (
          <>
            <Button
              size="md"
              variant="primary"
              as="link"
              href="/settings/account"
            >
              <Icon as={Settings} size={16} />
              <span>Edit profile</span>
            </Button>
            <ShareProfileButton path={sharePath} size="md" />
          </>
        ) : (
          <>
            <FollowButton
              userId={profile.id}
              initialFollowing={isFollowing}
              size="md"
            />
            {/* A tooltip on a DISABLED button never appears: the element emits no pointer
                events, so there is nothing to hover. The title therefore lives on
                a wrapper span, which is the only thing that can receive the
                pointer. */}
            <span
              className="profile-header__soon"
              title="Messaging is coming soon"
            >
              <Button
                size="md"
                variant="secondary"
                disabled
                ariaLabel="Message this person (coming soon)"
              >
                <Icon as={MessageCircle} size={16} />
                <span>Message</span>
              </Button>
            </span>
            <span
              className="profile-header__soon"
              title="Reporting and blocking are coming soon"
            >
              <Button
                size="md"
                variant="ghost"
                disabled
                ariaLabel="More options (coming soon)"
              >
                <Icon as={MoreHorizontal} size={18} />
              </Button>
            </span>
          </>
        )}
      </div>

      {business ? (
        <Link
          href={`/business/${business.slug}`}
          className="profile-header__business"
        >
          <span className="profile-header__business-icon">
            <Icon as={Store} size={18} />
          </span>
          <span className="profile-header__business-text">
            <span className="profile-header__business-name">{business.name}</span>
            {business.category ? (
              <span className="profile-header__business-category">
                {business.category}
              </span>
            ) : null}
          </span>
          <span className="profile-header__business-cta">View business</span>
        </Link>
      ) : null}
    </header>
  );
}