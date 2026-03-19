-- Phase 73: Complete Revaluation Cycle RPC
-- Marks a cycle as completed, recording final stats

CREATE OR REPLACE FUNCTION public.complete_revaluation_cycle(p_cycle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle revaluation_cycles%ROWTYPE;
  v_total_parcels integer;
  v_assessed integer;
  v_certified integer;
  v_cert_pct numeric;
BEGIN
  SELECT * INTO v_cycle FROM revaluation_cycles WHERE id = p_cycle_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Cycle not found');
  END IF;

  IF v_cycle.status = 'completed' THEN
    RETURN jsonb_build_object('error', 'Cycle already completed');
  END IF;

  -- Count final stats
  SELECT COUNT(*) INTO v_total_parcels
  FROM parcels WHERE neighborhood_code = ANY(v_cycle.neighborhoods);

  SELECT COUNT(DISTINCT a.parcel_id) INTO v_assessed
  FROM assessments a
  JOIN parcels p ON p.id = a.parcel_id
  WHERE p.neighborhood_code = ANY(v_cycle.neighborhoods)
    AND a.tax_year = v_cycle.tax_year;

  SELECT COUNT(DISTINCT a.parcel_id) INTO v_certified
  FROM assessments a
  JOIN parcels p ON p.id = a.parcel_id
  WHERE p.neighborhood_code = ANY(v_cycle.neighborhoods)
    AND a.tax_year = v_cycle.tax_year
    AND a.certified = true;

  v_cert_pct := CASE WHEN v_total_parcels > 0
    THEN ROUND(v_certified * 100.0 / v_total_parcels) ELSE 0 END;

  -- Update cycle
  UPDATE revaluation_cycles SET
    status = 'completed',
    total_parcels = v_total_parcels,
    parcels_valued = v_assessed,
    parcels_calibrated = v_certified,
    completed_at = now(),
    updated_at = now()
  WHERE id = p_cycle_id;

  RETURN jsonb_build_object(
    'cycle_id', p_cycle_id,
    'status', 'completed',
    'total_parcels', v_total_parcels,
    'parcels_assessed', v_assessed,
    'parcels_certified', v_certified,
    'certification_pct', v_cert_pct
  );
END;
$$;