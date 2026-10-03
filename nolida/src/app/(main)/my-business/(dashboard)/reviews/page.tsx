import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/Badge/Badge";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import "./reviews-placeholder.css";

export const metadata: Metadata = { title: "Reviews" };

/**
 * `/my-business/reviews` — placeholder (Phase 8C), real in Phase 17.
 *
 * Not built through `ComingSoonPanel` because it carries two things the others
 * do not: a "Coming soon" badge, so the tab's status is visible before the
 * body is read, and the promise of *when* reviews will exist — after a
 * customer's first completed booking or order, which is the same rule the
 * public profile's Reviews tab will use.
 *
 * No rating is invented here. The public profile shows "New" rather than a
 * fabricated 5.0, and this page must not be the place that quietly disagrees.
 */
export default function MyBusinessReviewsPage() {
  return (
    <div className="biz-reviews-placeholder">
      <div className="biz-reviews-placeholder__head">
        <h1>Reviews</h1>
        <Badge variant="default">Coming soon</Badge>
      </div>

      <EmptyState
        icon={<Icon as={MessageSquare} size={28} />}
        title="No reviews yet"
        description="Reviews from customers will appear here after their first completed booking or order."
      />

      <p className="biz-reviews-placeholder__note">
        Reviews launch in Phase 17. Until then, no rating is shown anywhere on
        your public profile — we would rather show nothing than a number no
        customer has actually given you.
      </p>
    </div>
  );
}
