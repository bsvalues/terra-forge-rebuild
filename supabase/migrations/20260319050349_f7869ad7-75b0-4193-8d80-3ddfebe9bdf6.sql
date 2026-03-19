-- Phase 76: Neighborhood Review Workflow Orchestrator

CREATE TYPE public.nbhd_review_stage AS ENUM (
  'scoping', 'data_audit', 'spatial_analysis', 'calibration', 'equity_review', 'sign_off'
);

CREATE TABLE public.neighborhood_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id),
  neighborhood_code TEXT NOT NULL,
  review_name TEXT NOT NULL,
  current_stage nbhd_review_stage NOT NULL DEFAULT 'scoping',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_deadline TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT '',
  scoping_completed_at TIMESTAMPTZ,
  data_audit_completed_at TIMESTAMPTZ,
  spatial_analysis_completed_at TIMESTAMPTZ,
  calibration_completed_at TIMESTAMPTZ,
  equity_review_completed_at TIMESTAMPTZ,
  sign_off_completed_at TIMESTAMPTZ,
  stage_gate_results JSONB NOT NULL DEFAULT '{}',
  ai_recommendations JSONB NOT NULL DEFAULT '[]',
  metrics_snapshot JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.neighborhood_review_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.neighborhood_reviews(id) ON DELETE CASCADE,
  stage nbhd_review_stage NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  result_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nbhd_reviews_county ON public.neighborhood_reviews(county_id);
CREATE INDEX idx_nbhd_reviews_hood ON public.neighborhood_reviews(neighborhood_code);
CREATE INDEX idx_nbhd_reviews_status ON public.neighborhood_reviews(status);
CREATE INDEX idx_nbhd_review_tasks_review ON public.neighborhood_review_tasks(review_id);
CREATE INDEX idx_nbhd_review_tasks_stage ON public.neighborhood_review_tasks(stage);

ALTER TABLE public.neighborhood_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhood_review_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read reviews" ON public.neighborhood_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert reviews" ON public.neighborhood_reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update reviews" ON public.neighborhood_reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth read tasks" ON public.neighborhood_review_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert tasks" ON public.neighborhood_review_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update tasks" ON public.neighborhood_review_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_neighborhood_review_context(p_review_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_review neighborhood_reviews%ROWTYPE;
  v_hood TEXT; v_cnt INT; v_coords INT; v_bldg INT; v_med NUMERIC;
  v_cal_id UUID; v_cal_r2 NUMERIC; v_cal_rmse NUMERIC; v_cal_n INT; v_cal_st TEXT; v_cal_dt TIMESTAMPTZ;
  v_tasks JSONB;
BEGIN
  SELECT * INTO v_review FROM neighborhood_reviews WHERE id = p_review_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_hood := v_review.neighborhood_code;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE latitude IS NOT NULL), COUNT(*) FILTER (WHERE building_area > 0),
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY assessed_value)
  INTO v_cnt, v_coords, v_bldg, v_med FROM parcels WHERE neighborhood_code = v_hood;

  SELECT id, r_squared, rmse, sample_size, status, created_at
  INTO v_cal_id, v_cal_r2, v_cal_rmse, v_cal_n, v_cal_st, v_cal_dt
  FROM calibration_runs WHERE neighborhood_code = v_hood ORDER BY created_at DESC LIMIT 1;

  SELECT COALESCE(jsonb_object_agg(stage::text, ct), '{}') INTO v_tasks FROM (
    SELECT stage, jsonb_build_object('total', COUNT(*), 'done', COUNT(*) FILTER (WHERE status='completed'), 'blocked', COUNT(*) FILTER (WHERE status='blocked')) ct
    FROM neighborhood_review_tasks WHERE review_id = p_review_id GROUP BY stage
  ) s;

  RETURN jsonb_build_object(
    'review', row_to_json(v_review),
    'parcel_stats', jsonb_build_object('total', v_cnt, 'with_coords', v_coords, 'with_building', v_bldg, 'median_value', v_med,
      'coord_pct', CASE WHEN v_cnt>0 THEN ROUND((v_coords::numeric/v_cnt)*100,1) ELSE 0 END,
      'building_pct', CASE WHEN v_cnt>0 THEN ROUND((v_bldg::numeric/v_cnt)*100,1) ELSE 0 END),
    'calibration', CASE WHEN v_cal_id IS NOT NULL THEN jsonb_build_object('id',v_cal_id,'r_squared',v_cal_r2,'rmse',v_cal_rmse,'sample_size',v_cal_n,'status',v_cal_st,'created_at',v_cal_dt) ELSE NULL END,
    'task_summary', v_tasks
  );
END; $$;