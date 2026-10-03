import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";
import { ComingSoonPanel } from "@/components/business/ComingSoonPanel/ComingSoonPanel";

export const metadata: Metadata = { title: "Bookings" };

/**
 * `/my-business/bookings` — placeholder (Phase 8C).
 *
 * Real in Phase 11, alongside the "Book" button on the public profile. It must
 * exist now because `MY_BUSINESS_TABS` links to it: a tab that 404s reads as a
 * bug, and a tab that is absent reads as a product without bookings.
 */
export default function MyBusinessBookingsPage() {
  return (
    <ComingSoonPanel
      icon={CalendarCheck}
      title="Bookings are coming soon"
      description="Bookings will appear here once you start receiving them. Booking management launches soon."
      phase="Bookings launch in a later phase."
    />
  );
}
