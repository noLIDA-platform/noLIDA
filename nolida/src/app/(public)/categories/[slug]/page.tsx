import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import { PublicBusinessCard } from "@/components/business/PublicBusinessCard/PublicBusinessCard";
import * as publicBusinessService from "@/lib/server/services/publicBusiness.service";
import { countByCategory } from "@/lib/server/services/publicBusiness.service";
import { findBySlug as findCategoryBySlug } from "@/lib/server/repositories/categories.repo";
import "./category.css";

export const metadata: Metadata = {
  title: "Category",
  description: "Browse approved businesses by category on NOlida.",
};

const PAGE_SIZE = 12;

/**
 * `/categories/[slug]` — approved businesses in one category (Phase 8B).
 *
 * Public and server-rendered inside the `(public)` layout. Two lookups, both
 * parameterised: the category (404 when unknown) and the businesses through
 * `publicBusiness.service`, whose repository only ever returns APPROVED rows.
 * The count comes from `countByCategory` rather than `businesses.length` —
 * the header states the category's total, not the size of this page.
 *
 * Pagination is the feed's `(created_at, id)` cursor echoed through
 * `?cursor=`. The page renders at most PAGE_SIZE + 1 rows worth of query and
 * shows "Load more" only when the repository says there is more.
 */
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const rawCursor = Array.isArray(sp.cursor) ? sp.cursor[0] : sp.cursor;

  const category = await findCategoryBySlug(slug);
  if (!category) notFound();

  const [{ businesses, nextCursor }, total] = await Promise.all([
    publicBusinessService.listByCategory({
      categorySlug: slug,
      limit: PAGE_SIZE,
      cursor: rawCursor ?? null,
    }),
    countByCategory(slug),
  ]);

  return (
    <div className="cat-page">
      <header className="cat-page__header">
        <p className="cat-page__eyebrow">Category</p>
        <h1 className="cat-page__title">{category.name}</h1>
        <p className="cat-page__count">
          {total === 1 ? "1 business" : `${total} businesses`}
        </p>
      </header>

      {businesses.length === 0 ? (
        <EmptyState
          icon={<Icon as={Store} size={28} />}
          title="No businesses here yet"
          description={
            rawCursor
              ? "Nothing further to load."
              : "No approved businesses have listed in this category yet."
          }
        />
      ) : (
        <>
          <ul className="cat-page__grid">
            {businesses.map((business) => (
              <li key={business.id}>
                <PublicBusinessCard business={business} />
              </li>
            ))}
          </ul>

          {nextCursor ? (
            <div className="cat-page__more">
              <Link
                href={`/categories/${slug}?cursor=${encodeURIComponent(nextCursor)}`}
                className="cat-page__more-link"
              >
                Load more
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
