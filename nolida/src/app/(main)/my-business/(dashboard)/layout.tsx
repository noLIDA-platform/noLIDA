import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { MyBusinessTabs } from "@/components/business/MyBusinessTabs/MyBusinessTabs";
import { QuickActions } from "@/components/business/QuickActions/QuickActions";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness } from "@/lib/server/services/business.service";
import "./my-business.css";

/**
 * The My Business dashboard shell (Phase 8C).
 *
 * ## Why this is `(dashboard)/layout.tsx` and not `my-business/layout.tsx`
 *
 * A layout wraps everything beneath it. At `my-business/layout.tsx` it would
 * also wrap `/my-business/submit` and `/my-business/pending` — and this file's
 * own redirect would send a DRAFT business to `/my-business/submit`, which
 * would land back here and redirect again, forever. Next.js throws on that
 * loop rather than hanging, so the dashboard would be unreachable rather than
 * merely broken.
 *
 * The `(dashboard)` route group fixes it: the group contributes to the URL only
 * by its *absence*, so every route inside it is still exactly `/my-business/…`
 * and `submit` / `pending` stay outside the shell. URLs are unchanged; only the
 * nesting is.
 *
 * ## The redirect table
 *
 * The dashboard is the business *operating*, which only an approved business
 * can do — so every non-APPROVED status is sent to the screen that can move it
 * forward, rather than to an overview full of zeros:
 *
 * - no business → `/list-your-business` (create one)
 * - DRAFT, CHANGES_REQUESTED → `/my-business/submit` (finish and send it)
 * - PENDING_REVIEW, REJECTED, SUSPENDED → `/my-business/pending` (its status UI
 *   and, while pending, the 15s poller)
 * - APPROVED → render
 *
 * Ownership is resolved from the session with `getMyBusiness`, which is
 * `businesses.repo.findByOwner(session.user.id)`. Nothing here reads a user id
 * or a business id from the URL, so there is no id for a client to tamper with.
 */
export default async function MyBusinessDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const business = await getMyBusiness(session.user.id);
  if (!business) redirect("/list-your-business");

  if (business.status === "DRAFT" || business.status === "CHANGES_REQUESTED") {
    redirect("/my-business/submit");
  }

  // Everything that is not APPROVED and not editable is waiting on a human:
  // a review, a rejection to act on, or a suspension to read about.
  if (business.status !== "APPROVED") {
    redirect("/my-business/pending");
  }

  return (
    <div className="my-business-layout">
      <header className="my-business-layout__header">
        <div className="my-business-layout__titles">
          <h1 className="my-business-layout__title">My Business</h1>
          <p className="my-business-layout__subtitle">{business.name}</p>
        </div>
        <QuickActions businessId={business.id} />
      </header>

      <MyBusinessTabs />

      <div className="my-business-layout__content">{children}</div>
    </div>
  );
}
