import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card/Card";
import { Icon } from "@/components/ui/Icon/Icon";
import { BusinessSubmissionForm } from "@/components/business/BusinessSubmissionForm";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness } from "@/lib/server/services/business.service";
import "./profile-edit.css";

export const metadata: Metadata = { title: "Business profile" };

/**
 * `/my-business/profile` — edit an approved business (Phase 8C).
 *
 * ## `mode="edit"`, not `mode="submit"`
 *
 * The same form as the Phase 7 submission screen, but it saves and stays. An
 * approved business must not be knocked back into `PENDING_REVIEW` because an
 * owner fixed a typo in their phone number — that would take the public profile
 * offline and put them back in a queue. The form's `edit` mode returns before
 * the submit call, and `submitBusiness` now independently refuses a non-live
 * listing, so the guarantee holds on both sides of the request.
 *
 * Values are prefilled from the stored row, which is the whole reason the form
 * grew an `initialValues` prop: an edit form that opens blank is an owner
 * retyping their own details to change one character.
 *
 * Ownership comes from the session via `getMyBusiness`; nothing on this page
 * accepts a business id from the client.
 */
export default async function MyBusinessProfilePage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const business = await getMyBusiness(session.user.id);
  if (!business) redirect("/list-your-business");

  return (
    <div className="biz-profile-edit">
      <Card className="biz-profile-edit__card">
        <header className="biz-profile-edit__header">
          <div>
            <h2>Business profile</h2>
            <p>
              This is what customers see on your public page. Changes save
              straight away — they do not need review again.
            </p>
          </div>
          <Link
            href={`/business/${business.slug}`}
            className="biz-profile-edit__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            View profile
            <Icon as={ExternalLink} size={14} />
          </Link>
        </header>

        <BusinessSubmissionForm
          mode="edit"
          initialValues={{
            name: business.name,
            category: business.category,
            phone: business.phone,
            email: business.email,
            website: business.website,
            location: business.location,
            description: business.description,
            photos: business.photos,
          }}
        />
      </Card>
    </div>
  );
}
