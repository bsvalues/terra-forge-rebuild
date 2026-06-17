CREATE TABLE IF NOT EXISTS public.data_quarantine (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id       UUID NOT NULL,
  source          TEXT NOT NULL,
  source_product  TEXT,
  reason_code     TEXT NOT NULL,
  reason_detail   TEXT,
  severity        TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  payload         JSONB NOT NULL,
  payload_hash    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','restored','discarded')),
  reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  trace_event_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_quarantine_county_status
  ON public.data_quarantine (county_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_quarantine_source
  ON public.data_quarantine (county_id, source, source_product, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_data_quarantine_dedup
  ON public.data_quarantine (county_id, source, reason_code, payload_hash)
  WHERE status = 'pending';

GRANT SELECT, UPDATE ON public.data_quarantine TO authenticated;
GRANT ALL ON public.data_quarantine TO service_role;

ALTER TABLE public.data_quarantine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "County-scoped read data_quarantine"
  ON public.data_quarantine
  FOR SELECT
  TO authenticated
  USING (county_id = public.get_user_county_id());

CREATE POLICY "Admins manage data_quarantine in their county"
  ON public.data_quarantine
  FOR UPDATE
  TO authenticated
  USING (public.is_admin() AND county_id = public.get_user_county_id())
  WITH CHECK (public.is_admin() AND county_id = public.get_user_county_id());

CREATE OR REPLACE FUNCTION public.tg_data_quarantine_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_data_quarantine_updated_at ON public.data_quarantine;
CREATE TRIGGER trg_data_quarantine_updated_at
  BEFORE UPDATE ON public.data_quarantine
  FOR EACH ROW EXECUTE FUNCTION public.tg_data_quarantine_updated_at();

COMMENT ON TABLE public.data_quarantine IS
  'Runtime quarantine for rows that failed schema drift, quality gates, or write-lane enforcement. Quarantine + continue model: never drop, never block, always review.';