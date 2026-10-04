import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton/WhatsAppButton";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness } from "@/lib/server/services/business.service";
import "./settings.css";

export const metadata: Metadata = { title: "Business settings" };

interface SettingsRow {
  label: string;
  href: string;
  /** Explains what the destination actually does — "Settings" alone does not. */
  description: string;
}

/**
 * `/my-business/settings` — grouped settings for the business (Phase 8C).
 *
 * A settings index, not a form: every row is a link to the screen that owns
 * that setting. Editing a profile lives on `/my-business/profile`, notification
 * preferences are a personal (not business) setting and correctly live under
 * `/settings/notifications`, and Availability has no implementation yet.
 *
 * ## Unpublish is disabled, and says why
 *
 * Unpublishing would set the business to UNPUBLISHED and pull the public
 * profile offline — irreversible from the owner's side, and exactly the kind of
 * action that must be deliberate. No API accepts it yet, so the button is
 * disabled and the tooltip names the route to it (support). A disabled button
 * with no explanation is the worst of both worlds; a disabled button that says
 * "contact support" tells the owner what to do next.
 */
export default async function MyBusinessSettingsPage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const business = await getMyBusiness(session.user.id);
  if (!business) redirect("/list-your-business");

  const businessRows: SettingsRow[] = [
    {
      label: "Edit profile",
      href: "/my-business/profile",
      description: "Name, category, contact details and description.",
    },
    {
      label: "Change category",
      href: "/my-business/profile",
      description: "Move your business to a different category.",
    },
    {
      label: "Availability",
      href: "/my-business/settings",
      description: "Opening hours and when you are taking bookings.",
    },
  ];

  const notificationRows: SettingsRow[] = [
    {
      label: "Notification settings",
      href: "/settings/notifications",
      description: "Email and push notifications for your account.",
    },
  ];

  return (
    <div className="biz-settings">
      <section className="biz-settings__group" aria-labelledby="biz-settings-business">
        <h2 id="biz-settings-business" className="biz-settings__heading">
          Business
        </h2>
        <ul className="biz-settings__list">
          {businessRows.map((row) => (
            <li key={row.label}>
              <SettingsLink row={row} />
            </li>
          ))}
        </ul>
      </section>

      <section className="biz-settings__group" aria-labelledby="biz-settings-notifications">
        <h2 id="biz-settings-notifications" className="biz-settings__heading">
          Notifications
        </h2>
        <ul className="biz-settings__list">
          {notificationRows.map((row) => (
            <li key={row.label}>
              <SettingsLink row={row} />
            </li>
          ))}
        </ul>
      </section>

      <section className="biz-settings__group" aria-labelledby="biz-settings-danger">
        <h2 id="biz-settings-danger" className="biz-settings__heading">
          Danger zone
        </h2>
        <div className="biz-settings__danger">
          <div className="biz-settings__danger-text">
            <p className="biz-settings__row-label">Unpublish business</p>
            <p className="biz-settings__row-description">
              Removes your public profile from NOlida. Contact support to do
              this — it takes your listing offline immediately.
            </p>
          </div>
          <span title="Coming soon — Contact support to unpublish">
            <Button type="button" variant="danger" disabled>
              Unpublish
            </Button>
          </span>
        </div>
      </section>

      <section className="biz-settings__group" aria-labelledby="biz-settings-support">
        <h2 id="biz-settings-support" className="biz-settings__heading">
          Contact support
        </h2>
        <ul className="biz-settings__list">
          <li>
            <SettingsLink
              row={{
                label: "Help & support",
                href: "/help",
                description: "Answers to common questions and how to reach us.",
              }}
            />
          </li>
          <li className="biz-settings__whatsapp">
            <WhatsAppButton
              label="Get help with my business on NOlida"
              message="Hi NOlida, I need help with my business on NOlida."
            />
            <span className="biz-settings__row-description">
              Message us on WhatsApp about your business.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

/**
 * One settings row. Extracted because the same shape repeats in every group —
 * and because `Availability` points back at this page, which needs an
 * `aria-current` so it does not read as a link to somewhere else.
 */
function SettingsLink({ row }: { row: SettingsRow }): React.JSX.Element {
  return (
    <Link href={row.href} className="biz-settings__row">
      <span className="biz-settings__row-text">
        <span className="biz-settings__row-label">{row.label}</span>
        <span className="biz-settings__row-description">{row.description}</span>
      </span>
      <Icon as={ChevronRight} size={16} className="biz-settings__chevron" />
    </Link>
  );
}
