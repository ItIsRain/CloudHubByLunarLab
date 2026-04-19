-- =====================================================
-- Multi-category support for hackathons
-- =====================================================
-- Adds a `categories TEXT[]` column next to the legacy single `category`
-- column. Organizers can now tag a hackathon with multiple categories,
-- including custom labels typed via the "Other" option in the creation
-- and edit flows.
--
-- The legacy `category` column is kept in sync with `categories[1]` via a
-- trigger so any old readers (analytics, integrations) that still read
-- the single value keep working.
--
-- Per-element validation (length, trim, lowercase) runs in the API layer
-- (both POST /api/hackathons and PATCH /api/hackathons/[id] normalize
-- input before writing). Postgres doesn't allow subqueries in CHECK
-- constraints, so the DB only guards against the column being empty.

ALTER TABLE public.hackathons
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

-- Backfill: wrap each row's existing single category into the array.
UPDATE public.hackathons
   SET categories = ARRAY[category]
 WHERE category IS NOT NULL
   AND category <> ''
   AND (categories IS NULL OR array_length(categories, 1) IS NULL);

ALTER TABLE public.hackathons
  DROP CONSTRAINT IF EXISTS hackathons_categories_shape_check;

ALTER TABLE public.hackathons
  ADD CONSTRAINT hackathons_categories_shape_check
  CHECK (array_length(categories, 1) IS NOT NULL AND array_length(categories, 1) >= 1);

-- GIN index enables efficient array overlap filters used by the explore
-- API (e.g. `?category=tech,ai-ml` → `categories && ARRAY[...]`).
CREATE INDEX IF NOT EXISTS idx_hackathons_categories
  ON public.hackathons USING GIN (categories);

-- Keep legacy `category` synced with `categories[1]` on insert/update.
CREATE OR REPLACE FUNCTION public.sync_hackathon_primary_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.categories IS NOT NULL AND array_length(NEW.categories, 1) >= 1 THEN
    NEW.category := NEW.categories[1];
  ELSIF NEW.category IS NOT NULL AND NEW.category <> '' THEN
    NEW.categories := ARRAY[NEW.category];
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hackathons_sync_primary_category ON public.hackathons;

CREATE TRIGGER hackathons_sync_primary_category
  BEFORE INSERT OR UPDATE OF category, categories ON public.hackathons
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_hackathon_primary_category();
