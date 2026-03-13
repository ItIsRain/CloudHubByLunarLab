-- =====================================================
-- Certificates for event/hackathon participation & wins
-- =====================================================

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('participation', 'winner', 'runner_up', 'mentor', 'judge', 'organizer', 'speaker', 'volunteer')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT CHECK (char_length(description) <= 1000),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_code TEXT NOT NULL UNIQUE,
  template JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (event_id IS NOT NULL AND hackathon_id IS NULL)
    OR (event_id IS NULL AND hackathon_id IS NOT NULL)
  )
);

CREATE INDEX idx_certificates_user ON public.certificates(user_id);
CREATE INDEX idx_certificates_event ON public.certificates(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_certificates_hackathon ON public.certificates(hackathon_id) WHERE hackathon_id IS NOT NULL;
CREATE UNIQUE INDEX idx_certificates_verification ON public.certificates(verification_code);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Anyone can view certificates (public verification)
CREATE POLICY "Certificates are publicly viewable"
  ON public.certificates FOR SELECT
  USING (true);

-- Only service role inserts certificates (via API)
-- No INSERT policy for regular users — backend issues certificates
