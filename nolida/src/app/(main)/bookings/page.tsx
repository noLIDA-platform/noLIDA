import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Bookings" };

/** `/bookings` — real screen lands here once the bookings phase lands. */
export default function BookingsPage() {
  return (
    <PagePlaceholder
      icon={CalendarDays}
      title="Bookings"
      description="Every request that turned into a booking, with its status and receipt. Bookings are created by the booking and checkout phases; this screen will list them once there is a bookings table to read."
    />
  );
}
