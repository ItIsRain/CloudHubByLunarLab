-- =====================================================
-- Webhooks system for third-party integrations
-- =====================================================

-- Webhook endpoints configured by users
CREATE TABLE IF NOT EXISTS webhooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url         text NOT NULL,
  description text,
  events      text[] NOT NULL DEFAULT '{}',
  secret      text NOT NULL,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  failure_count integer NOT NULL DEFAULT 0,
  last_triggered_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_status ON webhooks(status) WHERE status = 'active';

-- Webhook delivery log for debugging and retry tracking
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id   uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}',
  response_status integer,
  response_body text,
  success      boolean NOT NULL DEFAULT false,
  duration_ms  integer,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_webhooks_updated_at();

-- RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Webhooks: users can only see/manage their own
CREATE POLICY webhooks_select ON webhooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY webhooks_insert ON webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY webhooks_update ON webhooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY webhooks_delete ON webhooks
  FOR DELETE USING (auth.uid() = user_id);

-- Webhook deliveries: users can only see deliveries for their own webhooks
CREATE POLICY webhook_deliveries_select ON webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_deliveries.webhook_id
        AND webhooks.user_id = auth.uid()
    )
  );

-- Service role can insert deliveries (fired from server)
CREATE POLICY webhook_deliveries_insert ON webhook_deliveries
  FOR INSERT WITH CHECK (true);
