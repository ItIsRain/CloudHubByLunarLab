-- ============================================================
-- mentor_availability_blocks: date-based availability for hackathon
-- mentors (distinct from the weekly, global mentor_availability table).
-- Each block is split into bookable slots of slot_duration_minutes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mentor_availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  mentor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_duration_minutes BETWEEN 10 AND 240),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_time < end_time),
  CHECK (EXTRACT(EPOCH FROM (end_time - start_time)) >= slot_duration_minutes * 60)
);

CREATE INDEX IF NOT EXISTS idx_mentor_avail_blocks_mentor_hack
  ON public.mentor_availability_blocks(mentor_user_id, hackathon_id);
CREATE INDEX IF NOT EXISTS idx_mentor_avail_blocks_date
  ON public.mentor_availability_blocks(hackathon_id, date);

CREATE TRIGGER trg_mentor_avail_blocks_updated_at
  BEFORE UPDATE ON public.mentor_availability_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.mentor_availability_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage mentor availability blocks"
  ON public.mentor_availability_blocks FOR ALL
  USING (hackathon_id IN (SELECT id FROM public.hackathons WHERE organizer_id = auth.uid()))
  WITH CHECK (hackathon_id IN (SELECT id FROM public.hackathons WHERE organizer_id = auth.uid()));

CREATE POLICY "Mentors manage own availability blocks"
  ON public.mentor_availability_blocks FOR ALL
  USING (mentor_user_id = auth.uid())
  WITH CHECK (mentor_user_id = auth.uid());

CREATE POLICY "Anyone can view accepted mentor availability"
  ON public.mentor_availability_blocks FOR SELECT
  USING (mentor_user_id IN (
    SELECT user_id FROM public.hackathon_mentors hm
    WHERE hm.status = 'accepted' AND hm.hackathon_id = mentor_availability_blocks.hackathon_id
  ));
