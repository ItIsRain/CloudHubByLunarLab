-- Add results_published_at column to hackathon_registrations
-- This tracks whether screening results have been published (emails sent) for this registration.
-- When NULL, results have been computed but not yet communicated to the applicant.
-- When set, the applicant has been notified of their screening outcome.

ALTER TABLE hackathon_registrations
  ADD COLUMN IF NOT EXISTS results_published_at TIMESTAMPTZ;

COMMENT ON COLUMN hackathon_registrations.results_published_at
  IS 'Timestamp when screening results were published (emails/notifications sent) to the applicant. NULL means results not yet published.';
