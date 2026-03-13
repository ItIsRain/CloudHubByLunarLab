-- =====================================================
-- Global sponsors directory
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 150),
  slug TEXT NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 1 AND 100),
  logo TEXT NOT NULL CHECK (char_length(logo) <= 2048),
  website TEXT CHECK (char_length(website) <= 500),
  description TEXT CHECK (char_length(description) <= 2000),
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('platinum', 'gold', 'silver', 'bronze', 'community')),
  contact_email TEXT CHECK (char_length(contact_email) <= 255),
  contact_name TEXT CHECK (char_length(contact_name) <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sponsors_slug ON public.sponsors(slug);
CREATE INDEX idx_sponsors_tier ON public.sponsors(tier);
CREATE INDEX idx_sponsors_status ON public.sponsors(status);
CREATE INDEX idx_sponsors_created_by ON public.sponsors(created_by);

-- Trigger
CREATE TRIGGER sponsors_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Anyone can view active sponsors
CREATE POLICY "Active sponsors are public"
  ON public.sponsors FOR SELECT
  USING (status = 'active' OR created_by = auth.uid());

CREATE POLICY "Organizers can create sponsors"
  ON public.sponsors FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update own sponsors"
  ON public.sponsors FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete own sponsors"
  ON public.sponsors FOR DELETE
  USING (auth.uid() = created_by);
