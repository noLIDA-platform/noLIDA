import type { Metadata } from "next";
import { RequestComposer } from "@/components/requests/RequestComposer/RequestComposer";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { redirect } from "next/navigation";
import * as categoriesRepo from "@/lib/server/repositories/categories.repo";
// One level up: requests.css is shared by /requests, /requests/new and
// /requests/[id], and this route is a directory below the one that holds it.
import "../requests.css";

export const metadata: Metadata = {
  title: "Post a request",
  description: "Tell NOlida what you need and get offers from businesses.",
};

/**
 * `/requests/new` — the composer.
 *
 * Categories are read here rather than fetched by the form, so the select is
 * populated in the first paint. A dropdown that fills in a moment later looks
 * broken on a slow connection, and the whole point of this screen is that it
 * should feel like one short form.
 */
export default async function NewRequestPage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  // Suspense around the DB read so the loading boundary is the route's own
  // loading.tsx rather than a blank screen.
  const categories = await categoriesRepo.listAll({ activeOnly: true });

  return (
    <div className="requests-page">
      <header className="requests-page__head">
        <h1 className="requests-page__title">What do you need?</h1>
        <p className="requests-page__subtitle">
          Businesses nearby will see this and send you offers. The more specific
          you are, the better those offers will be.
        </p>
      </header>

      <RequestComposer categories={categories} />
    </div>
  );
}