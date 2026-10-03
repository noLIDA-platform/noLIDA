import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { Icon } from "@/components/ui/Icon/Icon";
import type { PublicBusinessCardData } from "@/types/public-business";
import "./PublicBusinessCard.css";

export interface PublicBusinessCardProps {
  business: PublicBusinessCardData;
}

/**
 * A link to `/business/[slug]` shaped like a storefront card.
 *
 * Deliberately structural: it takes `PublicBusinessCardData` — the four
 * fields it actually renders — so the same card works for a full
 * `PublicBusiness` (category pages, featured rows) and a `SearchBusiness`
 * (search results). One card, three call sites, no adapters.
 *
 * Rating reads "New" rather than a fabricated number: reviews arrive in
 * Phase 17, and a placeholder "5.0" would be indistinguishable from a real
 * average of five perfect scores.
 */
export function PublicBusinessCard({
  business,
}: PublicBusinessCardProps): React.JSX.Element {
  const initial = business.name.trim().charAt(0).toUpperCase();

  return (
    <Link href={`/business/${business.slug}`} className="pub-biz-card">
      {/* Cover placeholder: gradient until photos land (Cloudinary deferred). */}
      <div className="pub-biz-card__cover" aria-hidden="true">
        <span className="pub-biz-card__initial">{initial}</span>
      </div>

      <div className="pub-biz-card__body">
        <h3 className="pub-biz-card__name">{business.name}</h3>

        {business.category ? (
          <span className="pub-biz-card__category">{business.category}</span>
        ) : null}

        {business.location ? (
          <p className="pub-biz-card__location">
            <Icon as={MapPin} size={13} />
            {business.location}
          </p>
        ) : null}

        <p className="pub-biz-card__rating">
          <Icon as={Star} size={13} />
          New
        </p>
      </div>
    </Link>
  );
}
