-- 012: re-derive placeholder business slugs left behind by a rename (data fix).
--
-- `updateBusiness` (src/lib/server/services/business.service.ts) now keeps an
-- auto-derived slug in step with the business name. Rows created before that
-- rule were minted through the redeem-code placeholder ("My Business" → slug
-- `my-business`) and kept the placeholder slug after the owner set the real
-- name, so the public URL read /business/my-business while the profile read
-- "DML Urban Trim".
--
-- This fixes only the rows that are provably wrong: a PLACEHOLDER slug
-- ('my-business' or 'business') that no longer matches the stored name. A
-- business still named "My Business" keeps its slug — the pair is consistent —
-- and a slug the owner chose is never touched (the placeholder pair is the
-- only signature of the old bug).
--
-- Idempotent: a second run finds no mismatched rows.

DO $$
DECLARE
  biz RECORD;
  base TEXT;
  candidate TEXT;
  suffix INTEGER;
BEGIN
  FOR biz IN
    SELECT id, name, slug
    FROM businesses
    WHERE slug IN ('my-business', 'business')
  LOOP
    -- Same pipeline as generateSlug() in src/utils/slug.ts, minus the NFD
    -- diacritic strip (unaccent() is not guaranteed to be installed, and
    -- diacritics in these placeholder rows are not the case being fixed).
    base := lower(trim(biz.name));
    base := regexp_replace(base, '[^a-z0-9\s-]', '', 'g');
    base := regexp_replace(base, '\s+', '-', 'g');
    base := regexp_replace(base, '-+', '-', 'g');
    base := trim(both '-' from base);
    base := left(base, 80);

    IF base = '' OR base = biz.slug THEN
      -- Nothing slugable in the name, or the pair is already consistent.
      CONTINUE;
    END IF;

    candidate := base;
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM businesses WHERE slug = candidate) LOOP
      suffix := suffix + 1;
      candidate := base || '-' || suffix;
    END LOOP;

    UPDATE businesses SET slug = candidate WHERE id = biz.id;
  END LOOP;
END $$;
