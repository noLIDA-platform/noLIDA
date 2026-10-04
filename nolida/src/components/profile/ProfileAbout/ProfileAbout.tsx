import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Globe2,
  MapPin,
  MessageSquare,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import type { ProfileCard } from "@/lib/profile/types";
import "./ProfileAbout.css";

export interface ProfileAboutProps {
  profile: ProfileCard;
  isOwnProfile: boolean;
  /**
   * Your own verification state, and only ever yours.
   *
   * These two rows used to live in a "My Account" card on `/profile`, which
   * this page no longer renders. They are account details rather than public
   * identity, so they belong on the About tab of your own profile and nowhere
   * else — another person's verification state is not shown here at all.
   */
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

/**
 * The About tab: the long form of what the header summarises.
 *
 * Everything here is optional. A profile with nothing but a name shows an
 * explanation and, on your own profile, a route to filling it in — rather than
 * an empty panel that looks broken.
 */
export function ProfileAbout({
  profile,
  isOwnProfile,
  emailVerified,
  phoneVerified,
}: ProfileAboutProps): React.JSX.Element {
  const verificationRows = isOwnProfile
    ? [
        {
          key: "email",
          icon: BadgeCheck,
          label: "Email",
          value: emailVerified ? "Verified" : "Not verified",
        },
        {
          key: "phone",
          icon: BadgeCheck,
          label: "Phone",
          value: phoneVerified ? "Verified" : "Not verified",
        },
      ]
    : [];

  const rows = [
    ...verificationRows,
    {
      key: "location",
      icon: MapPin,
      label: "Location",
      value: [profile.city, profile.country]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join(", "),
    },
    {
      key: "country",
      icon: Globe2,
      label: "Country",
      value: profile.country,
    },
    {
      key: "language",
      icon: MessageSquare,
      label: "Language",
      value: profile.language,
    },
    {
      key: "joined",
      icon: CalendarDays,
      label: "Joined",
      value: new Date(profile.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    },
  ].filter((row) => row.value && row.value.trim().length > 0);

  return (
    <section className="profile-about" aria-label="About this profile">
      {profile.bio ? (
        <p className="profile-about__bio">{profile.bio}</p>
      ) : null}

      {rows.length > 0 ? (
        <dl className="profile-about__rows">
          {rows.map((row) => (
            <div key={row.key} className="profile-about__row">
              <dt className="profile-about__label">
                <Icon as={row.icon} size={15} />
                <span>{row.label}</span>
              </dt>
              <dd className="profile-about__value">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {/* A person with no bio and no details gets an explanation, not a void. */}
      {!profile.bio && rows.length === 0 ? (
        <p className="profile-about__empty">
          {isOwnProfile
            ? "Add a bio, a location and a language so people know who they are talking to."
            : "This person has not added any details yet."}
        </p>
      ) : null}

      {isOwnProfile ? (
        <Button
          size="md"
          variant="secondary"
          as="link"
          href="/settings/account"
          className="profile-about__edit"
        >
          <Icon as={Settings} size={16} />
          <span>Edit your details</span>
        </Button>
      ) : null}
    </section>
  );
}