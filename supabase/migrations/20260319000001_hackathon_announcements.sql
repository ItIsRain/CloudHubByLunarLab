-- ============================================================
-- Hackathon Announcements Table
-- Stores announcements sent to hackathon participants with
-- audience targeting support.
-- ============================================================

CREATE TABLE hackathon_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'accepted', 'waitlisted', 'rejected', 'confirmed', 'pending', 'eligible', 'ineligible')),
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_hackathon ON hackathon_announcements(hackathon_id, sent_at DESC);

ALTER TABLE hackathon_announcements ENABLE ROW LEVEL SECURITY;

-- Organizer full access
CREATE POLICY announcements_organizer_all ON hackathon_announcements FOR ALL
  USING (EXISTS(SELECT 1 FROM hackathons h WHERE h.id = hackathon_announcements.hackathon_id AND h.organizer_id = auth.uid()));
