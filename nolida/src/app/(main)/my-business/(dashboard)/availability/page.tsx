import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness } from "@/lib/server/services/business.service";
import { getAvailability } from "@/lib/server/services/availability.service";
import { AvailabilityEditor } from "@/components/bookings/AvailabilityEditor/AvailabilityEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Availability",
  description: "Set your weekly availability for bookings on NOLIda.",
};

export default async function AvailabilityPage(): Promise<React.JSX.Element> {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const business = await getMyBusiness(session.user.id);
  if (!business) redirect("/list-your-business");

  const slots = await getAvailability({ businessId: business.id });

  return <AvailabilityEditor businessId={business.id} initialSlots={slots} />;
}
