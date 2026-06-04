-- ============================================================
-- hackathon_mentors: real-account mentor roster per hackathon.
-- Mirrors the judge invitation/linkage pattern: organizer invites
-- by email (status 'invited', user_id NULL), mentor accepts via
-- token (email-matched) which links their real account (user_id)
-- and flips status to 'accepted'. Stores per-mentor default meeting
-- link/phone applied to all their sessions for this hackathon.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  expertise TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 2000),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','accepted','declined')),
  invitation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  default_meeting_url TEXT CHECK (default_meeting_url IS NULL OR char_length(default_meeting_url) <= 500),
  default_meeting_phone TEXT CHECK (default_meeting_phone IS NULL OR char_length(default_meeting_phone) <= 50),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hackathon_id, email)
);

-- One roster row per linked user per hackathon (only once accepted).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_hackathon_mentors_user
  ON public.hackathon_mentors(hackathon_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hackathon_mentors_hackathon ON public.hackathon_mentors(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_mentors_user ON public.hackathon_mentors(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hackathon_mentors_token ON public.hackathon_mentors(invitation_token);

CREATE TRIGGER trg_hackathon_mentors_updated_at
  BEFORE UPDATE ON public.hackathon_mentors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.hackathon_mentors ENABLE ROW LEVEL SECURITY;

-- Organizers fully manage their hackathon's mentor roster.
CREATE POLICY "Organizers manage hackathon mentors"
  ON public.hackathon_mentors FOR ALL
  USING (hackathon_id IN (SELECT id FROM public.hackathons WHERE organizer_id = auth.uid()))
  WITH CHECK (hackathon_id IN (SELECT id FROM public.hackathons WHERE organizer_id = auth.uid()));

-- A linked mentor can view their own roster row.
CREATE POLICY "Mentors view own roster row"
  ON public.hackathon_mentors FOR SELECT
  USING (user_id = auth.uid());

-- A linked mentor can update their own roster row (defaults/bio/expertise/
-- accept-decline). The trigger below restricts which columns actually change.
CREATE POLICY "Mentors update own roster row"
  ON public.hackathon_mentors FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone (participants) can view accepted mentors of a hackathon. API routes
-- must project non-email columns for public/participant consumers.
CREATE POLICY "Anyone can view accepted mentors"
  ON public.hackathon_mentors FOR SELECT
  USING (status = 'accepted');

-- Restrict mentor self-updates: a non-organizer mentor editing their own row
-- may only change expertise/bio/default_meeting_url/default_meeting_phone and
-- move status to accepted/declined. Immutable identity columns are frozen.
CREATE OR REPLACE FUNCTION restrict_mentor_self_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.user_id = auth.uid() AND NOT EXISTS (
    SELECT 1 FROM hackathons h WHERE h.id = OLD.hackathon_id AND h.organizer_id = auth.uid()
  ) THEN
    NEW.hackathon_id := OLD.hackathon_id;
    NEW.user_id := OLD.user_id;
    NEW.email := OLD.email;
    NEW.name := OLD.name;
    NEW.invited_at := OLD.invited_at;
    NEW.invitation_token := OLD.invitation_token;
    IF NEW.status NOT IN ('accepted','declined') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_restrict_mentor_self_update
  BEFORE UPDATE ON public.hackathon_mentors
  FOR EACH ROW EXECUTE FUNCTION restrict_mentor_self_update();
