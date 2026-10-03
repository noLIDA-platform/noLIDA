import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Package, Star, Wrench } from "lucide-react";
import { Icon } from "@/components/ui/Icon/Icon";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import {
  getBySlug,
  getBusinessStats,
} from "@/lib/server/services/publicBusiness.service";
import { BusinessProfileClient } from "./BusinessProfileClient";
import "./business-profile.css";

export const metadata: Metadata = {
  title: "Business",
  description: "Business profile on noLIDA.",
};

/**
 * `/business/[slug]` — the public face of an approved business (Phase 8B).
 *
 * A Server Component outside both `(main)` and `(marketing)`: it needs no
 * session (guests read it through the `(public)` layout's own header), and it
 * must 404 before anything renders when the business is missing or not yet
 * approved. `getBySlug` returns `null` for every non-APPROVED status, so the
 * gate is one line here and one predicate in SQL — nowhere else.
 *
 * The owner comparison happens here, on the server, against the session —
 * never against a value the page asked the client for.
 */
export default async function BusinessProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getBySlug({ slug });
  if (!profile) notFound();

  const { business, services, products } = profile;
  const session = await getCurrentSessionUser();
  const isOwner = session?.user.id === business.owner.id;

  const stats = await getBusinessStats({ businessId: business.id });

  return (
    <article className="biz-profile">
      {/* Cover placeholder: a gradient band until real photos land (deferred
          with Cloudinary). The name is overlaid so the page still reads as a
          storefront with no image at all. */}
      <div className="biz-profile__cover" aria-hidden="true">
        <span className="biz-profile__cover-name">{business.name}</span>
      </div>

      <header className="biz-profile__header">
        <div className="biz-profile__avatar" aria-hidden="true">
          {business.name.trim().charAt(0).toUpperCase()}
        </div>

        <div className="biz-profile__identity">
          <div className="biz-profile__title-row">
            <h1 className="biz-profile__name">{business.name}</h1>
            <span className="biz-profile__verified">
              <Icon as={BadgeCheck} size={16} />
              Verified
            </span>
          </div>

          <div className="biz-profile__meta">
            {business.category ? (
              <span className="biz-profile__category">{business.category}</span>
            ) : null}
            {business.location ? (
              <span className="biz-profile__location">
                <Icon as={MapPin} size={14} />
                {business.location}
              </span>
            ) : null}
          </div>

          <dl className="biz-profile__stats">
            <div className="biz-profile__stat">
              <dt>
                <Icon as={Wrench} size={14} />
                Services
              </dt>
              <dd>{stats.services}</dd>
            </div>
            <div className="biz-profile__stat">
              <dt>
                <Icon as={Package} size={14} />
                Products
              </dt>
              <dd>{stats.products}</dd>
            </div>
            <div className="biz-profile__stat">
              <dt>
                <Icon as={Star} size={14} />
                Rating
              </dt>
              {/* Placeholder until reviews land in Phase 17 — labelled as
                  such rather than passed off as a measured average. */}
              <dd title="Placeholder until reviews launch">
                5.0
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <BusinessProfileClient
        business={business}
        services={services}
        products={products}
        isOwner={isOwner}
      />
    </article>
  );
}
