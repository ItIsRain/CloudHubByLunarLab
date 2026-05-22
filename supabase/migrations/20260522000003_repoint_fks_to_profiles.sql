-- ============================================================
-- Repoint reports / screening_overrides FKs to public.profiles
--
-- The FKs from reports.reporter_id, reports.resolved_by, and
-- screening_overrides.overridden_by previously targeted auth.users(id).
-- That meant PostgREST could not resolve nested-select joins like
--   profiles!reporter_id(*)
--   profiles!screening_overrides_overridden_by_fkey(name, email)
-- and the admin endpoints failed with PGRST200:
--   "Could not find a relationship between 'reports' and 'profiles'
--   in the schema cache"
--
-- Re-point each FK to public.profiles. Cascade behavior is preserved
-- because profiles.id → auth.users.id ON DELETE CASCADE, so deleting
-- an auth.users row still drops dependent rows transitively.
-- ============================================================

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_resolved_by_fkey;
ALTER TABLE screening_overrides DROP CONSTRAINT IF EXISTS screening_overrides_overridden_by_fkey;

ALTER TABLE reports
  ADD CONSTRAINT reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT reports_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE screening_overrides
  ADD CONSTRAINT screening_overrides_overridden_by_fkey
    FOREIGN KEY (overridden_by) REFERENCES profiles(id) ON DELETE SET NULL;
