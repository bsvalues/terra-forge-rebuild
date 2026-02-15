
-- Phase 6.0: Mass Appraisal Factory Schema
-- Write-lane owner: forge (calibration_runs, cost_schedules, cost_depreciation, value_adjustments, comp_grids)

-- 6.0.1: Calibration Runs
CREATE TABLE public.calibration_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id UUID NOT NULL REFERENCES public.counties(id),
  neighborhood_code TEXT NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'ols',
  status TEXT NOT NULL DEFAULT 'draft',
  r_squared NUMERIC,
  rmse NUMERIC,
  sample_size INTEGER,
  coefficients JSONB NOT NULL DEFAULT '{}'::jsonb,
  diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
  variables TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6.0.2: Cost Schedules
CREATE TABLE public.cost_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id UUID NOT NULL REFERENCES public.counties(id),
  property_class TEXT NOT NULL,
  quality_grade TEXT NOT NULL DEFAULT 'average',
  base_cost_per_sqft NUMERIC NOT NULL,
  effective_year INTEGER NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE)::integer,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6.0.3: Cost Depreciation
CREATE TABLE public.cost_depreciation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.cost_schedules(id) ON DELETE CASCADE,
  age_from INTEGER NOT NULL DEFAULT 0,
  age_to INTEGER NOT NULL DEFAULT 100,
  depreciation_pct NUMERIC NOT NULL DEFAULT 0,
  condition_modifier NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6.0.4: Value Adjustments (the ledger)
CREATE TABLE public.value_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id UUID NOT NULL REFERENCES public.counties(id),
  parcel_id UUID NOT NULL REFERENCES public.parcels(id),
  adjustment_type TEXT NOT NULL DEFAULT 'regression',
  previous_value NUMERIC NOT NULL,
  new_value NUMERIC NOT NULL,
  adjustment_reason TEXT,
  calibration_run_id UUID REFERENCES public.calibration_runs(id),
  applied_by UUID NOT NULL DEFAULT auth.uid(),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rolled_back_at TIMESTAMPTZ
);

-- 6.0.5: Comp Grids
CREATE TABLE public.comp_grids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id UUID NOT NULL REFERENCES public.counties(id),
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_calibration_runs_county ON public.calibration_runs(county_id);
CREATE INDEX idx_calibration_runs_neighborhood ON public.calibration_runs(neighborhood_code);
CREATE INDEX idx_cost_schedules_county ON public.cost_schedules(county_id);
CREATE INDEX idx_cost_depreciation_schedule ON public.cost_depreciation(schedule_id);
CREATE INDEX idx_value_adjustments_county ON public.value_adjustments(county_id);
CREATE INDEX idx_value_adjustments_parcel ON public.value_adjustments(parcel_id);
CREATE INDEX idx_value_adjustments_run ON public.value_adjustments(calibration_run_id);
CREATE INDEX idx_comp_grids_county ON public.comp_grids(county_id);

-- 6.0.6: RLS Policies (county-scoped, analyst+ write)

-- calibration_runs
ALTER TABLE public.calibration_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calibration runs in their county"
  ON public.calibration_runs FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can create calibration runs for their county"
  ON public.calibration_runs FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update calibration runs in their county"
  ON public.calibration_runs FOR UPDATE
  USING (county_id = get_user_county_id());

CREATE POLICY "Admins can delete calibration runs"
  ON public.calibration_runs FOR DELETE
  USING (is_admin());

-- cost_schedules
ALTER TABLE public.cost_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost schedules in their county"
  ON public.cost_schedules FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can create cost schedules for their county"
  ON public.cost_schedules FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update cost schedules in their county"
  ON public.cost_schedules FOR UPDATE
  USING (county_id = get_user_county_id());

CREATE POLICY "Admins can delete cost schedules"
  ON public.cost_schedules FOR DELETE
  USING (is_admin());

-- cost_depreciation
ALTER TABLE public.cost_depreciation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost depreciation"
  ON public.cost_depreciation FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cost_schedules cs
    WHERE cs.id = cost_depreciation.schedule_id
    AND cs.county_id = get_user_county_id()
  ));

CREATE POLICY "Users can create cost depreciation"
  ON public.cost_depreciation FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cost_schedules cs
    WHERE cs.id = cost_depreciation.schedule_id
    AND cs.county_id = get_user_county_id()
  ));

CREATE POLICY "Users can update cost depreciation"
  ON public.cost_depreciation FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.cost_schedules cs
    WHERE cs.id = cost_depreciation.schedule_id
    AND cs.county_id = get_user_county_id()
  ));

CREATE POLICY "Admins can delete cost depreciation"
  ON public.cost_depreciation FOR DELETE
  USING (is_admin());

-- value_adjustments
ALTER TABLE public.value_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view value adjustments in their county"
  ON public.value_adjustments FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can create value adjustments for their county"
  ON public.value_adjustments FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update value adjustments in their county"
  ON public.value_adjustments FOR UPDATE
  USING (county_id = get_user_county_id());

CREATE POLICY "Admins can delete value adjustments"
  ON public.value_adjustments FOR DELETE
  USING (is_admin());

-- comp_grids
ALTER TABLE public.comp_grids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comp grids in their county"
  ON public.comp_grids FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can create comp grids for their county"
  ON public.comp_grids FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update comp grids in their county"
  ON public.comp_grids FOR UPDATE
  USING (county_id = get_user_county_id());

CREATE POLICY "Admins can delete comp grids"
  ON public.comp_grids FOR DELETE
  USING (is_admin());

-- Updated_at triggers
CREATE TRIGGER update_calibration_runs_updated_at
  BEFORE UPDATE ON public.calibration_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_schedules_updated_at
  BEFORE UPDATE ON public.cost_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comp_grids_updated_at
  BEFORE UPDATE ON public.comp_grids
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
