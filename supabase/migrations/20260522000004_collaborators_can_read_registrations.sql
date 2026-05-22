-- ============================================================
-- Allow accepted hackathon collaborators to read / update
-- hackathon_registrations
--
-- The previous RLS only allowed the registrant themselves or the
-- hackathon owner (organizer_id) to access registration rows. Invited
-- co-organizers had API-level access (checkHackathonAccess) but their
-- SELECT queries returned zero rows because RLS filtered them all out.
-- ============================================================

CREATE POLICY "Collaborators can view registrations"
  ON hackathon_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hackathon_collaborators c
      WHERE c.hackathon_id = hackathon_registrations.hackathon_id
        AND c.user_id = auth.uid()
        AND c.accepted_at IS NOT NULL
    )
  );

-- Editors / admins can also accept / reject / waitlist registrants.
-- Viewers stay read-only via the SELECT policy above.
CREATE POLICY "Editor collaborators can update registrations"
  ON hackathon_registrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM hackathon_collaborators c
      WHERE c.hackathon_id = hackathon_registrations.hackathon_id
        AND c.user_id = auth.uid()
        AND c.accepted_at IS NOT NULL
        AND c.role IN ('owner', 'admin', 'editor')
    )
  );
