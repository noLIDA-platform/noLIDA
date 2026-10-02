import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, UserRound, Wrench } from "lucide-react";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness } from "@/lib/server/services/business.service";
import { Card } from "@/components/ui/Card/Card";
import { Icon } from "@/components/ui/Icon/Icon";
import "./catalog.css";

export const metadata: Metadata = { title: "My business" };

export default async function MyBusinessPage() {
  const session = await getCurrentSessionUser();
  if (!session) {
    redirect("/");
  }

  const business = await getMyBusiness(session.user.id);
  if (!business) redirect("/list-your-business");
  if (["DRAFT", "CHANGES_REQUESTED"].includes(business.status)) {
    redirect("/my-business/submit");
  }
  if (business.status !== "APPROVED") redirect("/my-business/pending");

  return (
    <main className="business-dashboard">
      <div>
        <h1>{business.name}</h1>
        <p className="business-dashboard__intro">Manage your business catalog and profile.</p>
      </div>
      <div className="business-dashboard__cards">
        <Link className="business-dashboard__link" href="/my-business/services">
          <Card className="business-dashboard__card">
            <Icon as={Wrench} size={28} className="business-dashboard__icon" />
            <div><h2>Services</h2><p>Manage the services you offer.</p></div>
          </Card>
        </Link>
        <Link className="business-dashboard__link" href="/my-business/products">
          <Card className="business-dashboard__card">
            <Icon as={Package} size={28} className="business-dashboard__icon" />
            <div><h2>Products</h2><p>Manage products and available stock.</p></div>
          </Card>
        </Link>
        <Link className="business-dashboard__link" href="/my-business/pending">
          <Card className="business-dashboard__card">
            <Icon as={UserRound} size={28} className="business-dashboard__icon" />
            <div><h2>Business profile</h2><p>Profile editing is coming in the next phase.</p></div>
          </Card>
        </Link>
      </div>
    </main>
  );
}