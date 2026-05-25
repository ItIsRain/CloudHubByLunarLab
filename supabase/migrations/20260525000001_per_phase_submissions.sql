-- ============================================================
-- Per-Phase Submissions
-- Lets each competition_phase optionally collect its own
-- submission, with its own deadline and form fields. When no
-- phase has submissions_enabled, the hackathon's global
-- submission_deadline / submission_fields apply instead.
-- ============================================================

-- 1. competition_phases: per-phase submission toggle + form fields
ALTER TABLE competition_phases
  ADD COLUMN IF NOT EXISTS submissions_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submission_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS submission_sections JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. submissions: link each submission to the phase it belongs to
--    (NULL = belongs to the global hackathon-level submission round)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS phase_id UUID
    REFERENCES competition_phases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_phase_id
  ON submissions(phase_id);

-- One submission per (team, phase). NULL phase_id means the global round,
-- which also collapses to one row per team. The partial-unique trick keeps
-- multiple per-phase submissions per team possible without conflicting
-- with the existing one-submission-per-team-per-hackathon assumption.
CREATE UNIQUE INDEX IF NOT EXISTS uq_submissions_team_phase
  ON submissions(team_id, COALESCE(phase_id, '00000000-0000-0000-0000-000000000000'::uuid));
