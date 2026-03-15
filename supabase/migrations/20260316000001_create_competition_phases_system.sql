-- ============================================================
-- Competition Phases System
-- Supports multi-phase competitions (bootcamp → finals)
-- with per-phase scoring, reviewer assignments, and decisions
-- ============================================================

-- 1. Competition Phases
CREATE TABLE competition_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phase_type TEXT NOT NULL DEFAULT 'bootcamp' CHECK (phase_type IN ('bootcamp', 'final', 'custom')),
  campus_filter TEXT,
  scoring_criteria JSONB NOT NULL DEFAULT '[]',
  scoring_scale_max INTEGER NOT NULL DEFAULT 3 CHECK (scoring_scale_max BETWEEN 1 AND 100),
  require_recommendation BOOLEAN NOT NULL DEFAULT true,
  reviewer_count INTEGER NOT NULL DEFAULT 3 CHECK (reviewer_count BETWEEN 1 AND 20),
  is_weighted BOOLEAN NOT NULL DEFAULT false,
  blind_review BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  location TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'scoring', 'calibration', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_competition_phases_hackathon ON competition_phases(hackathon_id);
CREATE INDEX idx_competition_phases_status ON competition_phases(status);

-- 2. Phase Reviewers
CREATE TABLE phase_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES competition_phases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(phase_id, user_id)
);

CREATE INDEX idx_phase_reviewers_phase ON phase_reviewers(phase_id);
CREATE INDEX idx_phase_reviewers_user ON phase_reviewers(user_id);

-- 3. Reviewer Assignments
CREATE TABLE reviewer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES competition_phases(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES hackathon_registrations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(phase_id, reviewer_id, registration_id)
);

CREATE INDEX idx_reviewer_assignments_phase ON reviewer_assignments(phase_id);
CREATE INDEX idx_reviewer_assignments_reviewer ON reviewer_assignments(reviewer_id);
CREATE INDEX idx_reviewer_assignments_registration ON reviewer_assignments(registration_id);

-- 4. Phase Scores
CREATE TABLE phase_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES competition_phases(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES hackathon_registrations(id) ON DELETE CASCADE,
  criteria_scores JSONB NOT NULL DEFAULT '[]',
  total_score NUMERIC(7,2) NOT NULL DEFAULT 0,
  recommendation TEXT CHECK (recommendation IN ('recommend', 'do_not_recommend')),
  overall_feedback TEXT,
  flagged BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(phase_id, reviewer_id, registration_id)
);

CREATE INDEX idx_phase_scores_phase ON phase_scores(phase_id);
CREATE INDEX idx_phase_scores_reviewer ON phase_scores(reviewer_id);
CREATE INDEX idx_phase_scores_registration ON phase_scores(registration_id);

-- 5. Phase Decisions
CREATE TABLE phase_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES competition_phases(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES hackathon_registrations(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('advance', 'do_not_advance', 'borderline')),
  recommendation_count INTEGER NOT NULL DEFAULT 0,
  total_reviewers INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC(7,2),
  decided_by UUID REFERENCES auth.users(id),
  rationale TEXT,
  is_override BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(phase_id, registration_id)
);

CREATE INDEX idx_phase_decisions_phase ON phase_decisions(phase_id);
CREATE INDEX idx_phase_decisions_registration ON phase_decisions(registration_id);

-- 6. Updated_at triggers
CREATE TRIGGER update_competition_phases_updated_at
  BEFORE UPDATE ON competition_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phase_scores_updated_at
  BEFORE UPDATE ON phase_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phase_decisions_updated_at
  BEFORE UPDATE ON phase_decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS Policies
ALTER TABLE competition_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_reviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviewer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_decisions ENABLE ROW LEVEL SECURITY;

-- competition_phases: Organizer full access (looks up hackathons directly, no circular ref)
CREATE POLICY "Organizers can manage phases"
  ON competition_phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = competition_phases.hackathon_id
      AND h.organizer_id = auth.uid()
    )
  );

-- Reviewers can view phases they are assigned to
CREATE POLICY "Reviewers can view assigned phases"
  ON competition_phases FOR SELECT
  USING (
    id IN (
      SELECT pr.phase_id FROM phase_reviewers pr
      WHERE pr.user_id = auth.uid()
      AND pr.status = 'accepted'
    )
  );

