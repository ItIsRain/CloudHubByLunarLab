-- ============================================================
-- Award Tracks & Competition Winners
-- Supports per-track award management and winner selection
-- with confirmation/locking workflow
-- ============================================================

-- 1. Award tracks (competition-level)
CREATE TABLE IF NOT EXISTS award_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  track_type TEXT NOT NULL CHECK (track_type IN ('sector', 'innovation', 'special', 'custom')),
  scoring_criteria JSONB DEFAULT '[]',
  is_weighted BOOLEAN DEFAULT false,
  scoring_scale_max INTEGER DEFAULT 10,
  phase_id UUID REFERENCES competition_phases(id),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_award_tracks_hackathon ON award_tracks(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_award_tracks_phase ON award_tracks(phase_id);

-- 2. Competition winners
CREATE TABLE IF NOT EXISTS competition_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  award_track_id UUID REFERENCES award_tracks(id),
  registration_id UUID NOT NULL REFERENCES hackathon_registrations(id),
  phase_id UUID REFERENCES competition_phases(id),
  award_label TEXT NOT NULL,
  rank INTEGER,
  final_score NUMERIC,
  confirmed BOOLEAN DEFAULT false,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hackathon_id, award_track_id, registration_id)
);

CREATE INDEX IF NOT EXISTS idx_competition_winners_hackathon ON competition_winners(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_competition_winners_track ON competition_winners(award_track_id);
CREATE INDEX IF NOT EXISTS idx_competition_winners_registration ON competition_winners(registration_id);

-- 3. Updated_at triggers
CREATE TRIGGER update_award_tracks_updated_at
  BEFORE UPDATE ON award_tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competition_winners_updated_at
  BEFORE UPDATE ON competition_winners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS
ALTER TABLE award_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_winners ENABLE ROW LEVEL SECURITY;

-- Organizer full access to award tracks
CREATE POLICY "Organizer full access to award tracks"
  ON award_tracks FOR ALL
  USING (hackathon_id IN (SELECT id FROM hackathons WHERE organizer_id = auth.uid()));

-- Organizer full access to competition winners
CREATE POLICY "Organizer full access to competition winners"
  ON competition_winners FOR ALL
  USING (hackathon_id IN (SELECT id FROM hackathons WHERE organizer_id = auth.uid()));

-- Public read for confirmed and locked winners
CREATE POLICY "Public read confirmed winners"
  ON competition_winners FOR SELECT
  USING (confirmed = true AND locked = true);

-- Public read for award tracks (so public pages can display track info)
CREATE POLICY "Public read award tracks"
  ON award_tracks FOR SELECT
  USING (true);
