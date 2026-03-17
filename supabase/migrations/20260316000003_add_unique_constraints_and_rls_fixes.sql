-- ============================================================
-- Migration: Add missing UNIQUE constraints and RLS fixes
-- ============================================================

-- 1. UNIQUE constraint on competition_applications(form_id, applicant_id)
-- Prevents duplicate submissions from the same user for the same form.
-- WHERE clause allows NULL applicant_id (anonymous drafts) to coexist.
CREATE UNIQUE INDEX IF NOT EXISTS uq_competition_applications_form_applicant
  ON competition_applications (form_id, applicant_id)
  WHERE applicant_id IS NOT NULL AND status != 'withdrawn';

-- 2. UNIQUE constraint on hackathon_registrations(hackathon_id, user_id)
-- Prevents duplicate registrations for the same hackathon.
-- Only enforce for non-cancelled statuses.
CREATE UNIQUE INDEX IF NOT EXISTS uq_hackathon_registrations_hackathon_user
  ON hackathon_registrations (hackathon_id, user_id)
  WHERE status NOT IN ('cancelled');

-- 3. Enable RLS on hackathon_registrations (if not already enabled)
ALTER TABLE hackathon_registrations ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for hackathon_registrations
-- Users can view their own registrations
CREATE POLICY "Users can view own registration"
  ON hackathon_registrations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Organizers can view all registrations for their hackathons
CREATE POLICY "Organizers can view hackathon registrations"
  ON hackathon_registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_registrations.hackathon_id
        AND h.organizer_id = auth.uid()
    )
  );

-- Reviewers can view registrations they are assigned to review
CREATE POLICY "Reviewers can view assigned registrations"
  ON hackathon_registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reviewer_assignments ra
      WHERE ra.registration_id = hackathon_registrations.id
        AND ra.reviewer_id = auth.uid()
    )
  );

-- Users can insert their own registrations
CREATE POLICY "Users can register themselves"
  ON hackathon_registrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own registration (limited columns via trigger below)
CREATE POLICY "Users can update own registration"
  ON hackathon_registrations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Organizers can update registrations for their hackathons
CREATE POLICY "Organizers can update hackathon registrations"
  ON hackathon_registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_registrations.hackathon_id
        AND h.organizer_id = auth.uid()
    )
  );

-- 5. Trigger to restrict applicant self-updates to safe columns only.
-- Prevents applicants from changing status, eligibility, screening results, etc.
CREATE OR REPLACE FUNCTION restrict_registration_self_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If the updater is the registration owner (not organizer), enforce column restrictions
  IF OLD.user_id = auth.uid() THEN
    -- Only allow changes to form_data (edit profile/form) and status = 'cancelled' (self-cancel)
    NEW.user_id := OLD.user_id;
    NEW.hackathon_id := OLD.hackathon_id;
    NEW.eligibility_passed := OLD.eligibility_passed;
    NEW.screening_completed_at := OLD.screening_completed_at;
    NEW.screening_results := OLD.screening_results;
    NEW.screening_flags := OLD.screening_flags;
    NEW.completeness_score := OLD.completeness_score;
    NEW.internal_notes := OLD.internal_notes;
    NEW.results_published_at := OLD.results_published_at;
    -- Allow status change ONLY to 'cancelled' (self-cancel) or FROM 'cancelled' (re-registration)
    IF NEW.status != OLD.status AND NEW.status != 'cancelled' AND OLD.status != 'cancelled' THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER restrict_registration_self_update
  BEFORE UPDATE ON hackathon_registrations
  FOR EACH ROW
  EXECUTE FUNCTION restrict_registration_self_update();

-- 6. Tighten storage bucket policy for application-files
-- Replace the overly permissive SELECT policy with one scoped to file owners and organizers
DROP POLICY IF EXISTS "Authenticated users can read application files" ON storage.objects;

CREATE POLICY "Users can read own application files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'application-files'
    AND auth.uid() IS NOT NULL
    AND (
      -- File owner (path starts with user ID)
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- Form organizer
      EXISTS (
        SELECT 1 FROM competition_forms cf
        WHERE cf.organizer_id = auth.uid()
          AND (storage.foldername(name))[2] = cf.id::text
      )
    )
  );