-- phase_reviewers: Organizer access via hackathon_id subquery (avoids JOIN through competition_phases RLS)
CREATE POLICY "Organizers can manage phase reviewers"
  ON phase_reviewers FOR ALL
  USING (
    phase_id IN (
      SELECT cp.id FROM competition_phases cp
      WHERE cp.hackathon_id IN (
        SELECT h.id FROM hackathons h WHERE h.organizer_id = auth.uid()
      )
    )
  );

CREATE POLICY "Reviewers can view own reviewer record"
  ON phase_reviewers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Reviewers can update own status"
  ON phase_reviewers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- reviewer_assignments: Organizer access via hackathon_id subquery
CREATE POLICY "Organizers can manage assignments"
  ON reviewer_assignments FOR ALL
  USING (
    phase_id IN (
      SELECT cp.id FROM competition_phases cp
      WHERE cp.hackathon_id IN (
        SELECT h.id FROM hackathons h WHERE h.organizer_id = auth.uid()
      )
    )
  );

CREATE POLICY "Reviewers can view own assignments"
  ON reviewer_assignments FOR SELECT
  USING (reviewer_id = auth.uid());

-- phase_scores: Organizer full access via hackathon_id subquery
CREATE POLICY "Organizers can manage all scores"
  ON phase_scores FOR ALL
  USING (
    phase_id IN (
      SELECT cp.id FROM competition_phases cp
      WHERE cp.hackathon_id IN (
        SELECT h.id FROM hackathons h WHERE h.organizer_id = auth.uid()
      )
    )
  );

-- Reviewers can view own scores
CREATE POLICY "Reviewers can view own scores"
  ON phase_scores FOR SELECT
  USING (reviewer_id = auth.uid());

-- Reviewers can insert scores only for assigned registrations
CREATE POLICY "Reviewers can insert scores for assignments"
  ON phase_scores FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM reviewer_assignments ra
      WHERE ra.phase_id = phase_scores.phase_id
      AND ra.reviewer_id = auth.uid()
      AND ra.registration_id = phase_scores.registration_id
    )
  );

-- Reviewers can update own scores
CREATE POLICY "Reviewers can update own scores"
  ON phase_scores FOR UPDATE
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- phase_decisions: Organizer access via hackathon_id subquery
CREATE POLICY "Organizers can manage decisions"
  ON phase_decisions FOR ALL
  USING (
    phase_id IN (
      SELECT cp.id FROM competition_phases cp
      WHERE cp.hackathon_id IN (
        SELECT h.id FROM hackathons h WHERE h.organizer_id = auth.uid()
      )
    )
  );

-- Reviewers can view decisions only after calibration/completion (blind review protection)
CREATE POLICY "Reviewers can view decisions after calibration"
  ON phase_decisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM phase_reviewers pr
      WHERE pr.phase_id = phase_decisions.phase_id
      AND pr.user_id = auth.uid()
      AND pr.status = 'accepted'
    )
    AND EXISTS (
      SELECT 1 FROM competition_phases cp
      WHERE cp.id = phase_decisions.phase_id
      AND cp.status IN ('calibration', 'completed')
    )
  );

-- 8. Restrict reviewer self-updates to status-only
CREATE OR REPLACE FUNCTION restrict_reviewer_self_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is updating their own record and is NOT the organizer
  IF OLD.user_id = auth.uid() AND NOT EXISTS (
    SELECT 1 FROM competition_phases cp
    JOIN hackathons h ON h.id = cp.hackathon_id
    WHERE cp.id = OLD.phase_id AND h.organizer_id = auth.uid()
  ) THEN
    -- Non-organizer reviewers can only change status and accepted_at
    NEW.phase_id := OLD.phase_id;
    NEW.user_id := OLD.user_id;
    NEW.name := OLD.name;
    NEW.email := OLD.email;
    NEW.invited_at := OLD.invited_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_restrict_reviewer_self_update
  BEFORE UPDATE ON phase_reviewers
  FOR EACH ROW EXECUTE FUNCTION restrict_reviewer_self_update();
