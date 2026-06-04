-- ============================================================
-- Extend mentor_sessions for hackathon date-based bookings:
--  - meeting_phone (alongside meeting_url)
--  - availability_block_id (source block of the booked slot)
--  - repoint mentor_id/mentee_id/cancelled_by FKs to public.profiles
--    so PostgREST profile embeds resolve (table currently empty)
--  - partial unique index = authoritative double-booking guard
-- ============================================================

ALTER TABLE public.mentor_sessions
  ADD COLUMN IF NOT EXISTS meeting_phone TEXT
    CHECK (meeting_phone IS NULL OR char_length(meeting_phone) <= 50),
  ADD COLUMN IF NOT EXISTS availability_block_id UUID
    REFERENCES public.mentor_availability_blocks(id) ON DELETE SET NULL;

-- Repoint FKs from auth.users to public.profiles (profiles.id -> auth.users.id
-- ON DELETE CASCADE preserves cascade). Keeps the same constraint names so the
-- existing profiles!mentor_sessions_mentor_id_fkey(*) embeds now resolve.
ALTER TABLE public.mentor_sessions DROP CONSTRAINT IF EXISTS mentor_sessions_mentor_id_fkey;
ALTER TABLE public.mentor_sessions DROP CONSTRAINT IF EXISTS mentor_sessions_mentee_id_fkey;
ALTER TABLE public.mentor_sessions DROP CONSTRAINT IF EXISTS mentor_sessions_cancelled_by_fkey;

ALTER TABLE public.mentor_sessions
  ADD CONSTRAINT mentor_sessions_mentor_id_fkey
    FOREIGN KEY (mentor_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT mentor_sessions_mentee_id_fkey
    FOREIGN KEY (mentee_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT mentor_sessions_cancelled_by_fkey
    FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- A mentor's slot can be held by at most one pending/confirmed session.
-- A second concurrent booking for the same instant fails with 23505 -> 409.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mentor_slot_hold
  ON public.mentor_sessions(mentor_id, hackathon_id, session_date)
  WHERE status IN ('pending','confirmed');
