-- ============================================================
-- Add token column to hackathon_collaborators for email-accept flow
-- Mirrors judge_invitations.token: organizer sends email with a
-- one-shot accept link, invitee opens the link, the token is
-- validated, and accepted_at is flipped to NOW().
-- ============================================================

ALTER TABLE hackathon_collaborators
  ADD COLUMN IF NOT EXISTS token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS hackathon_collaborators_token_key
  ON hackathon_collaborators (token);
