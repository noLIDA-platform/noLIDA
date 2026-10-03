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

/**
 * Profile completion: how much of the public profile an owner has filled in.
 *
 * ## Why a checklist and not a percentage
 *
 * The overview renders both — a progress bar and the tasks behind it — but the
 * tasks are the real output. "43% complete" tells an owner nothing about what
 * to do next; "Add a description" does. The percentage exists only because a
 * bare checklist has no at-a-glance summary.
 *
 * ## The threshold on description is 50 characters, and that is a real line
 *
 * The public profile caps descriptions at 1,000 characters (catalog rules), and
 * anything at all satisfies the database. But three words is not a description
 * a customer can act on, so 50 characters is the bar for "done". It is stated
 * in the UI next to the task rather than hidden here.
 *
 * `services` and `products` come from the caller rather than being re-read, so
 * this stays a pure function of data already fetched for the stat cards — the
 * overview must not count the same rows twice.
 */
export interface ProfileTask {
  key: string;
  label: string;
  done: boolean;
  /** Set while the task is incomplete; every one of them is done on Profile. */
  href: string;
}

export function profileTasks(input: {
  business: {
    name: string | null;
    category: string | null;
    description: string | null;
    phone: string | null;
    email: string | null;
    location: string | null;
  };
  services: number;
  products: number;
}): ProfileTask[] {
  const description = input.business.description?.trim() ?? "";

  return [
    {
      key: "name",
      label: "Add your business name",
      done: Boolean(input.business.name?.trim()),
      href: "/my-business/profile",
    },
    {
      key: "category",
      label: "Choose a category",
      done: Boolean(input.business.category?.trim()),
      href: "/my-business/profile",
    },
    {
      key: "description",
      label: "Write a description (at least 50 characters)",
      done: description.length >= 50,
      href: "/my-business/profile",
    },
    {
      key: "contact",
      label: "Add a phone number or email",
      done: Boolean(input.business.phone?.trim() || input.business.email?.trim()),
      href: "/my-business/profile",
    },
    {
      key: "location",
      label: "Add your location",
      done: Boolean(input.business.location?.trim()),
      href: "/my-business/profile",
    },
    {
      key: "service",
      label: "Add your first service",
      done: input.services > 0,
      href: "/my-business/services",
    },
    {
      key: "product",
      label: "Add your first product",
      done: input.products > 0,
      href: "/my-business/products",
    },
  ];
}

/** Percentage of tasks done, rounded down — 6/7 is 85%, not "almost there". */
export function profileCompletionPercent(tasks: ProfileTask[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((task) => task.done).length;
  return Math.floor((done / tasks.length) * 100);
}

/**
 * The owner-facing numbers behind the My Business overview (Phase 8C).
 *
 * Same counts as `getBusinessStats`, plus recent catalog activity. Reusing the
 * public function for the two counts is the point: the overview can never say
 * "8 services" while the public profile shows 7, because both read the same
 * active-only rows.
 *
 * `recentActivity` merges services and products by `created_at` and takes the
 * five newest. Merged rather than "5 services, 5 products" because a single
 * ordered timeline is what an owner scanning for "did my last edit land?"
 * actually wants.
 */
export interface DashboardActivityItem {
  id: string;
  kind: "service" | "product";
  name: string;
  created_at: string;
}

export interface BusinessDashboardStats extends PublicBusinessStats {
  recentActivity: DashboardActivityItem[];
}

export async function getOwnerDashboardStats(input: {
  businessId: string;
}): Promise<BusinessDashboardStats> {
  const [services, products] = await Promise.all([
    servicesRepo.listByBusiness(input.businessId, { activeOnly: true }),
    productsRepo.listByBusiness(input.businessId, { activeOnly: true }),
  ]);

  const recentActivity: DashboardActivityItem[] = [
    ...services.map((service) => ({
      id: service.id,
      kind: "service" as const,
      name: service.name,
      created_at: service.created_at,
    })),
    ...products.map((product) => ({
      id: product.id,
      kind: "product" as const,
      name: product.name,
      created_at: product.created_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  return {
    services: services.length,
    products: products.length,
    reviews: 0,
    posts: 0,
    recentActivity,
  };
}
