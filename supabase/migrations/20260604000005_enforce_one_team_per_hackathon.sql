-- ============================================================
-- Enforce: a user may be on at most ONE team per hackathon.
-- The API routes check this before inserting, but that check is
-- non-atomic (TOCTOU race) and can be bypassed by a direct client
-- insert. This BEFORE INSERT trigger makes the invariant impossible
-- to violate, regardless of the path. Raises unique_violation (23505)
-- so existing route error handlers surface a friendly message.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_one_team_per_hackathon()
RETURNS TRIGGER AS $$
DECLARE
  v_hackathon_id uuid;
BEGIN
  SELECT hackathon_id INTO v_hackathon_id FROM public.teams WHERE id = NEW.team_id;

  IF v_hackathon_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = NEW.user_id
      AND t.hackathon_id = v_hackathon_id
      AND tm.team_id <> NEW.team_id
  ) THEN
    RAISE EXCEPTION 'User is already on a team for this competition'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.enforce_one_team_per_hackathon() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_one_team_per_hackathon ON public.team_members;
CREATE TRIGGER trg_one_team_per_hackathon
  BEFORE INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_one_team_per_hackathon();
