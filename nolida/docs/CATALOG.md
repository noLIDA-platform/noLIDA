# Business Catalog (Phase 8A)

The catalog stores the categories, services, and products that a business can
manage. Its schema is introduced by `migrations/008_catalog.sql`.

## Categories

The category list is seeded by `npm run seed:categories` from
`scripts/seed-categories.ts`. Seeding is idempotent by slug. Categories include
restaurants and food, hospitality, personal care, home services, education,
creative work, transport, health, fashion, technology, and Other. Admins can
extend the fixed seed list in Phase 18.

Each category has an id, name, unique slug, optional parent, optional icon,
sort order, active flag, and timestamps. `GET /api/categories` is public and
returns active categories by default. Pass `?activeOnly=false` to include
inactive categories.

## Data Shapes

Services belong to a business and contain a name, optional description and
category, optional minimum and maximum prices, currency, optional duration,
active state, sort order, and timestamps. Service descriptions are limited to
1,000 characters. A missing price is allowed; when only one endpoint of a
range is supplied it is displayed as a fixed price.

Products belong to a business and contain a name, optional description and
category, one price, currency, optional stock, image URL array, active state,
sort order, and timestamps. A `null` stock value means unlimited stock.
Uploads are deferred, so the editor does not add or upload images.

Prices are integers in minor currency units. For NGN this is kobo. UI price
fields accept major units and multiply by 100 before sending the API request.
Currency defaults to NGN.

## API

- `GET /api/categories?activeOnly=true|false` returns `{ categories }` and is public.
- `GET /api/businesses/:id/services` returns `{ services }` for the owner.
- `POST /api/businesses/:id/services` creates `{ service }` from name, description, category, price range, and duration.
- `PATCH /api/businesses/:id/services/:serviceId` partially updates a service and returns `{ service }`.
- `DELETE /api/businesses/:id/services/:serviceId` deletes an owned service and returns `{ deleted: true }`.
- `GET /api/businesses/:id/products` returns `{ products }` for the owner.
- `POST /api/businesses/:id/products` creates `{ product }` from name, description, category, price, optional stock, and optional image URLs.
- `PATCH /api/businesses/:id/products/:productId` partially updates a product and returns `{ product }`.
- `DELETE /api/businesses/:id/products/:productId` deletes an owned product and returns `{ deleted: true }`.

Except for the public categories endpoint, every endpoint requires an active
session. Services and products can only be managed by the user whose id matches
the business's `owner_user_id`; business and catalog ids are never accepted as
proof of ownership. Request data is validated with zod and catalog service
validation before SQL is executed.

## Deferred Work

Phase 8B adds the public business profile and exposes services/products only
for APPROVED businesses. Phase 8C replaces the temporary approved-business
dashboard with the full My Business dashboard. Media upload and Cloudinary
integration are deferred; product image values are only URL data for now.