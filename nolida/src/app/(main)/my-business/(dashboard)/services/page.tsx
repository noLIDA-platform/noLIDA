import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness } from "@/lib/server/services/business.service";
import { listCategories, listServices } from "@/lib/server/services/catalog.service";
import { ServicesClient } from "./ServicesClient";
import "../catalog.css";

export const metadata: Metadata = { title: "Services" };

export default async function MyBusinessServicesPage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const business = await getMyBusiness(session.user.id);
  if (!business) redirect("/list-your-business");

  const [services, categories] = await Promise.all([
    listServices({ userId: session.user.id, businessId: business.id }),
    listCategories({ activeOnly: true }),
  ]);

  return (
    <ServicesClient
      businessId={business.id}
      initialServices={services}
      categories={categories}
    />
  );
}