-- =====================================================
-- Audit logs for platform-wide action tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (char_length(action) BETWEEN 1 AND 100),
  entity_type TEXT NOT NULL CHECK (char_length(entity_type) BETWEEN 1 AND 50),
  entity_id UUID,
  old_values JSONB DEFAULT '{}'::jsonb,
  new_values JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT CHECK (char_length(user_agent) <= 500),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure')),
  error_message TEXT CHECK (char_length(error_message) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Partitioning hint: consider range partitioning by created_at for large deployments

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND 'admin' = ANY(p.roles)
    )
  );

-- Users can view their own actions
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = actor_id);

-- No direct INSERT by users — service role only (API backend)
