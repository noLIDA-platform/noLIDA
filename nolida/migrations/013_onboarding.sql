-- 013: first-login tour persistence (Phase 10.2).
--
-- NULL means "the tour has not been completed" — every account that existed
-- before this migration reads as "not yet completed", and the /home gate only
-- shows the tour to users who ALSO have zero posts, so no established user
-- sees it retroactively.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
