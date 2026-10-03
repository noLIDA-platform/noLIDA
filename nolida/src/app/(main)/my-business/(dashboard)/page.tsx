import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CalendarCheck,
  Check,
  ExternalLink,
  LineChart,
  MapPin,
  Package,
  Store,
  Wallet,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness } from "@/lib/server/services/business.service";
import {
  getOwnerDashboardStats,
  profileCompletionPercent,
  profileTasks,
} from "@/lib/server/services/publicBusiness.service";
import { formatTimeAgo } from "@/utils/time";
import "./overview.css";

export const metadata: Metadata = { title: "Business overview" };

/**
 * `/my-business` — the owner-facing overview (Phase 8C).
 *
 * ## What is real and what is a zero
 *
 * Services, products, status and profile completion are read from the
 * database. Bookings and Revenue are **hard-coded zeros, visibly marked
 * "soon"**, because their subsystems do not exist yet — the alternative is a
 * fabricated number on a dashboard an owner will make decisions from. A zero
 * that is labelled is honest; an unlabelled zero is a bug waiting to be
 * believed.
 *
 * The layout already resolved and approved this business; the page re-reads it
 * because a Server Component has no parent state to inherit, and one
 * primary-key lookup is cheaper than a request-scoped context for a single row.
 */
export default async function MyBusinessOverviewPage() {
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
  const percent = profileCompletionPercent(tasks);
  const outstanding = tasks.filter((task) => !task.done);

  return (
    <div className="biz-overview">
      {/* ── Business health ─────────────────────────────────────────── */}
      <Card className="biz-health">
        <div className="biz-health__main">
          <h2 className="biz-health__name">{business.name}</h2>
          <div className="biz-health__meta">
            {business.category ? (
              <span className="biz-health__category">{business.category}</span>
            ) : null}
            {business.location ? (
              <span className="biz-health__location">
                <Icon as={MapPin} size={14} />
                {business.location}
              </span>
            ) : null}
          </div>
        </div>

        <div className="biz-health__side">
          <Badge variant="success">
            <Icon as={BadgeCheck} size={14} />
            {business.status === "APPROVED" ? "Approved" : business.status}
          </Badge>
          <Link
            href={`/business/${business.slug}`}
            className="biz-health__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            View public profile
            <Icon as={ExternalLink} size={14} />
          </Link>
        </div>
      </Card>

      {/* ── Key metrics ─────────────────────────────────────────────── */}
      <section aria-labelledby="biz-metrics-heading">
        <h2 id="biz-metrics-heading" className="sr-only">
          Key metrics
        </h2>
        <ul className="biz-metrics">
          <li className="biz-metric">
            <span className="biz-metric__label">
              <Icon as={Wrench} size={14} />
              Services
            </span>
            <span className="biz-metric__value">{stats.services}</span>
          </li>
          <li className="biz-metric">
            <span className="biz-metric__label">
              <Icon as={Package} size={14} />
              Products
            </span>
            <span className="biz-metric__value">{stats.products}</span>
          </li>
          <li className="biz-metric biz-metric--soon">
            <span className="biz-metric__label">
              <Icon as={CalendarCheck} size={14} />
              Bookings
            </span>
            <span className="biz-metric__value">0</span>
            <span className="biz-metric__note">Coming soon</span>
          </li>
          <li className="biz-metric biz-metric--soon">
            <span className="biz-metric__label">
              <Icon as={Wallet} size={14} />
              Revenue
            </span>
            <span className="biz-metric__value">₦0</span>
            <span className="biz-metric__note">Coming soon</span>
          </li>
        </ul>
      </section>


      {/* ── Profile completion ───────────────────────────────────────── */}
      <Card className="biz-completion">
        <div className="biz-completion__head">
          <h2>Profile completion</h2>
          <span className="biz-completion__percent">{percent}%</span>
        </div>

        <div
          className="biz-completion__track"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completion"
        >
          <div
            className="biz-completion__fill"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="biz-completion__summary">
          {outstanding.length === 0
            ? "Your profile is complete. Customers can find everything they need."
            : `${outstanding.length} ${outstanding.length === 1 ? "task" : "tasks"} left to make your business look its best.`}
        </p>

        <ul className="biz-tasks">
          {tasks.map((task) => (
            <li
              key={task.key}
              className={[
                "biz-task",
                task.done ? "biz-task--done" : "biz-task--todo",
              ].join(" ")}
            >
              <span className="biz-task__mark" aria-hidden="true">
                <Icon as={Check} size={13} />
              </span>
              <span className="biz-task__label">{task.label}</span>
              {!task.done ? (
                <Link href={task.href} className="biz-task__link">
                  {task.key === "service" || task.key === "product"
                    ? "Add"
                    : "Fix"}
                </Link>
              ) : null}
              <span className="sr-only">{task.done ? "Done" : "Not done"}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── Recent activity ─────────────────────────────────────────── */}
      <Card className="biz-activity">
        <h2>Recent activity</h2>
        {stats.recentActivity.length === 0 ? (
          <EmptyState
            icon={<Icon as={Store} size={26} />}
            title="Nothing here yet"
            description="Services and products you add will show up here."
          />
        ) : (
          <ul className="biz-activity__list">
            {stats.recentActivity.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="biz-activity__item">
                <span className="biz-activity__icon">
                  <Icon as={item.kind === "service" ? Wrench : Package} size={15} />
                </span>
                <span className="biz-activity__name">{item.name}</span>
                <span className="biz-activity__kind">
                  {item.kind === "service" ? "Service" : "Product"} added
                </span>
                <time
                  className="biz-activity__time"
                  dateTime={item.created_at}
                  title={new Date(item.created_at).toLocaleString()}
                >
                  {formatTimeAgo(item.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Performance placeholder ─────────────────────────────────── */}
      <Card className="biz-chart-placeholder">
        <div className="biz-chart-placeholder__head">
          <h2>
            <Icon as={LineChart} size={18} />
            Performance
          </h2>
          <Badge variant="default">Coming soon</Badge>
        </div>
        <div className="biz-chart-placeholder__box" aria-hidden="true" />
        <p className="biz-chart-placeholder__copy">
          Performance analytics are coming soon. You will be able to see views,
          bookings and revenue over time.
        </p>
      </Card>
    </div>
  );
}
