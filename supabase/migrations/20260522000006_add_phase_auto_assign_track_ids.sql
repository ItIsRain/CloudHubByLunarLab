-- ============================================================
-- Add auto_assign_track_ids to competition_phases
--
-- Ordered list of award_track_ids that the per-phase "Auto-assign
-- winners" action consumes. Position 0 = highest-scored team in this
-- phase, position 1 = second highest, etc. Null / empty array means
-- no automation is configured for the phase.
-- ============================================================

ALTER TABLE competition_phases
  ADD COLUMN IF NOT EXISTS auto_assign_track_ids UUID[] NULL;
