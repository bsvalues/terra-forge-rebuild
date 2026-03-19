-- Phase 72: Revaluation Progress Tracker RPC
-- Returns per-neighborhood progress for a given revaluation cycle

CREATE OR REPLACE FUNCTION public.get_revaluation_progress(p_cycle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle revaluation_cycles%ROWTYPE;
  v_nbhd_progress jsonb := '[]'::jsonb;
  v_nbhd text;
  v_parcel_count integer;
  v_assessed_count integer;
  v_certified_count integer;
  v_cal_status text;
  v_cal_r2 numeric;
  v_avg_value numeric;
  v_total_assessed integer := 0;
  v_total_certified integer := 0;
  v_total_parcels integer := 0;
  v_phase text;
BEGIN
  SELECT * INTO v_cycle FROM revaluation_cycles WHERE id = p_cycle_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Cycle not found');
  END IF;

  -- Iterate neighborhoods in the cycle
  FOREACH v_nbhd IN ARRAY v_cycle.neighborhoods
  LOOP
    -- Parcel count in this neighborhood
    SELECT COUNT(*) INTO v_parcel_count
    FROM parcels WHERE neighborhood_code = v_nbhd;

    -- Assessed count (parcels with assessments for this tax year)
    SELECT COUNT(DISTINCT a.parcel_id) INTO v_assessed_count
    FROM assessments a
    JOIN parcels p ON p.id = a.parcel_id
    WHERE p.neighborhood_code = v_nbhd
      AND a.tax_year = v_cycle.tax_year;

    -- Certified count
    SELECT COUNT(DISTINCT a.parcel_id) INTO v_certified_count
    FROM assessments a
    JOIN parcels p ON p.id = a.parcel_id
    WHERE p.neighborhood_code = v_nbhd
      AND a.tax_year = v_cycle.tax_year
      AND a.certified = true;

    -- Latest calibration status
    SELECT cr.status, cr.r_squared
    INTO v_cal_status, v_cal_r2
    FROM calibration_runs cr
    WHERE cr.neighborhood_code = v_nbhd
    ORDER BY cr.created_at DESC
    LIMIT 1;

    -- Average assessed value
    SELECT ROUND(AVG(p.assessed_value))
    INTO v_avg_value
    FROM parcels p
    WHERE p.neighborhood_code = v_nbhd
      AND p.assessed_value > 0;

    -- Determine phase
    v_phase := CASE
      WHEN v_certified_count > 0 AND v_certified_count >= v_parcel_count * 0.9 THEN 'certified'
      WHEN v_assessed_count > 0 AND v_assessed_count >= v_parcel_count * 0.5 THEN 'valued'
      WHEN COALESCE(v_cal_status, '') = 'completed' THEN 'calibrated'
      ELSE 'pending'
    END;

    v_total_parcels := v_total_parcels + v_parcel_count;
    v_total_assessed := v_total_assessed + v_assessed_count;
    v_total_certified := v_total_certified + v_certified_count;

    v_nbhd_progress := v_nbhd_progress || jsonb_build_array(jsonb_build_object(
      'hood_cd', v_nbhd,
      'parcel_count', v_parcel_count,
      'assessed_count', v_assessed_count,
      'certified_count', v_certified_count,
      'calibration_status', COALESCE(v_cal_status, 'none'),
      'r_squared', v_cal_r2,
      'avg_value', v_avg_value,
      'phase', v_phase
    ));
  END LOOP;

  -- Compute overall progress percentages
  RETURN jsonb_build_object(
    'cycle_id', v_cycle.id,
    'cycle_name', v_cycle.cycle_name,
    'tax_year', v_cycle.tax_year,
    'status', v_cycle.status,
    'launched_at', v_cycle.launched_at,
    'total_parcels', v_total_parcels,
    'total_assessed', v_total_assessed,
    'total_certified', v_total_certified,
    'calibration_pct', CASE WHEN array_length(v_cycle.neighborhoods, 1) > 0
      THEN ROUND(
        (SELECT COUNT(*)::numeric FROM unnest(v_cycle.neighborhoods) n
         WHERE EXISTS (SELECT 1 FROM calibration_runs cr WHERE cr.neighborhood_code = n AND cr.status = 'completed'))
        * 100.0 / array_length(v_cycle.neighborhoods, 1)
      ) ELSE 0 END,
    'assessment_pct', CASE WHEN v_total_parcels > 0
      THEN ROUND(v_total_assessed * 100.0 / v_total_parcels) ELSE 0 END,
    'certification_pct', CASE WHEN v_total_parcels > 0
      THEN ROUND(v_total_certified * 100.0 / v_total_parcels) ELSE 0 END,
    'neighborhoods', v_nbhd_progress
  );
END;
$$;