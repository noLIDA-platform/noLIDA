import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  LineChart,
  Package,
  TrendingUp,
  UserCheck,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { Icon } from "@/components/ui/Icon/Icon";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness } from "@/lib/server/services/business.service";
import {
  getOwnerDashboardStats,
  profileCompletionPercent,
  profileTasks,
} from "@/lib/server/services/publicBusiness.service";
import "./analytics.css";

export const metadata: Metadata = { title: "Business analytics" };

/**
 * `/my-business/analytics` — partial but real (Phase 8D).
 *
 * ## Why this page is not a placeholder
 *
 * Phase 8C shipped Analytics as an `EmptyState`, which was honest at the time —
 * there was nothing to chart. But there *was* already real data sitting in the
 * database: the active service and product counts, how complete the profile
 * is, and how long the listing has been live. Showing "coming soon" above four
 * numbers we could have computed is the same failure mode as a fake 5.0 rating,
 * in the opposite direction: withholding the truth instead of inventing it.
 *
 * So the four metrics below are all genuine, and each names its own source.
 *
 * ## What is deliberately absent
 *
 * Time series. Revenue over time and bookings per week need an events table
 * with real rows flowing into it; drawing a chart over no data would produce a
 * flat line that reads as "zero revenue" when the truth is "nothing is
 * measured yet". Those charts are Phase 19.
 *
 * ## "Live for"
 *
 * Days since `approved_at` — not since `created_at`. A listing drafted for two
 * weeks and approved this morning was *not* visible to anyone for those two
 * weeks, so counting from approval is the only figure that means what an owner
 * hears by "live".
 */
export default async function MyBusinessAnalyticsPage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const business = await getMyBusiness(session.user.id);
  if (!business) redirect("/list-your-business");

  const stats = await getOwnerDashboardStats({ businessId: business.id });

  const tasks = profileTasks({
    business: {
      name: business.name,
      category: business.category,
      description: business.description,
      phone: business.phone,
      email: business.email,
      location: business.location,
    },
    services: stats.services,
    products: stats.products,
  });
  const completion = profileCompletionPercent(tasks);

  // `Math.max(0, …)` guards a clock skew that would otherwise render "-1 days"
  // on the one screen an owner uses to check they are doing fine.
  const daysLive = business.approved_at
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(business.approved_at).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  const metrics = [
    {
      key: "services",
      label: "Active services",
      value: String(stats.services),
      icon: Wrench,
      note: "Published and visible to customers",
    },
    {
      key: "products",
      label: "Active products",
      value: String(stats.products),
      icon: Package,
      note: "Published and visible to customers",
    },
    {
      key: "completion",
      label: "Profile completion",
      value: `${completion}%`,
      icon: UserCheck,
      note: "How complete your public profile is",
    },
    {
      key: "live",
      label: "Live for",
      value: daysLive === 1 ? "1 day" : `${daysLive} days`,
      icon: CalendarRange,
      note: "Since your listing was approved",
    },
  ];

  return (
    <div className="biz-analytics">
      <header className="biz-analytics__header">
        <div>
          <h1>Analytics</h1>
          <p className="biz-analytics__intro">
            How {business.name} is set up right now. Performance charts are on
            the way.
          </p>
        </div>
        <Badge variant="brand">Beta</Badge>
      </header>

      <ul className="biz-analytics__metrics">
        {metrics.map((metric) => (
          <li key={metric.key} className="biz-analytics__metric">
            <span className="biz-analytics__metric-label">
              <Icon as={metric.icon} size={14} />
              {metric.label}
            </span>
            <span className="biz-analytics__metric-value">{metric.value}</span>
            <span className="biz-analytics__metric-note">{metric.note}</span>
          </li>
        ))}
      </ul>

      <Card className="biz-analytics__soon">
        <div className="biz-analytics__soon-head">
          <h2>
            <Icon as={LineChart} size={18} />
            Coming soon
          </h2>
          <Badge variant="default">Phase 19</Badge>
        </div>

        <p className="biz-analytics__soon-copy">
          Full analytics will track how your business performs over time:
        </p>

        <ul className="biz-analytics__soon-list">
          <li>
            <Icon as={TrendingUp} size={15} />
            <span>
              <strong>Revenue over time</strong> — daily and monthly earnings,
              so you can see which weeks actually pay.
            </span>
          </li>
          <li>
            <Icon as={BarChart3} size={15} />
            <span>
              <strong>Bookings per week</strong> — demand trends, and which
              days and times bring the most requests.
            </span>
          </li>
          <li>
            <Icon as={UserCheck} size={15} />
            <span>
              <strong>Customer retention</strong> — who came back, and how
              often.
            </span>
          </li>
          <li>
            <Icon as={Wrench} size={15} />
            <span>
              <strong>Top-performing services</strong> — which of your listings
              get the most attention.
            </span>
          </li>
        </ul>

        <p className="biz-analytics__soon-footnote">
          Charts need real events behind them, so none of these are drawn yet.
          Nothing here is estimated, and no empty chart is shown in its place.
        </p>
      </Card>
    </div>
  );
}
