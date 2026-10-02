import { getPool } from "@/lib/db/client";

const CATEGORIES = [
  ["Restaurants & Food", "restaurants-food"],
  ["Hotels & Hospitality", "hotels-hospitality"],
  ["Barbers & Hair", "barbers-hair"],
  ["Beauty & Spa", "beauty-spa"],
  ["Photography", "photography"],
  ["Videography", "videography"],
  ["Plumbers", "plumbers"],
  ["Electricians", "electricians"],
  ["Cleaners", "cleaners"],
  ["Mechanics", "mechanics"],
  ["Tutors & Education", "tutors-education"],
  ["Freelancers", "freelancers"],
  ["Designers", "designers"],
  ["Event Vendors", "event-vendors"],
  ["Fitness & Wellness", "fitness-wellness"],
  ["Rentals", "rentals"],
  ["Health Services", "health-services"],
  ["Transportation", "transportation"],
  ["Home Services", "home-services"],
  ["Fashion & Tailoring", "fashion-tailoring"],
  ["Technology & Repairs", "technology-repairs"],
  ["Other", "other"],
] as const;

async function main(): Promise<void> {
  const pool = getPool();
  let inserted = 0;

  try {
    for (const [index, [name, slug]] of CATEGORIES.entries()) {
      const result = await pool.query(
        `INSERT INTO categories (name, slug, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO NOTHING`,
        [name, slug, (index + 1) * 10],
      );
      inserted += result.rowCount ?? 0;
    }

    console.log(`Seeded ${inserted} categories`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Failed to seed categories.", error);
  process.exitCode = 1;
});