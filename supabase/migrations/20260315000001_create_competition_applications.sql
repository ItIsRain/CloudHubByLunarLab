-- =====================================================
-- Competition Forms & Applications System
-- Supports configurable application forms, submissions,
-- file uploads, screening, and eligibility tracking
-- =====================================================

-- =====================================================
-- 1. Competition Forms (schema definitions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.competition_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Form metadata
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  slug TEXT NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 1 AND 200),
  description TEXT,
  cover_image TEXT,
  logo TEXT,

  -- Competition details
  competition_name TEXT NOT NULL CHECK (char_length(competition_name) BETWEEN 1 AND 300),
  competition_type TEXT NOT NULL DEFAULT 'startup' CHECK (competition_type IN ('startup', 'hackathon', 'pitch', 'innovation', 'other')),

  -- Form schema (JSON array of field definitions)
  -- Each field: { id, type, label, placeholder, description, required, options, validation, section, order, conditionalOn }
  fields JSONB NOT NULL DEFAULT '[]',

  -- Sections for multi-step wizard
  -- Each section: { id, title, description, order }
  sections JSONB NOT NULL DEFAULT '[]',

  -- Settings
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  max_applications INTEGER,
  allow_edit_after_submit BOOLEAN NOT NULL DEFAULT false,
  confirmation_email_template TEXT,

  -- Branding
  primary_color TEXT DEFAULT '#ff4400',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_competition_forms_organizer ON public.competition_forms(organizer_id);
CREATE INDEX idx_competition_forms_slug ON public.competition_forms(slug);
CREATE INDEX idx_competition_forms_status ON public.competition_forms(status);

CREATE TRIGGER competition_forms_updated_at
  BEFORE UPDATE ON public.competition_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 2. Competition Applications (submitted data)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.competition_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  form_id UUID NOT NULL REFERENCES public.competition_forms(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Application data (JSON object with field_id -> value mapping)
  data JSONB NOT NULL DEFAULT '{}',

  -- Applicant identity (denormalized for screening)
  applicant_name TEXT NOT NULL CHECK (char_length(applicant_name) BETWEEN 1 AND 200),
  applicant_email TEXT NOT NULL CHECK (char_length(applicant_email) BETWEEN 3 AND 320),
  applicant_phone TEXT,
  startup_name TEXT,

  -- Location / campus assignment
  campus TEXT,
  sector TEXT,

  -- Status pipeline
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',           -- applicant started but not submitted
    'submitted',       -- applicant submitted
    'under_review',    -- admin moved to review
    'eligible',        -- passed automated screening
    'ineligible',      -- failed automated screening
    'accepted',        -- accepted into program
    'waitlisted',      -- on waitlist
    'rejected',        -- rejected
    'confirmed',       -- applicant confirmed attendance
    'declined',        -- applicant declined
    'withdrawn'        -- applicant withdrew
  )),

  -- Screening results
  completeness_score NUMERIC(5,2) DEFAULT 0,  -- 0-100 score based on field completeness
  eligibility_passed BOOLEAN,
  screening_completed_at TIMESTAMPTZ,
  screening_notes TEXT,

  -- Admin notes
  internal_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  -- Timestamps
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_applications_form ON public.competition_applications(form_id);
CREATE INDEX idx_applications_applicant ON public.competition_applications(applicant_id);
CREATE INDEX idx_applications_status ON public.competition_applications(form_id, status);
CREATE INDEX idx_applications_campus ON public.competition_applications(form_id, campus);
CREATE INDEX idx_applications_email ON public.competition_applications(applicant_email);
CREATE INDEX idx_applications_startup ON public.competition_applications(startup_name);
CREATE INDEX idx_applications_submitted ON public.competition_applications(form_id, submitted_at DESC) WHERE status != 'draft';

CREATE TRIGGER competition_applications_updated_at
  BEFORE UPDATE ON public.competition_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 3. Application Files (uploaded documents)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.application_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  application_id UUID NOT NULL REFERENCES public.competition_applications(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL,  -- references the field in the form schema

  -- File metadata
  file_name TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 500),
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),  -- max 10MB
  storage_path TEXT NOT NULL,  -- Supabase Storage path

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_application_files_app ON public.application_files(application_id);


-- =====================================================
-- 4. Screening Rules (configurable eligibility checks)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.screening_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  form_id UUID NOT NULL REFERENCES public.competition_forms(id) ON DELETE CASCADE,

  -- Rule definition
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('hard', 'soft')),  -- hard = pass/fail, soft = flag only

  -- Field to evaluate
  field_id TEXT NOT NULL,  -- references field in form schema

  -- Operator and value
  operator TEXT NOT NULL CHECK (operator IN (
    'equals', 'not_equals',
    'contains', 'not_contains',
    'greater_than', 'less_than', 'greater_equal', 'less_equal',
    'in', 'not_in',
    'is_empty', 'is_not_empty',
    'is_true', 'is_false'
  )),
  value JSONB,  -- the value to compare against (type depends on operator)

  -- Rule ordering and status
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screening_rules_form ON public.screening_rules(form_id, sort_order);

CREATE TRIGGER screening_rules_updated_at
  BEFORE UPDATE ON public.screening_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 5. Screening Results (per-application, per-rule)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.screening_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  application_id UUID NOT NULL REFERENCES public.competition_applications(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.screening_rules(id) ON DELETE CASCADE,

  passed BOOLEAN NOT NULL,
  actual_value JSONB,  -- what the applicant provided
  reason TEXT,  -- human-readable explanation

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (application_id, rule_id)
);

