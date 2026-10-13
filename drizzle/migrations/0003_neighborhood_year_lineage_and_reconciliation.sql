-- Year-specific neighborhood assignments gain source lineage (additive).
ALTER TABLE public.parcel_neighborhood_year
  ADD COLUMN IF NOT EXISTS prop_id text,
  ADD COLUMN IF NOT EXISTS roll_active boolean,
  ADD COLUMN IF NOT EXISTS source_run_id uuid,
  ADD COLUMN IF NOT EXISTS source_label text;

CREATE TABLE public.neighborhood_reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  valuation_year integer NOT NULL,
  source_file text NOT NULL,
  source_sha256 text NOT NULL,
  selection_rule text NOT NULL,
  status text NOT NULL DEFAULT 'staged',
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  promoted_at timestamptz,
  UNIQUE (county_id, valuation_year, source_sha256)
);

CREATE TABLE public.neighborhood_reconciliation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.neighborhood_reconciliation_runs(id) ON DELETE CASCADE,
  county_id uuid NOT NULL REFERENCES public.counties(id),
  prop_id text NOT NULL,
  parcel_id uuid REFERENCES public.parcels(id),
  roll_hood_cd text,
  roll_active boolean,
  app_hood_cd text,
  classification text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, prop_id)
);
CREATE INDEX neighborhood_reconciliation_items_class_idx
  ON public.neighborhood_reconciliation_items (run_id, classification);

GRANT SELECT ON public.neighborhood_reconciliation_runs TO authenticated;
GRANT SELECT ON public.neighborhood_reconciliation_items TO authenticated;
GRANT ALL ON public.neighborhood_reconciliation_runs TO service_role;
GRANT ALL ON public.neighborhood_reconciliation_items TO service_role;

ALTER TABLE public.neighborhood_reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhood_reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "County users read reconciliation runs" ON public.neighborhood_reconciliation_runs
  FOR SELECT TO authenticated USING (county_id = public.get_user_county_id());
CREATE POLICY "County users read reconciliation items" ON public.neighborhood_reconciliation_items
  FOR SELECT TO authenticated USING (county_id = public.get_user_county_id());