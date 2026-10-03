import * as publicBusinessesRepo from "@/lib/server/repositories/publicBusinesses.repo";
import * as servicesRepo from "@/lib/server/repositories/services.repo";
import * as productsRepo from "@/lib/server/repositories/products.repo";
import type {
  PublicBusiness,
  PublicBusinessStats,
} from "@/types/public-business";
import type { BusinessProduct, BusinessService } from "@/types/catalog";

/**
 * The public read side of a business (Phase 8B).
 *
 * Split from `business.service.ts` on purpose: that file mutates, checks
 * ownership and talks to admins; this one only ever answers "what may a
 * visitor see?". The approval gate lives in `publicBusinesses.repo.ts` —
 * every query there filters `status = 'APPROVED'` — so nothing in this file
 * can accidentally publish a draft even if a caller forgets to check.
 *
 * Catalog reads reuse the existing repositories with `activeOnly`, because
 * an inactive service is one the owner hid: the public profile and the
 * owner's dashboard must agree on what "visible" means.
 */

export interface PublicBusinessProfile {
  business: PublicBusiness;
  services: BusinessService[];
  products: BusinessProduct[];
}

/**
 * One business by slug with its catalog, or `null` when the business does
 * not exist or is not APPROVED.
 *
 * The two failure modes are deliberately indistinguishable: a 404 for a
 * draft says the same thing as a 404 for a typo, so the URL space never
 * leaks which slugs exist before admin approval.
 */
export async function getBySlug(input: {
  slug: string;
}): Promise<PublicBusinessProfile | null> {
  const business = await publicBusinessesRepo.findBySlug(input.slug);
  if (!business) return null;

  const [services, products] = await Promise.all([
    servicesRepo.listByBusiness(business.id, { activeOnly: true }),
    productsRepo.listByBusiness(business.id, { activeOnly: true }),
  ]);

  return { business, services, products };
}

/** Approved businesses in a category, newest first, with an honest cursor. */
export async function listByCategory(input: {
  categorySlug: string;
  limit?: number;
  cursor?: string | null;
}): Promise<{ businesses: PublicBusiness[]; nextCursor: string | null }> {
  return publicBusinessesRepo.listByCategory(input);
}

/** Approved businesses for the discovery page, most-authored first. */
export async function listFeatured(input: { limit?: number } = {}): Promise<PublicBusiness[]> {
  return publicBusinessesRepo.listFeatured(input);
}

/**
 * How many approved businesses a category holds — for the listing header.
 *
 * The count and the page come from the same predicate, so the header can
 * never claim 14 businesses and then render 0 rows: if they disagree it is
 * because the page is page two, not because two code paths disagree about
 * what "approved" means.
 */
export async function countByCategory(categorySlug: string): Promise<number> {
  return publicBusinessesRepo.countByCategory(categorySlug);
}

/**
 * The stats row above the profile tabs.
 *
 * Counts the same active-only catalog `getBySlug` returns, so the header
 * never claims 8 services while the tab shows 7. Reviews and posts are 0
 * until their phases land — an honest zero beats a plausible fake, and the
 * UI renders them as "coming soon" rather than as a rating.
 */
export async function getBusinessStats(input: {
  businessId: string;
}): Promise<PublicBusinessStats> {
  const [services, products] = await Promise.all([
    servicesRepo.listByBusiness(input.businessId, { activeOnly: true }),
    productsRepo.listByBusiness(input.businessId, { activeOnly: true }),
  ]);

  return {
    services: services.length,
    products: products.length,
    reviews: 0,
    posts: 0,
  };
}
