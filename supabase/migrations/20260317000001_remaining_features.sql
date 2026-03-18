-- ============================================================
-- Remaining Features Migration
-- Draft saving, application editing, email templates,
-- screening overrides, RSVP, conflict of interest
-- ============================================================

-- 1. Hackathon columns for editing deadline and RSVP
ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS registration_editable_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMPTZ;

-- 2. Registration columns for draft and RSVP
ALTER TABLE hackathon_registrations
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rsvp_status TEXT CHECK (rsvp_status IN ('pending', 'confirmed', 'declined')),
  ADD COLUMN IF NOT EXISTS rsvp_responded_at TIMESTAMPTZ;

-- 3. Screening Overrides (manual override audit trail)
CREATE TABLE screening_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES hackathon_registrations(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  overridden_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screening_overrides_hackathon ON screening_overrides(hackathon_id);
CREATE INDEX idx_screening_overrides_registration ON screening_overrides(registration_id);

-- 4. Email Templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom'
    CHECK (category IN ('acceptance', 'rejection', 'waitlist', 'reminder', 'announcement', 'rsvp', 'custom')),
  placeholders JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_templates_hackathon ON email_templates(hackathon_id);
CREATE INDEX idx_email_templates_category ON email_templates(category);

-- 5. Scheduled Emails
CREATE TABLE scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_filter JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_emails_hackathon ON scheduled_emails(hackathon_id);
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX idx_scheduled_emails_scheduled_at ON scheduled_emails(scheduled_at);

-- 6. Email Log
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  scheduled_email_id UUID REFERENCES scheduled_emails(id) ON DELETE SET NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'opened', 'bounced', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_log_hackathon ON email_log(hackathon_id);
CREATE INDEX idx_email_log_scheduled ON email_log(scheduled_email_id);
CREATE INDEX idx_email_log_recipient ON email_log(recipient_user_id);
CREATE INDEX idx_email_log_status ON email_log(status);

-- 7. Reviewer Conflicts (conflict of interest)
CREATE TABLE reviewer_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES competition_phases(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES hackathon_registrations(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('self_registration', 'same_team', 'declared')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  UNIQUE(phase_id, reviewer_id, registration_id)
);

CREATE INDEX idx_reviewer_conflicts_phase ON reviewer_conflicts(phase_id);
CREATE INDEX idx_reviewer_conflicts_reviewer ON reviewer_conflicts(reviewer_id);

-- 8. Updated_at triggers
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. RLS Policies
ALTER TABLE screening_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviewer_conflicts ENABLE ROW LEVEL SECURITY;

-- screening_overrides: organizer full access
CREATE POLICY "Organizers can manage screening overrides"
  ON screening_overrides FOR ALL
  USING (
    hackathon_id IN (
      SELECT h.id FROM hackathons h WHERE h.organizer_id = auth.uid()
    )
  );

-- email_templates: organizer full access
CREATE POLICY "Organizers can manage email templates"
  ON email_templates FOR ALL
  USING (
    hackathon_id IN (
      SELECT h.id FROM hackathons h WHERE h.organizer_id = auth.uid()
    )
  );

-- scheduled_emails: organizer full access
CREATE POLICY "Organizers can manage scheduled emails"
  ON scheduled_emails FOR ALL
  USING (
    hackathon_id IN (
      SELECT h.id FROM hackathons h WHERE h.organizer_id = auth.uid()
    )
  );

-- email_log: organizer read access
CREATE POLICY "Organizers can view email logs"
  ON email_log FOR SELECT
  USING (
    hackathon_id IN (
      SELECT h.id FROM hackathons h WHERE h.organizer_id = auth.uid()
    )
  );

-- reviewer_conflicts: organizer full access
CREATE POLICY "Organizers can manage reviewer conflicts"
  ON reviewer_conflicts FOR ALL
  USING (
    phase_id IN (
      SELECT cp.id FROM competition_phases cp
      WHERE cp.hackathon_id IN (
        SELECT h.id FROM hackathons h WHERE h.organizer_id = auth.uid()
      )
    )
  );

-- reviewer_conflicts: reviewers can view own conflicts
CREATE POLICY "Reviewers can view own conflicts"
  ON reviewer_conflicts FOR SELECT
  USING (reviewer_id = auth.uid());
