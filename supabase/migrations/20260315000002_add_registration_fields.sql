-- Add registration_fields JSONB column to hackathons table
-- This stores the form schema (array of FormField objects) that registrants must fill out
ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS registration_fields jsonb DEFAULT '[]'::jsonb;

-- Add form_data JSONB column to hackathon_registrations table
-- This stores the registrant's responses to the custom registration form
ALTER TABLE hackathon_registrations ADD COLUMN IF NOT EXISTS form_data jsonb DEFAULT '{}'::jsonb;

-- Add registration_fields to events table too (events already have custom_fields on registrations)
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_fields jsonb DEFAULT '[]'::jsonb;

-- Add index for querying registrations with form data
CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_form_data ON hackathon_registrations USING gin (form_data) WHERE form_data IS NOT NULL AND form_data != '{}'::jsonb;
