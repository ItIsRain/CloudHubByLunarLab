-- =====================================================
-- Mentor availability and session booking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mentor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

CREATE INDEX idx_mentor_avail_mentor ON public.mentor_availability(mentor_id);
CREATE INDEX idx_mentor_avail_hackathon ON public.mentor_availability(hackathon_id) WHERE hackathon_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.mentor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT CHECK (char_length(description) <= 1000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  session_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 15 AND 120),
  meeting_url TEXT CHECK (char_length(meeting_url) <= 500),
  platform TEXT CHECK (platform IN ('zoom', 'google_meet', 'teams', 'discord', 'in_person', 'other')),
  notes TEXT CHECK (char_length(notes) <= 2000),
  mentor_feedback_rating INTEGER CHECK (mentor_feedback_rating BETWEEN 1 AND 5),
  mentor_feedback_comment TEXT CHECK (char_length(mentor_feedback_comment) <= 1000),
  mentee_feedback_rating INTEGER CHECK (mentee_feedback_rating BETWEEN 1 AND 5),
  mentee_feedback_comment TEXT CHECK (char_length(mentee_feedback_comment) <= 1000),
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT CHECK (char_length(cancellation_reason) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentor_sessions_mentor ON public.mentor_sessions(mentor_id);
CREATE INDEX idx_mentor_sessions_mentee ON public.mentor_sessions(mentee_id);
CREATE INDEX idx_mentor_sessions_hackathon ON public.mentor_sessions(hackathon_id) WHERE hackathon_id IS NOT NULL;
CREATE INDEX idx_mentor_sessions_date ON public.mentor_sessions(session_date);
CREATE INDEX idx_mentor_sessions_status ON public.mentor_sessions(status);

-- Trigger
CREATE TRIGGER mentor_sessions_updated_at
  BEFORE UPDATE ON public.mentor_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;

-- Availability: anyone can view active slots
CREATE POLICY "Anyone can view active mentor availability"
  ON public.mentor_availability FOR SELECT
  USING (is_active = true OR mentor_id = auth.uid());

CREATE POLICY "Mentors can manage own availability"
  ON public.mentor_availability FOR INSERT
  WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Mentors can update own availability"
  ON public.mentor_availability FOR UPDATE
  USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can delete own availability"
  ON public.mentor_availability FOR DELETE
  USING (auth.uid() = mentor_id);

-- Sessions: mentor and mentee can view
CREATE POLICY "Participants can view own sessions"
  ON public.mentor_sessions FOR SELECT
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

-- Mentees can create session requests
CREATE POLICY "Mentees can request sessions"
  ON public.mentor_sessions FOR INSERT
  WITH CHECK (auth.uid() = mentee_id AND status = 'pending');

-- Both parties can update (confirm, complete, feedback)
CREATE POLICY "Participants can update sessions"
  ON public.mentor_sessions FOR UPDATE
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
