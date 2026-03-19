-- Phase 75: Revaluation Notice Generation RPC
-- Fetches parcels with value changes for a revaluation cycle, computing prior vs current deltas

CREATE OR REPLACE FUNCTION public.get_revaluation_notice_candidates(p_cycle_id uuid, p_min_change_pct numeric DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle revaluation_cycles%ROWTYPE;
  v_candidates jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_increase integer := 0;
  v_decrease integer := 0;
  v_unchanged integer := 0;
  v_avg_change numeric := 0;
  v_sum_change numeric := 0;
  rec record;
BEGIN
  SELECT * INTO v_cycle FROM revaluation_cycles WHERE id = p_cycle_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Cycle not found');
  END IF;

  FOR rec IN
    SELECT
      p.id AS parcel_id,
      p.parcel_number,
      p.address,
      p.city,
      p.neighborhood_code,
      p.property_class,
      curr.total_value AS current_value,
      curr.land_value AS current_land,
      curr.improvement_value AS current_imp,
      prev.total_value AS prior_value,
      CASE WHEN COALESCE(prev.total_value, 0) > 0
        THEN ROUND(((COALESCE(curr.total_value, 0) - COALESCE(prev.total_value, 0))::numeric / prev.total_value) * 100, 2)
        ELSE NULL END AS change_pct
    FROM parcels p
    JOIN assessments curr ON curr.parcel_id = p.id
      AND curr.tax_year = v_cycle.tax_year
      AND curr.certified = true
    LEFT JOIN LATERAL (
      SELECT a2.total_value
      FROM assessments a2
      WHERE a2.parcel_id = p.id
        AND a2.tax_year = v_cycle.tax_year - 1
      ORDER BY a2.created_at DESC
      LIMIT 1
    ) prev ON true
    WHERE p.neighborhood_code = ANY(v_cycle.neighborhoods)
    ORDER BY ABS(COALESCE(curr.total_value, 0) - COALESCE(prev.total_value, 0)) DESC
  LOOP
    v_total := v_total + 1;

    IF COALESCE(rec.change_pct, 0) > 0 THEN
      v_increase := v_increase + 1;
    ELSIF COALESCE(rec.change_pct, 0) < 0 THEN
      v_decrease := v_decrease + 1;
    ELSE
      v_unchanged := v_unchanged + 1;
    END IF;

    v_sum_change := v_sum_change + COALESCE(rec.change_pct, 0);

    -- Apply minimum change filter
    IF p_min_change_pct = 0 OR ABS(COALESCE(rec.change_pct, 0)) >= p_min_change_pct THEN
      v_candidates := v_candidates || jsonb_build_object(
        'parcel_id', rec.parcel_id,
        'parcel_number', rec.parcel_number,
        'address', COALESCE(rec.address, ''),
        'city', COALESCE(rec.city, ''),
        'neighborhood', COALESCE(rec.neighborhood_code, ''),
        'property_class', COALESCE(rec.property_class, ''),
        'current_value', COALESCE(rec.current_value, 0),
        'current_land', COALESCE(rec.current_land, 0),
        'current_imp', COALESCE(rec.current_imp, 0),
        'prior_value', COALESCE(rec.prior_value, 0),
        'change_pct', COALESCE(rec.change_pct, 0)
      );
    END IF;
  END LOOP;

  v_avg_change := CASE WHEN v_total > 0 THEN ROUND(v_sum_change / v_total, 2) ELSE 0 END;

  RETURN jsonb_build_object(
    'cycle_id', p_cycle_id,
    'cycle_name', v_cycle.cycle_name,
    'tax_year', v_cycle.tax_year,
    'total_parcels', v_total,
    'increases', v_increase,
    'decreases', v_decrease,
    'unchanged', v_unchanged,
    'avg_change_pct', v_avg_change,
    'candidates', v_candidates
  );
END;
$$;