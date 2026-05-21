-- ============================================================
-- Add registration_sections column to hackathons
-- Stores section metadata (id, title, description, order) for the
-- multi-page registration form builder. Mirrors submission_sections
-- introduced in 20260322000001_submission_phase_integration.sql.
-- Without this column the form builder's PATCH update silently fails
-- and section titles/descriptions are lost on reload.
-- ============================================================

ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS registration_sections JSONB NOT NULL DEFAULT '[]';
