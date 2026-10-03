"use client";

import { useState } from "react";
import {
  Clock3,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import { ServiceCard } from "@/components/business/ServiceCard/ServiceCard";
import { ProductCard } from "@/components/business/ProductCard/ProductCard";
import type { BusinessProduct, BusinessService } from "@/types/catalog";
import type { PublicBusiness } from "@/types/public-business";

export interface BusinessProfileClientProps {
  business: PublicBusiness;
  services: BusinessService[];
  products: BusinessProduct[];
  /** True when the signed-in user owns this business (computed server-side). */
  isOwner: boolean;
}

type TabKey = "about" | "services" | "products" | "reviews";

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: "about", label: "About" },
  { key: "services", label: "Services" },
  { key: "products", label: "Products" },
  { key: "reviews", label: "Reviews" },
];

/** Human label for a `socials` key: `instagram_url` → `Instagram`. */
function socialLabel(key: string): string {
  const cleaned = key.replace(/_url$/, "").replace(/_/g, " ").trim();
  if (!cleaned) return key;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * The interactive half of `/business/[slug]`.
 *
 * Tabs are client state, not routes: a profile is one document, and pushing
 * `?tab=services` to the URL would make the back button behave like a scroll
 * position nobody asked to keep. The server page hands down fully-formed
 * data, so this component never fetches — it renders what it was given,
 * including its empty states.
 *
 * The sticky action bar carries Phase 10 (Message) and Phase 11 (Book) as
 * visibly disabled buttons with an honest tooltip rather than hiding them:
 * a visitor should see what is coming, and an owner should get the "Edit
 * business" escape hatch instead of dead controls on their own listing.
 */
export function BusinessProfileClient({
  business,
  services,
  products,
  isOwner,
}: BusinessProfileClientProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>("about");

  const socialEntries = Object.entries(business.socials ?? {}).filter(
    ([, value]) => typeof value === "string" && value.length > 0,
  ) as [string, string][];

  const serviceAreas = (business.service_areas ?? []).filter(
    (area): area is string => typeof area === "string" && area.trim().length > 0,
  );

  const hourEntries = Object.entries(business.hours ?? {}).filter(
    ([, value]) => typeof value === "string" && value.length > 0,
  ) as [string, string][];

  return (
    <div className="biz-profile__body">
      <div className="biz-tabs" role="tablist" aria-label="Business profile sections">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`biz-tab-${tab.key}`}
            aria-selected={activeTab === tab.key}
            aria-controls={`biz-panel-${tab.key}`}
            className={[
              "biz-tabs__tab",
              activeTab === tab.key ? "biz-tabs__tab--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="biz-tabs__panel"
        role="tabpanel"
        id={`biz-panel-${activeTab}`}
        aria-labelledby={`biz-tab-${activeTab}`}
      >
        {activeTab === "about" ? (
          <div className="biz-about">
            <section className="biz-about__section" aria-labelledby="biz-about-heading">
              <h2 id="biz-about-heading">About {business.name}</h2>
              {business.description ? (
                <p className="biz-about__description">{business.description}</p>
              ) : (
                <p className="biz-about__description biz-about__description--muted">
                  The owner has not added a description yet.
                </p>
              )}
            </section>

            <section className="biz-about__section" aria-labelledby="biz-contact-heading">
              <h2 id="biz-contact-heading">Contact</h2>
              <ul className="biz-about__list">
                {business.phone ? (
                  <li>
                    <Icon as={Phone} size={15} />
                    <a href={`tel:${business.phone}`}>{business.phone}</a>
                  </li>
                ) : null}
                {business.email ? (
                  <li>
                    <Icon as={Mail} size={15} />
                    <a href={`mailto:${business.email}`}>{business.email}</a>
                  </li>
                ) : null}
                {business.website ? (
                  <li>
                    <Icon as={Globe} size={15} />
                    <a
                      href={
                        isHttpUrl(business.website)
                          ? business.website
                          : `https://${business.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {business.website}
                    </a>
                  </li>
                ) : null}
                {socialEntries.map(([key, value]) => (
                  <li key={key}>
                    <Icon as={MessageCircle} size={15} />
                    {isHttpUrl(value) ? (
                      <a href={value} target="_blank" rel="noopener noreferrer">
                        {socialLabel(key)}
                      </a>
                    ) : (
                      <span>{socialLabel(key)}</span>
                    )}
                  </li>
                ))}
                {!business.phone &&
                !business.email &&
                !business.website &&
                socialEntries.length === 0 ? (
                  <li className="biz-about__muted">No contact details published yet.</li>
                ) : null}
              </ul>
            </section>


            <section className="biz-about__section" aria-labelledby="biz-location-heading">
              <h2 id="biz-location-heading">Location</h2>
              {business.location ? (
                <p className="biz-about__location">
                  <Icon as={MapPin} size={15} />
                  {business.location}
                </p>
              ) : (
                <p className="biz-about__muted">No location published yet.</p>
              )}
              {serviceAreas.length > 0 ? (
                <div className="biz-about__areas" aria-label="Service areas">
                  {serviceAreas.map((area) => (
                    <span key={area} className="biz-about__area-chip">
                      {area}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="biz-about__section" aria-labelledby="biz-hours-heading">
              <h2 id="biz-hours-heading">Hours</h2>
              {hourEntries.length > 0 ? (
                <dl className="biz-about__hours">
                  {hourEntries.map(([day, hours]) => (
                    <div key={day} className="biz-about__hours-row">
                      <dt>{day.charAt(0).toUpperCase() + day.slice(1)}</dt>
                      <dd>{hours}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="biz-about__muted">
                  <Icon as={Clock3} size={15} />
                  Opening hours not published yet.
                </p>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === "services" ? (
          services.length === 0 ? (
            <EmptyState
              title="No services yet"
              description="This business has not published any services."
            />
          ) : (
            <div className="biz-profile__catalog">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )
        ) : null}

        {activeTab === "products" ? (
          products.length === 0 ? (
            <EmptyState
              title="No products yet"
              description="This business has not published any products."
            />
          ) : (
            <div className="biz-profile__catalog">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )
        ) : null}

        {activeTab === "reviews" ? (
          <EmptyState title="No reviews yet" description="Reviews are coming soon." />
        ) : null}
      </div>

      <aside className="biz-actions" aria-label="Business actions">
        {isOwner ? (
          <Button as="link" href="/my-business" fullWidth>
            Edit business
          </Button>
        ) : (
          <>
            <span className="biz-actions__pending" title="Coming soon">
              <Button
                type="button"
                disabled
                fullWidth
                ariaLabel="Message this business — coming soon"
              >
                <Icon as={MessageCircle} size={16} />
                Message
              </Button>
            </span>
            <span className="biz-actions__pending" title="Coming soon">
              <Button
                type="button"
                disabled
                fullWidth
                ariaLabel="Book this business — coming soon"
              >
                <Icon as={CalendarCheck} size={16} />
                Book
              </Button>
            </span>
          </>
        )}
      </aside>
    </div>
  );
}

