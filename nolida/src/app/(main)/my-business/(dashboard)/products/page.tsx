import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness } from "@/lib/server/services/business.service";
import { listCategories, listProducts } from "@/lib/server/services/catalog.service";
import { ProductsClient } from "./ProductsClient";
import "../catalog.css";

export const metadata: Metadata = { title: "Products" };

export default async function MyBusinessProductsPage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const business = await getMyBusiness(session.user.id);
  if (!business) redirect("/list-your-business");

  const [products, categories] = await Promise.all([
    listProducts({ userId: session.user.id, businessId: business.id }),
    listCategories({ activeOnly: true }),
  ]);

  return (
    <ProductsClient
      businessId={business.id}
      initialProducts={products}
      categories={categories}
    />
  );
}