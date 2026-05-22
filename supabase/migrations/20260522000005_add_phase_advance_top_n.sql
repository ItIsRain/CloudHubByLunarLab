-- ============================================================
-- Add advance_top_n to competition_phases
--
-- Lets the organizer pre-configure how many of this phase's scored
-- entries should auto-advance to a downstream phase (one that lists
-- this phase in its source_phase_ids). The destination phase's
-- finalist auto-select dialog defaults topN to this value, so the
-- organizer doesn't have to remember it at promotion time.
--
-- Null = no preset; user enters topN manually.
-- ============================================================

ALTER TABLE competition_phases
  ADD COLUMN IF NOT EXISTS advance_top_n INTEGER NULL
    CHECK (advance_top_n IS NULL OR (advance_top_n >= 1 AND advance_top_n <= 500));
