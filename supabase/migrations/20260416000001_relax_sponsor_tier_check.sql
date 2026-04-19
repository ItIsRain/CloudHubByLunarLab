-- =====================================================
-- Allow custom sponsor tier labels
-- =====================================================
-- The original sponsors table (see 20260314000007) restricted `tier` to a
-- fixed set of values: platinum / gold / silver / bronze / community.
-- Organizers now need to define their own tier names (e.g. "Title Sponsor",
-- "Venue Partner", "Media Partner"), so we drop the CHECK constraint and
-- rely on application-level normalization (lowercased, trimmed, max 40 chars).
-- The `sponsors.tier` column itself remains a TEXT column with the same
-- default of 'bronze'.

ALTER TABLE public.sponsors
  DROP CONSTRAINT IF EXISTS sponsors_tier_check;

-- Guard against stray whitespace and empty strings that would otherwise
-- bypass the old enum. Length cap matches the application-level cap.
ALTER TABLE public.sponsors
  ADD CONSTRAINT sponsors_tier_length_check
  CHECK (char_length(btrim(tier)) BETWEEN 1 AND 40);
