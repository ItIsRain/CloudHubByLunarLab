-- ============================================================
-- Submission ↔ Phase Integration
-- Adds evaluation_mode to phases, submission form fields to
-- hackathons, and form_data to submissions.
-- ============================================================

-- 1. competition_phases: evaluation mode + submission window
ALTER TABLE competition_phases
  ADD COLUMN IF NOT EXISTS evaluation_mode TEXT NOT NULL DEFAULT 'application'
    CHECK (evaluation_mode IN ('application', 'submission')),
  ADD COLUMN IF NOT EXISTS submission_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submission_end TIMESTAMPTZ;

-- 2. hackathons: custom submission form fields (mirrors registration_fields pattern)
ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS submission_fields JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS submission_sections JSONB NOT NULL DEFAULT '[]';

-- 3. submissions: custom form data (alongside existing hardcoded columns)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}';
