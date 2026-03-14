
-- Phase 27: Cost Approach Engine — batch run tracking
CREATE TABLE public.cost_approach_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id),
  neighborhood_code TEXT NOT NULL,
  schedule_id UUID NOT NULL REFERENCES public.cost_schedules(id),
  parcels_processed INT NOT NULL DEFAULT 0,
  parcels_matched INT NOT NULL DEFAULT 0,
  median_ratio NUMERIC,
  cod NUMERIC,
  mean_ratio NUMERIC,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cost_approach_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own county cost runs"
  ON public.cost_approach_runs FOR SELECT TO authenticated
  USING (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own county cost runs"
  ON public.cost_approach_runs FOR INSERT TO authenticated
  WITH CHECK (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own county cost runs"
  ON public.cost_approach_runs FOR UPDATE TO authenticated
  USING (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));