CREATE INDEX idx_screening_results_app ON public.screening_results(application_id);


-- =====================================================
-- 6. Screening Flags (duplicates + soft warnings)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.screening_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  application_id UUID NOT NULL REFERENCES public.competition_applications(id) ON DELETE CASCADE,

  flag_type TEXT NOT NULL CHECK (flag_type IN ('duplicate_email', 'duplicate_phone', 'duplicate_linkedin', 'duplicate_startup', 'soft_warning', 'manual')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  related_application_id UUID REFERENCES public.competition_applications(id) ON DELETE SET NULL,

  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screening_flags_app ON public.screening_flags(application_id);
CREATE INDEX idx_screening_flags_type ON public.screening_flags(flag_type) WHERE NOT resolved;


-- =====================================================
-- 7. Campus Quotas (configurable per form)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.campus_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  form_id UUID NOT NULL REFERENCES public.competition_forms(id) ON DELETE CASCADE,
  campus TEXT NOT NULL,
  quota INTEGER NOT NULL CHECK (quota > 0),

  UNIQUE (form_id, campus)
);

CREATE INDEX idx_campus_quotas_form ON public.campus_quotas(form_id);


-- =====================================================
-- Row Level Security
-- =====================================================

-- Competition Forms
ALTER TABLE public.competition_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published forms are public"
  ON public.competition_forms FOR SELECT
  USING (status IN ('published', 'closed') OR auth.uid() = organizer_id);

CREATE POLICY "Organizers can create forms"
  ON public.competition_forms FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update own forms"
  ON public.competition_forms FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete own forms"
  ON public.competition_forms FOR DELETE
  USING (auth.uid() = organizer_id);

-- Competition Applications
ALTER TABLE public.competition_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view own applications"
  ON public.competition_applications FOR SELECT
  USING (auth.uid() = applicant_id);

CREATE POLICY "Form organizers can view applications"
  ON public.competition_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_forms
      WHERE id = competition_applications.form_id
      AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create applications"
  ON public.competition_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Applicants can update draft applications"
  ON public.competition_applications FOR UPDATE
  USING (auth.uid() = applicant_id AND status IN ('draft', 'submitted'));

CREATE POLICY "Organizers can update application status"
  ON public.competition_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_forms
      WHERE id = competition_applications.form_id
      AND organizer_id = auth.uid()
    )
  );

-- Application Files
ALTER TABLE public.application_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Application file access follows application access"
  ON public.application_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_applications a
      WHERE a.id = application_files.application_id
      AND (
        a.applicant_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.competition_forms f
          WHERE f.id = a.form_id AND f.organizer_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Applicants can upload files"
  ON public.application_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competition_applications a
      WHERE a.id = application_files.application_id
      AND a.applicant_id = auth.uid()
    )
  );

-- Screening Rules (organizer access only)
ALTER TABLE public.screening_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage screening rules"
  ON public.screening_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_forms f
      WHERE f.id = screening_rules.form_id
      AND f.organizer_id = auth.uid()
    )
  );

-- Screening Results (organizer access only)
ALTER TABLE public.screening_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view screening results"
  ON public.screening_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_applications a
      JOIN public.competition_forms f ON f.id = a.form_id
      WHERE a.id = screening_results.application_id
      AND f.organizer_id = auth.uid()
    )
  );

-- Screening Flags (organizer access only)
ALTER TABLE public.screening_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage screening flags"
  ON public.screening_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_applications a
      JOIN public.competition_forms f ON f.id = a.form_id
      WHERE a.id = screening_flags.application_id
      AND f.organizer_id = auth.uid()
    )
  );

-- Campus Quotas (organizer access only)
ALTER TABLE public.campus_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage quotas"
  ON public.campus_quotas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_forms f
      WHERE f.id = campus_quotas.form_id
      AND f.organizer_id = auth.uid()
    )
  );

-- Public can view quotas for published forms
CREATE POLICY "Public can view quotas"
  ON public.campus_quotas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_forms f
      WHERE f.id = campus_quotas.form_id
      AND f.status IN ('published', 'closed')
    )
  );


-- =====================================================
-- Storage bucket for application files
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-files',
  'application-files',
  false,
  10485760,  -- 10MB
  ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload application files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'application-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own application files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'application-files' AND auth.uid() IS NOT NULL);


-- =====================================================
-- Helper view: Application summary by campus
-- =====================================================
CREATE OR REPLACE VIEW public.application_campus_summary AS
SELECT
  form_id,
  campus,
  COUNT(*) FILTER (WHERE status != 'draft') AS total_submitted,
  COUNT(*) FILTER (WHERE status = 'submitted') AS pending_review,
  COUNT(*) FILTER (WHERE status = 'eligible') AS eligible,
  COUNT(*) FILTER (WHERE status = 'ineligible') AS ineligible,
  COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
  COUNT(*) FILTER (WHERE status = 'waitlisted') AS waitlisted,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
  COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
  COUNT(*) FILTER (WHERE status = 'declined') AS declined,
  COUNT(*) FILTER (WHERE status = 'draft') AS incomplete
FROM public.competition_applications
GROUP BY form_id, campus;
