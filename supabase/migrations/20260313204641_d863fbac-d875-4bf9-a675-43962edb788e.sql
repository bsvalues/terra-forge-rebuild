
-- AVM model runs table — stores trained model results
CREATE TABLE public.avm_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  model_name text NOT NULL DEFAULT 'Random Forest',
  model_type text NOT NULL DEFAULT 'rf',
  model_version text NOT NULL DEFAULT 'v1.0',
  status text NOT NULL DEFAULT 'champion',
  
  -- Core metrics
  r_squared numeric,
  rmse numeric,
  mae numeric,
  mape numeric,
  cod numeric,
  prd numeric,
  sample_size integer,
  
  -- Feature importance (array of {feature, importance})
  feature_importance jsonb DEFAULT '[]'::jsonb,
  
  -- Predictions (array of {actual, predicted, parcel_id})
  predictions jsonb DEFAULT '[]'::jsonb,
  
  -- Training config
  training_config jsonb DEFAULT '{}'::jsonb,
  training_time_ms integer,
  
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.avm_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AVM runs in their county"
  ON public.avm_runs FOR SELECT TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can create AVM runs in their county"
  ON public.avm_runs FOR INSERT TO authenticated
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update AVM runs in their county"
  ON public.avm_runs FOR UPDATE TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Admins can delete AVM runs"
  ON public.avm_runs FOR DELETE TO authenticated
  USING (is_admin());
