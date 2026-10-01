import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CreditCard,
  KeyRound,
  LifeBuoy,
  Palette,
  Settings,
  ShieldCheck,
  Store,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon/Icon";
import "./SettingsMenu.css";

interface SettingsRow {
  readonly href: string;
  readonly label: string;
  /** Says what the destination will hold — never invents the contents. */
  readonly description: string;
  readonly icon: LucideIcon;
}

interface SettingsGroup {
  readonly title: string;
  readonly rows: readonly SettingsRow[];
}

/**
 * Ten destinations, matching the settings spec. Three of them (`/profile`,
 * `/wallet`, `/my-business`) are top-level screens rather than `/settings/*`
 * because they are reached directly from the drawer, the sidebar and the bottom
 * nav — nesting them under `/settings` would give the same screen two homes.
 *
 * There is deliberately no "Delete account" row. Deleting an account needs a
 * confirmation flow and a data-retention decision, and neither exists yet; a
 * row that goes nowhere would be worse than its absence.
 */
const GROUPS: readonly SettingsGroup[] = [
  {
    title: "Account",
    rows: [
      {
        href: "/profile",
        label: "Profile",
        description: "Name, username, bio and photo",
        icon: User,
      },
      {
        href: "/settings/privacy-security",
        label: "Privacy & Security",
        description: "Password, two-factor and who can see you",
        icon: ShieldCheck,
      },
      {
        href: "/settings/sessions",
        label: "Active sessions",
        description: "Devices signed in to this account",
        icon: KeyRound,
      },
    ],
  },
  {
    title: "Money",
    rows: [
      {
        href: "/wallet",
        label: "Wallet",
        description: "Balance, top up and transfers",
        icon: Wallet,
      },
      {
        href: "/settings/payment-methods",
        label: "Payment methods",
        description: "Cards saved to your account",
        icon: CreditCard,
      },
      {
        href: "/my-business",
        label: "My business",
        description: "Listings, earnings and orders",
        icon: Store,
      },
    ],
  },
  {
    title: "Preferences",
    rows: [
      {
        href: "/settings/notifications",
        label: "Notifications",
        description: "What we message you about, and where",
        icon: Bell,
      },
      {
        href: "/settings/appearance",
        label: "Appearance & language",
        description: "Theme, language, currency and location",
        icon: Palette,
      },
    ],
  },
  {
    title: "Support",
    rows: [
      {
        href: "/settings/help",
        label: "Help & support",
        description: "Guides, safety and contacting noLIDA",
        icon: LifeBuoy,
      },
      {
        href: "/settings/developer",
        label: "Developer",
        description: "API keys and webhooks for your business",
        icon: Settings,
      },
    ],
  },
];

/**
 * The `/settings` index: grouped link rows.
 *
 * Server Component — every row is a plain link, so there is nothing to hydrate.
 * `.mp-page` / `.mp-title` come from `(main)/pages.css`.
 */
export function SettingsMenu({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const classes = ["mp-page", "app-settings", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div>
        <h1 className="mp-title">Settings</h1>
        <p className="mp-eyebrow">
          Most of these open screens that are still being built. The
          destinations are final so nothing moves later.
        </p>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="app-settings__group">
          <h2 className="app-settings__group-title">{group.title}</h2>
          <ul className="app-settings__list">
            {group.rows.map((row) => (
              <li key={row.href}>
                <Link href={row.href} className="app-settings__row">
                  <span className="app-settings__row-icon">
                    <Icon as={row.icon} size={18} />
                  </span>
                  <span className="app-settings__row-text">
                    <span className="app-settings__row-label">{row.label}</span>
                    <span className="app-settings__row-description">
                      {row.description}
                    </span>
                  </span>
                  <Icon
                    as={ChevronRight}
                    size={18}
                    className="app-settings__row-chevron"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}