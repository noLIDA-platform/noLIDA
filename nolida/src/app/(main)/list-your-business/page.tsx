import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BusinessRequestFlow } from "@/components/business/BusinessRequestFlow/BusinessRequestFlow";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness } from "@/lib/server/services/business.service";
import "./list-your-business.css";

export const metadata: Metadata = { title: "List your business" };

/**
 * `/list-your-business` — one form, one code, one continue button (Phase 7E).
 *
 * Replaces the Phase 7 layout: a WhatsApp card that asked the user to go
 * elsewhere and wait for a human, plus a manual code-entry form. Neither is
 * here any more. The request now happens in-app and the code arrives
 * immediately — see `docs/BUSINESS-REQUEST.md`.
 *
 * `RedeemCodeForm` and `POST /api/businesses/redeem-code` both still exist and
 * still work: admin-issued codes are a real path, and removing them would break
 * any code that was already sent to somebody.
 *
 * ## The redirect table
 *
 * A user who already has a business never sees this page — there is nothing to
 * request. Which screen they land on depends on what state they are in:
 *
 * - DRAFT / CHANGES_REQUESTED → `/my-business/submit` (finish and send it)
 * - PENDING_REVIEW / REJECTED / SUSPENDED → `/my-business/pending`
 * - APPROVED → `/my-business` (the dashboard)
 *
 * The status is resolved on the server, never asked for in a query string, so
 * the page cannot be used to peek at someone else's business state.
 *
 * `dynamic` because this reads a session cookie. Without it the page would be
 * prerendered once at build time and served to every visitor, redirecting
 * signed-in users straight past their own business.
 */
export const dynamic = "force-dynamic";

export default async function ListYourBusinessPage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const business = await getMyBusiness(session.user.id);
  if (business) {
    if (business.status === "DRAFT" || business.status === "CHANGES_REQUESTED") {
      redirect("/my-business/submit");
    }
    if (business.status === "APPROVED") redirect("/my-business");
    redirect("/my-business/pending");
  }

  return (
    <main className="list-your-business">
      <BusinessRequestFlow />
    </main>
  );
}
