
-- Phase 77: Appeal Risk Scoring & Defense Queue
-- Tracks parcels with high value changes for appeal defense preparation.

CREATE TABLE public.appeal_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES public.counties(id) NOT NULL,
  parcel_id UUID REFERENCES public.parcels(id) NOT NULL,
  parcel_number TEXT NOT NULL,
  owner_name TEXT,
  situs_address TEXT,
  neighborhood_code TEXT,
  
  -- Value change tracking
  prior_value NUMERIC NOT NULL DEFAULT 0,
  new_value NUMERIC NOT NULL DEFAULT 0,
  value_change NUMERIC GENERATED ALWAYS AS (new_value - prior_value) STORED,
  value_change_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN prior_value > 0 THEN ROUND(((new_value - prior_value) / prior_value) * 100, 2) ELSE 0 END
  ) STORED,
  
  -- Risk assessment
  risk_score NUMERIC NOT NULL DEFAULT 0,
  risk_tier TEXT NOT NULL DEFAULT 'low' CHECK (risk_tier IN ('critical', 'high', 'medium', 'low')),
  risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Defense preparation
  defense_status TEXT NOT NULL DEFAULT 'unqueued' CHECK (defense_status IN ('unqueued', 'queued', 'in_progress', 'ready', 'filed')),
  dossier_packet_id UUID REFERENCES public.dossier_packets(id),
  assigned_to TEXT,
  defense_notes TEXT,
  
  -- AI analysis
  ai_risk_summary TEXT,
  ai_defense_strategy TEXT,
  
  -- Scoring run metadata
  scoring_run_id UUID,
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(parcel_id, tax_year)
);

-- Appeal risk scoring runs (batch execution metadata)
CREATE TABLE public.appeal_risk_scoring_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES public.counties(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  
  -- Thresholds used
  high_change_threshold NUMERIC NOT NULL DEFAULT 15,
  critical_change_threshold NUMERIC NOT NULL DEFAULT 30,
  
  -- Results
  total_parcels_scanned INTEGER NOT NULL DEFAULT 0,
  parcels_flagged INTEGER NOT NULL DEFAULT 0,
  critical_count INTEGER NOT NULL DEFAULT 0,
  high_count INTEGER NOT NULL DEFAULT 0,
  medium_count INTEGER NOT NULL DEFAULT 0,
  low_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT 'system',
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_appeal_risk_scores_county ON public.appeal_risk_scores(county_id);
CREATE INDEX idx_appeal_risk_scores_risk_tier ON public.appeal_risk_scores(risk_tier);
CREATE INDEX idx_appeal_risk_scores_defense_status ON public.appeal_risk_scores(defense_status);
CREATE INDEX idx_appeal_risk_scores_value_change_pct ON public.appeal_risk_scores(value_change_pct DESC);
CREATE INDEX idx_appeal_risk_scores_scoring_run ON public.appeal_risk_scores(scoring_run_id);
CREATE INDEX idx_appeal_risk_scoring_runs_county ON public.appeal_risk_scoring_runs(county_id);

-- RLS
ALTER TABLE public.appeal_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeal_risk_scoring_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read appeal risk scores"
  ON public.appeal_risk_scores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert appeal risk scores"
  ON public.appeal_risk_scores FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update appeal risk scores"
  ON public.appeal_risk_scores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read scoring runs"
  ON public.appeal_risk_scoring_runs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert scoring runs"
  ON public.appeal_risk_scoring_runs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update scoring runs"
  ON public.appeal_risk_scoring_runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RPC: Get risk scoring summary for dashboard
CREATE OR REPLACE FUNCTION public.get_appeal_risk_summary(p_county_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_flagged', COUNT(*),
    'critical', COUNT(*) FILTER (WHERE risk_tier = 'critical'),
    'high', COUNT(*) FILTER (WHERE risk_tier = 'high'),
    'medium', COUNT(*) FILTER (WHERE risk_tier = 'medium'),
    'low', COUNT(*) FILTER (WHERE risk_tier = 'low'),
    'unqueued', COUNT(*) FILTER (WHERE defense_status = 'unqueued'),
    'queued', COUNT(*) FILTER (WHERE defense_status = 'queued'),
    'in_progress', COUNT(*) FILTER (WHERE defense_status = 'in_progress'),
    'ready', COUNT(*) FILTER (WHERE defense_status = 'ready'),
    'filed', COUNT(*) FILTER (WHERE defense_status = 'filed'),
    'avg_value_change_pct', ROUND(AVG(value_change_pct)::NUMERIC, 2),
    'max_value_change_pct', ROUND(MAX(value_change_pct)::NUMERIC, 2),
    'total_value_at_risk', SUM(value_change)
  ) INTO result
  FROM public.appeal_risk_scores
  WHERE (p_county_id IS NULL OR county_id = p_county_id);
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
