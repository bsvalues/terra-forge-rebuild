-- Phase 68: Data Quality Verification & Readiness Gates
-- Re-scoring RPC that computes quality metrics from current parcel state

-- Quality verification snapshots table
CREATE TABLE IF NOT EXISTS public.dq_verification_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id),
  batch_id UUID REFERENCES public.dq_remediation_batches(id),
  diagnosis_run_id UUID REFERENCES public.dq_diagnosis_runs(id),
  snapshot_type TEXT NOT NULL DEFAULT 'post_remediation',
  metrics JSONB NOT NULL DEFAULT '{}',
  quality_score NUMERIC GENERATED ALWAYS AS (
    COALESCE((metrics->>'spatial_score')::numeric, 0) * 0.25 +
    COALESCE((metrics->>'address_score')::numeric, 0) * 0.20 +
    COALESCE((metrics->>'characteristic_score')::numeric, 0) * 0.20 +
    COALESCE((metrics->>'value_score')::numeric, 0) * 0.15 +
    COALESCE((metrics->>'duplicate_score')::numeric, 0) * 0.10 +
    COALESCE((metrics->>'neighborhood_score')::numeric, 0) * 0.10
  ) STORED,
  gate_results JSONB NOT NULL DEFAULT '{}',
  passed_all_gates BOOLEAN GENERATED ALWAYS AS (
    NOT (gate_results ? 'failed')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dq_verification_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read verification snapshots"
  ON public.dq_verification_snapshots FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage verification snapshots"
  ON public.dq_verification_snapshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RPC: Compute quality scores from current parcel state
CREATE OR REPLACE FUNCTION public.compute_dq_scores(p_county_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_parcels INTEGER;
  result JSONB;
  -- Spatial
  has_coords INTEGER;
  has_geometry INTEGER;
  in_bounds INTEGER;
  no_srid_mismatch INTEGER;
  -- Address
  has_address INTEGER;
  has_city INTEGER;
  has_zip INTEGER;
  -- Characteristics
  has_building_area INTEGER;
  has_year_built INTEGER;
  has_property_class INTEGER;
  has_bedrooms INTEGER;
  -- Values
  has_assessed INTEGER;
  has_land_value INTEGER;
  no_zero_imp_with_building INTEGER;
  -- Duplicates
  dup_parcel_count INTEGER;
  -- Neighborhoods
  has_neighborhood INTEGER;
BEGIN
  SELECT count(*) INTO total_parcels
  FROM parcels WHERE county_id = p_county_id;

  IF total_parcels = 0 THEN
    RETURN jsonb_build_object(
      'total_parcels', 0,
      'spatial_score', 0, 'address_score', 0,
      'characteristic_score', 0, 'value_score', 0,
      'duplicate_score', 100, 'neighborhood_score', 0,
      'overall_score', 0
    );
  END IF;

  -- Spatial scoring
  SELECT count(*) INTO has_coords FROM parcels
  WHERE county_id = p_county_id
    AND (latitude_wgs84 IS NOT NULL OR latitude IS NOT NULL);

  SELECT count(*) INTO has_geometry FROM parcels
  WHERE county_id = p_county_id AND parcel_geom_wgs84 IS NOT NULL;

  SELECT count(*) INTO in_bounds FROM parcels
  WHERE county_id = p_county_id
    AND latitude_wgs84 IS NOT NULL
    AND latitude_wgs84 BETWEEN 24 AND 50
    AND longitude_wgs84 BETWEEN -125 AND -66;

  SELECT count(*) INTO no_srid_mismatch FROM parcels
  WHERE county_id = p_county_id
    AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));

  -- Address scoring
  SELECT count(*) INTO has_address FROM parcels
  WHERE county_id = p_county_id AND address IS NOT NULL AND address != '';

  SELECT count(*) INTO has_city FROM parcels
  WHERE county_id = p_county_id AND city IS NOT NULL;

  SELECT count(*) INTO has_zip FROM parcels
  WHERE county_id = p_county_id AND zip_code IS NOT NULL;

  -- Characteristic scoring
  SELECT count(*) INTO has_building_area FROM parcels
  WHERE county_id = p_county_id AND building_area IS NOT NULL;

  SELECT count(*) INTO has_year_built FROM parcels
  WHERE county_id = p_county_id AND year_built IS NOT NULL;

  SELECT count(*) INTO has_property_class FROM parcels
  WHERE county_id = p_county_id AND property_class IS NOT NULL;

  SELECT count(*) INTO has_bedrooms FROM parcels
  WHERE county_id = p_county_id AND bedrooms IS NOT NULL;

  -- Value scoring
  SELECT count(*) INTO has_assessed FROM parcels
  WHERE county_id = p_county_id AND assessed_value > 0;

  SELECT count(*) INTO has_land_value FROM parcels
  WHERE county_id = p_county_id AND land_value IS NOT NULL AND land_value > 0;

  SELECT count(*) INTO no_zero_imp_with_building FROM parcels
  WHERE county_id = p_county_id
    AND NOT (building_area > 0 AND (improvement_value IS NULL OR improvement_value = 0));

  -- Duplicate scoring (inverse — fewer dups = better)
  SELECT COALESCE(count(*), 0) INTO dup_parcel_count
  FROM (
    SELECT parcel_number FROM parcels
    WHERE county_id = p_county_id AND parcel_number IS NOT NULL
    GROUP BY parcel_number HAVING count(*) > 1
  ) dups;

  -- Neighborhood scoring
  SELECT count(*) INTO has_neighborhood FROM parcels
  WHERE county_id = p_county_id AND neighborhood_code IS NOT NULL;

  -- Compute lane scores (0-100)
  result := jsonb_build_object(
    'total_parcels', total_parcels,
    'spatial_score', ROUND(
      (has_coords::numeric / total_parcels * 30 +
       has_geometry::numeric / total_parcels * 30 +
       in_bounds::numeric / GREATEST(has_coords, 1) * 20 +
       no_srid_mismatch::numeric / total_parcels * 20)
    ),
    'spatial_detail', jsonb_build_object(
      'has_coords', has_coords, 'has_geometry', has_geometry,
      'in_bounds', in_bounds, 'no_srid_mismatch', no_srid_mismatch
    ),
    'address_score', ROUND(
      (has_address::numeric / total_parcels * 50 +
       has_city::numeric / total_parcels * 25 +
       has_zip::numeric / total_parcels * 25)
    ),
    'address_detail', jsonb_build_object(
      'has_address', has_address, 'has_city', has_city, 'has_zip', has_zip
    ),
    'characteristic_score', ROUND(
      (has_building_area::numeric / total_parcels * 30 +
       has_year_built::numeric / total_parcels * 25 +
       has_property_class::numeric / total_parcels * 25 +
       has_bedrooms::numeric / total_parcels * 20)
    ),
    'characteristic_detail', jsonb_build_object(
      'has_building_area', has_building_area, 'has_year_built', has_year_built,
      'has_property_class', has_property_class, 'has_bedrooms', has_bedrooms
    ),
    'value_score', ROUND(
      (has_assessed::numeric / total_parcels * 40 +
       has_land_value::numeric / total_parcels * 30 +
       no_zero_imp_with_building::numeric / total_parcels * 30)
    ),
    'value_detail', jsonb_build_object(
      'has_assessed', has_assessed, 'has_land_value', has_land_value,
      'no_zero_imp_with_building', no_zero_imp_with_building
    ),
    'duplicate_score', GREATEST(0, 100 - (dup_parcel_count * 10)),
    'duplicate_detail', jsonb_build_object('duplicate_groups', dup_parcel_count),
    'neighborhood_score', ROUND(has_neighborhood::numeric / total_parcels * 100),
    'neighborhood_detail', jsonb_build_object('has_neighborhood', has_neighborhood)
  );

  -- Add overall weighted score
  result := result || jsonb_build_object(
    'overall_score', ROUND(
      COALESCE((result->>'spatial_score')::numeric, 0) * 0.25 +
      COALESCE((result->>'address_score')::numeric, 0) * 0.20 +
      COALESCE((result->>'characteristic_score')::numeric, 0) * 0.20 +
      COALESCE((result->>'value_score')::numeric, 0) * 0.15 +
      COALESCE((result->>'duplicate_score')::numeric, 0) * 0.10 +
      COALESCE((result->>'neighborhood_score')::numeric, 0) * 0.10
    )
  );

  RETURN result;
