-- Phase 66: Production-Grade Rate Limiting
-- Persistent token buckets, circuit breaker state, and queued webhook dispatch jobs.

CREATE TABLE public.webhook_provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL DEFAULT public.get_user_county_id() REFERENCES public.counties(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  token_capacity INTEGER NOT NULL DEFAULT 60 CHECK (token_capacity > 0),
  tokens_available NUMERIC(12,4) NOT NULL DEFAULT 60 CHECK (tokens_available >= 0),
  refill_per_minute INTEGER NOT NULL DEFAULT 60 CHECK (refill_per_minute > 0),
  circuit_state TEXT NOT NULL DEFAULT 'closed' CHECK (circuit_state IN ('closed', 'open', 'half_open')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  queued_requests INTEGER NOT NULL DEFAULT 0 CHECK (queued_requests >= 0),
  total_requests BIGINT NOT NULL DEFAULT 0 CHECK (total_requests >= 0),
  total_delivered BIGINT NOT NULL DEFAULT 0 CHECK (total_delivered >= 0),
  total_failed BIGINT NOT NULL DEFAULT 0 CHECK (total_failed >= 0),
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  open_until TIMESTAMPTZ,
  last_request_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(county_id, provider_key)
);

CREATE TABLE public.webhook_dispatch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL DEFAULT public.get_user_county_id() REFERENCES public.counties(id) ON DELETE CASCADE,
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'delivered', 'failed', 'cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  queued_reason TEXT,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_dispatch_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view provider health for their county"
  ON public.webhook_provider_health FOR SELECT TO authenticated
  USING (county_id = public.get_user_county_id());

CREATE POLICY "Users can manage provider health for their county"
  ON public.webhook_provider_health FOR ALL TO authenticated
  USING (county_id = public.get_user_county_id())
  WITH CHECK (county_id = public.get_user_county_id());

CREATE POLICY "Users can view webhook queue for their county"
  ON public.webhook_dispatch_queue FOR SELECT TO authenticated
  USING (county_id = public.get_user_county_id());

CREATE POLICY "Users can manage webhook queue for their county"
  ON public.webhook_dispatch_queue FOR ALL TO authenticated
  USING (county_id = public.get_user_county_id())
  WITH CHECK (county_id = public.get_user_county_id());

CREATE INDEX idx_webhook_provider_health_county_provider
  ON public.webhook_provider_health(county_id, provider_key);

CREATE INDEX idx_webhook_provider_health_state
  ON public.webhook_provider_health(circuit_state, updated_at DESC);

CREATE INDEX idx_webhook_dispatch_queue_county_status
  ON public.webhook_dispatch_queue(county_id, status, available_at);

CREATE INDEX idx_webhook_dispatch_queue_provider
  ON public.webhook_dispatch_queue(provider_key, status, available_at);

CREATE INDEX idx_webhook_dispatch_queue_endpoint
  ON public.webhook_dispatch_queue(endpoint_id, created_at DESC);

DROP TRIGGER IF EXISTS update_webhook_provider_health_updated_at ON public.webhook_provider_health;
CREATE TRIGGER update_webhook_provider_health_updated_at
  BEFORE UPDATE ON public.webhook_provider_health
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhook_dispatch_queue_updated_at ON public.webhook_dispatch_queue;
CREATE TRIGGER update_webhook_dispatch_queue_updated_at
  BEFORE UPDATE ON public.webhook_dispatch_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhook_endpoints_updated_at ON public.webhook_endpoints;
CREATE TRIGGER update_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();