-- Reminder automation rules for hackathon organizers
CREATE TABLE reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('incomplete_application', 'deadline_approaching', 'rsvp_confirmation')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_days_before INTEGER,
  trigger_hours_before INTEGER,
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,
  last_sent_at TIMESTAMPTZ,
  recipient_filter JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminder_rules_hackathon ON reminder_rules(hackathon_id);

ALTER TABLE reminder_rules ENABLE ROW LEVEL SECURITY;

-- RLS: organizer full access (same pattern as email_templates)
CREATE POLICY "Organizers can manage reminder rules"
  ON reminder_rules FOR ALL
  USING (
    hackathon_id IN (
      SELECT h.id FROM hackathons h WHERE h.organizer_id = auth.uid()
    )
  );

CREATE TRIGGER set_reminder_rules_updated_at
  BEFORE UPDATE ON reminder_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
