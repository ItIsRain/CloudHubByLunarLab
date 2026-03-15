-- =====================================================
-- Add screening support columns to hackathons table
-- Stores screening rules as JSONB alongside registration_fields
-- =====================================================

-- Screening rules array on hackathons (same shape as ScreeningRule[])
ALTER TABLE public.hackathons
  ADD COLUMN IF NOT EXISTS screening_rules JSONB NOT NULL DEFAULT '[]';

-- Screening config (quotas, duplicate detection settings, etc.)
ALTER TABLE public.hackathons
  ADD COLUMN IF NOT EXISTS screening_config JSONB NOT NULL DEFAULT '{}';

-- =====================================================
-- Add screening columns to hackathon_registrations
-- =====================================================

ALTER TABLE public.hackathon_registrations
  DROP CONSTRAINT IF EXISTS hackathon_registrations_status_check;

ALTER TABLE public.hackathon_registrations
  ADD CONSTRAINT hackathon_registrations_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'under_review',
    'eligible',
    'ineligible',
    'accepted',
    'waitlisted',
    'rejected',
    'cancelled',
    'approved',
    'declined'
  ));

ALTER TABLE public.hackathon_registrations
  ADD COLUMN IF NOT EXISTS completeness_score NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.hackathon_registrations
  ADD COLUMN IF NOT EXISTS eligibility_passed BOOLEAN;

ALTER TABLE public.hackathon_registrations
  ADD COLUMN IF NOT EXISTS screening_completed_at TIMESTAMPTZ;

ALTER TABLE public.hackathon_registrations
  ADD COLUMN IF NOT EXISTS screening_results JSONB DEFAULT '[]';

ALTER TABLE public.hackathon_registrations
  ADD COLUMN IF NOT EXISTS screening_flags JSONB DEFAULT '[]';

ALTER TABLE public.hackathon_registrations
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_hack_reg_screening
  ON public.hackathon_registrations(hackathon_id, eligibility_passed)
  WHERE form_data IS NOT NULL;