END;
$$;

-- RPC: Evaluate readiness gates
CREATE OR REPLACE FUNCTION public.evaluate_readiness_gates(p_county_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  scores JSONB;
  gates JSONB := '[]'::jsonb;
  open_blockers INTEGER;
  open_issues INTEGER;
BEGIN
  -- Get current scores
  scores := compute_dq_scores(p_county_id);

  -- Count open issues
  SELECT count(*) INTO open_blockers FROM dq_issue_registry
  WHERE county_id = p_county_id AND status = 'open' AND is_hard_blocker = true;

  SELECT count(*) INTO open_issues FROM dq_issue_registry
  WHERE county_id = p_county_id AND status = 'open';

  -- Gate 1: No hard blockers
  gates := gates || jsonb_build_array(jsonb_build_object(
    'gate', 'no_hard_blockers',
    'label', 'Zero Hard Blockers',
    'description', 'All critical data integrity issues must be resolved',
    'passed', open_blockers = 0,
    'value', open_blockers,
    'threshold', 0,
    'severity', 'critical'
  ));

  -- Gate 2: Spatial quality >= 60
  gates := gates || jsonb_build_array(jsonb_build_object(
    'gate', 'spatial_quality',
    'label', 'Spatial Quality ≥ 60%',
    'description', 'Coordinate coverage and geometry availability',
    'passed', (scores->>'spatial_score')::numeric >= 60,
    'value', (scores->>'spatial_score')::numeric,
    'threshold', 60,
    'severity', 'high'
  ));

  -- Gate 3: Address coverage >= 70
  gates := gates || jsonb_build_array(jsonb_build_object(
    'gate', 'address_coverage',
    'label', 'Address Coverage ≥ 70%',
    'description', 'Situs address, city, and ZIP populated',
    'passed', (scores->>'address_score')::numeric >= 70,
    'value', (scores->>'address_score')::numeric,
    'threshold', 70,
    'severity', 'high'
  ));

  -- Gate 4: Characteristic completeness >= 50
  gates := gates || jsonb_build_array(jsonb_build_object(
    'gate', 'characteristic_completeness',
    'label', 'Characteristics ≥ 50%',
    'description', 'Building area, year built, property class populated',
    'passed', (scores->>'characteristic_score')::numeric >= 50,
    'value', (scores->>'characteristic_score')::numeric,
    'threshold', 50,
    'severity', 'medium'
  ));

  -- Gate 5: No duplicate parcel IDs
  gates := gates || jsonb_build_array(jsonb_build_object(
    'gate', 'no_duplicates',
    'label', 'No Duplicate Parcel IDs',
    'description', 'Each parcel number must be unique within the county',
    'passed', (scores->'duplicate_detail'->>'duplicate_groups')::integer = 0,
    'value', (scores->'duplicate_detail'->>'duplicate_groups')::integer,
    'threshold', 0,
    'severity', 'critical'
  ));

  -- Gate 6: Value integrity >= 60
  gates := gates || jsonb_build_array(jsonb_build_object(
    'gate', 'value_integrity',
    'label', 'Value Integrity ≥ 60%',
    'description', 'Assessed values, land values, and improvement consistency',
    'passed', (scores->>'value_score')::numeric >= 60,
    'value', (scores->>'value_score')::numeric,
    'threshold', 60,
    'severity', 'high'
  ));

  -- Gate 7: Overall quality >= 55
  gates := gates || jsonb_build_array(jsonb_build_object(
    'gate', 'overall_quality',
    'label', 'Overall Quality ≥ 55%',
    'description', 'Weighted composite quality score across all lanes',
    'passed', (scores->>'overall_score')::numeric >= 55,
    'value', (scores->>'overall_score')::numeric,
    'threshold', 55,
    'severity', 'high'
  ));

  RETURN jsonb_build_object(
    'scores', scores,
    'gates', gates,
    'open_blockers', open_blockers,
    'open_issues', open_issues,
    'passed_all', NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(gates) g WHERE (g->>'passed')::boolean = false
    ),
    'evaluated_at', now()
  );
END;
$$;