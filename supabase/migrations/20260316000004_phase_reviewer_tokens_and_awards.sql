-- Migration: Add invitation tokens to phase_reviewers, award categories to phases,
-- and cross-phase finalist selection support.

-- 1. Add invitation_token to phase_reviewers for email-based acceptance
ALTER TABLE phase_reviewers ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_phase_reviewers_token ON phase_reviewers(invitation_token) WHERE invitation_token IS NOT NULL;

-- 2. Add award_categories JSONB to competition_phases for final phase awards
-- Format: [{ "id": "uuid", "name": "Health", "type": "sector"|"special", "description": "..." }]
ALTER TABLE competition_phases ADD COLUMN IF NOT EXISTS award_categories JSONB DEFAULT '[]'::jsonb;

-- 3. Add source_phase_ids to competition_phases for cross-phase finalist selection
-- When a phase pulls finalists from multiple source phases, store which phases feed into it
ALTER TABLE competition_phases ADD COLUMN IF NOT EXISTS source_phase_ids UUID[] DEFAULT '{}';

-- 4. Create phase_finalists table for tracking cross-phase selections
CREATE TABLE IF NOT EXISTS phase_finalists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES competition_phases(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES hackathon_registrations(id) ON DELETE CASCADE,
  source_phase_id UUID REFERENCES competition_phases(id) ON DELETE SET NULL,
  source_score NUMERIC(6,2),
  rank INTEGER,
  award_category_id TEXT, -- matches id in award_categories JSONB
  award_label TEXT,       -- e.g. "Health Sector Winner", "Innovation Award"
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  selected_by UUID REFERENCES auth.users(id),
  UNIQUE(phase_id, registration_id)
);

CREATE INDEX IF NOT EXISTS idx_phase_finalists_phase ON phase_finalists(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_finalists_registration ON phase_finalists(registration_id);

-- 5. RLS for phase_finalists — same pattern as phase_scores
ALTER TABLE phase_finalists ENABLE ROW LEVEL SECURITY;

-- Organizer full access
CREATE POLICY "phase_finalists_organizer_all"
  ON phase_finalists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competition_phases cp
      JOIN hackathons h ON h.id = cp.hackathon_id
      WHERE cp.id = phase_finalists.phase_id
      AND h.organizer_id = auth.uid()
    )
  );

-- Reviewers can read finalists for phases they review
CREATE POLICY "phase_finalists_reviewer_select"
  ON phase_finalists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM phase_reviewers pr
      WHERE pr.phase_id = phase_finalists.phase_id
      AND pr.user_id = auth.uid()
      AND pr.status = 'accepted'
    )
  );
