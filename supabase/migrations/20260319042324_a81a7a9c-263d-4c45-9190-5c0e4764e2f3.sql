CREATE TABLE public.revaluation_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES counties(id),
  tax_year integer NOT NULL DEFAULT extract(year FROM now()),
  cycle_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  neighborhoods text[] NOT NULL DEFAULT '{}',
  total_parcels integer NOT NULL DEFAULT 0,
  parcels_calibrated integer NOT NULL DEFAULT 0,
  parcels_valued integer NOT NULL DEFAULT 0,
  model_types text[] NOT NULL DEFAULT '{}',
  defensibility_score numeric,
  quality_score numeric,
  launched_at timestamptz,
  launched_by text NOT NULL DEFAULT 'system',
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.revaluation_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read revaluation_cycles"
  ON public.revaluation_cycles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anon insert revaluation_cycles"
  ON public.revaluation_cycles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anon update revaluation_cycles"
  ON public.revaluation_cycles FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- RPC: Launch a revaluation cycle
CREATE OR REPLACE FUNCTION public.launch_revaluation_cycle(
  p_cycle_name text DEFAULT 'Annual Revaluation',
  p_tax_year integer DEFAULT extract(year FROM now())::integer,
  p_neighborhoods text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_id uuid;
  v_county_id uuid;
  v_nbhds text[];
  v_total_parcels integer;
  v_calibrated integer;
  v_model_types text[];
  v_def_score numeric;
  v_quality numeric;
BEGIN
  SELECT id INTO v_county_id FROM counties LIMIT 1;

  IF p_neighborhoods IS NOT NULL AND array_length(p_neighborhoods, 1) > 0 THEN
    v_nbhds := p_neighborhoods;
  ELSE
    SELECT array_agg(DISTINCT hood_cd)
    INTO v_nbhds
    FROM neighborhoods
    WHERE status IN ('registered', 'calibrated');
  END IF;

  IF v_nbhds IS NULL OR array_length(v_nbhds, 1) IS NULL THEN
    RETURN jsonb_build_object('error', 'No neighborhoods registered. Configure neighborhoods first.');
  END IF;

  SELECT COUNT(*) INTO v_total_parcels
  FROM parcels WHERE neighborhood_code = ANY(v_nbhds);

  SELECT COUNT(DISTINCT cr.neighborhood_code) INTO v_calibrated
  FROM calibration_runs cr
  WHERE cr.neighborhood_code = ANY(v_nbhds) AND cr.status = 'completed';

  SELECT array_agg(DISTINCT n.model_type) INTO v_model_types
  FROM neighborhoods n
  WHERE n.hood_cd = ANY(v_nbhds) AND n.model_type IS NOT NULL;

  SELECT ROUND(
    (COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) * 100.0 / GREATEST(COUNT(*), 1) +
     COUNT(*) FILTER (WHERE property_class IS NOT NULL) * 100.0 / GREATEST(COUNT(*), 1) +
     COUNT(*) FILTER (WHERE neighborhood_code IS NOT NULL) * 100.0 / GREATEST(COUNT(*), 1)
    ) / 3
  ) INTO v_quality
  FROM parcels WHERE neighborhood_code = ANY(v_nbhds);

  v_def_score := CASE
    WHEN array_length(v_nbhds, 1) > 0 THEN ROUND(v_calibrated * 100.0 / array_length(v_nbhds, 1))
    ELSE 0
  END;

  INSERT INTO revaluation_cycles (
    county_id, cycle_name, tax_year, status, neighborhoods,
    total_parcels, parcels_calibrated, model_types,
    defensibility_score, quality_score, launched_at, launched_by
  ) VALUES (
    v_county_id, p_cycle_name, p_tax_year, 'launched', v_nbhds,
    v_total_parcels, v_calibrated, COALESCE(v_model_types, '{}'),
    v_def_score, v_quality, now(), 'system'
  )
  RETURNING id INTO v_cycle_id;

  RETURN jsonb_build_object(
    'cycle_id', v_cycle_id, 'status', 'launched', 'tax_year', p_tax_year,
    'neighborhoods', v_nbhds, 'total_parcels', v_total_parcels,
    'calibrated_neighborhoods', v_calibrated, 'model_types', v_model_types,
    'quality_score', v_quality, 'defensibility_score', v_def_score
  );
END;
$$;