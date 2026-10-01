-- Phase 6: search infrastructure.
--
-- Two mechanisms, doing two different jobs:
--
--   * `tsvector` + GIN — full-text search over post bodies, locations and
--     profile text. Precise, index-backed, ranked by `ts_rank`.
--   * `pg_trgm` — trigram similarity, as a *fallback* for the cases full-text
--     search is bad at: typos, prefixes, and names ("Tolu" vs "Toluu").
--
-- 'simple' is deliberate, and is NOT a placeholder. No stemming means the
-- index stores the words as written. Nigerian languages (Yoruba, Hausa, Igbo,
-- Pidgin) have no English stemmer and would be mangled by one; and even in
-- English, stemmed names ("Ali" -> "Ali", but "Aisha" collapsing toward
-- something else) make a person's name unsearchable. Simpler and correct beats
-- clever here. If a language needs stemming later, it gets its own dictionary,
-- not a global config change.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Columns ───────────────────────────────────────────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ── Backfill ──────────────────────────────────────────────────────────────
-- Runs before the triggers exist, so the triggers cannot fire on it and there
-- is no risk of the two disagreeing. Even if it were the other way round, the
-- trigger is `UPDATE OF body, location`, and this statement touches neither
-- column, so it still would not fire.
UPDATE posts SET search_vector =
  to_tsvector('simple',
    coalesce(body, '') || ' ' || coalesce(location, '')
  );

UPDATE profiles SET search_vector =
  to_tsvector('simple',
    coalesce(username, '') || ' ' ||
    coalesce(full_name, '') || ' ' ||
    coalesce(bio, '')
  );

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS posts_search_idx ON posts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS profiles_search_idx ON profiles USING GIN (search_vector);

-- Trigram indexes back the fuzzy fallback. `%` (similarity) cannot use a
-- btree index, so these are what keep that path from degrading into a scan.
CREATE INDEX IF NOT EXISTS profiles_username_trgm_idx
  ON profiles USING GIN (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_full_name_trgm_idx
  ON profiles USING GIN (full_name gin_trgm_ops);

-- Trigram on post bodies too: a mistyped or partial search ("photograpy")
-- should still find the post, and this is what makes that cheap.
CREATE INDEX IF NOT EXISTS posts_body_trgm_idx
  ON posts USING GIN (body gin_trgm_ops);

-- ── Keep-up-to-date triggers ──────────────────────────────────────────────
-- Without these the index is correct only until the next edit: a post whose
-- body changes would keep its old vector forever and quietly stop appearing in
-- results.
CREATE OR REPLACE FUNCTION posts_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW.body, '') || ' ' || coalesce(NEW.location, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_search_vector_trigger ON posts;
CREATE TRIGGER posts_search_vector_trigger
  BEFORE INSERT OR UPDATE OF body, location ON posts
  FOR EACH ROW EXECUTE FUNCTION posts_search_vector_update();

CREATE OR REPLACE FUNCTION profiles_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW.username, '') || ' ' ||
    coalesce(NEW.full_name, '') || ' ' ||
    coalesce(NEW.bio, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_search_vector_trigger ON profiles;
CREATE TRIGGER profiles_search_vector_trigger
  BEFORE INSERT OR UPDATE OF username, full_name, bio ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_search_vector_update();