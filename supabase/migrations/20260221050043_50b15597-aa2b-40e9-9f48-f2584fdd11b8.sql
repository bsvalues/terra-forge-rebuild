
-- Mission Preview RPC: returns top offenders with why_flagged for any mission
CREATE OR REPLACE FUNCTION public.get_mission_preview(
  p_mission_id text,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_county_id uuid;
  v_now timestamptz := now();
  v_current_year int := EXTRACT(year FROM CURRENT_DATE)::int;
  v_rows jsonb := '[]'::jsonb;
  v_scope jsonb := '{}'::jsonb;
  v_context jsonb := '{}'::jsonb;
  v_total bigint := 0;
  v_confidence text := 'high';
  v_confidence_reason text := '';
  v_sources text[] := ARRAY['parcels'];
BEGIN
  v_county_id := get_user_county_id();

  IF p_mission_id = 'impossible-year-built' THEN
    -- Count total
    SELECT count(*) INTO v_total
    FROM parcels WHERE county_id = v_county_id
      AND (
        (year_built IS NOT NULL AND year_built < 1700)
        OR (year_built IS NOT NULL AND year_built > v_current_year + 1)
        OR (year_built IS NULL AND COALESCE(improvement_value, 0) > 0)
      );

    SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT
        p.id AS parcel_id,
        p.parcel_number AS apn,
        p.address AS situs,
        p.neighborhood_code AS neighborhood,
        p.property_class,
        p.year_built,
        p.improvement_value,
        CASE
          WHEN p.year_built IS NOT NULL AND p.year_built < 1700 THEN 'Year built ' || p.year_built || ' is before 1700 — likely placeholder or data entry error'
          WHEN p.year_built IS NOT NULL AND p.year_built > v_current_year + 1 THEN 'Year built ' || p.year_built || ' is in the future — impossible'
          WHEN p.year_built IS NULL AND COALESCE(p.improvement_value, 0) > 0 THEN 'Missing year built with $' || COALESCE(p.improvement_value, 0)::text || ' improvement value — breaks depreciation'
          ELSE 'Unknown issue'
        END AS why_flagged,
        CASE
          WHEN p.year_built IS NOT NULL AND p.year_built < 1700 THEN 'pre1700'
          WHEN p.year_built IS NOT NULL AND p.year_built > v_current_year + 1 THEN 'future'
          ELSE 'missing'
        END AS issue_type
      FROM parcels p
      WHERE p.county_id = v_county_id
        AND (
          (p.year_built IS NOT NULL AND p.year_built < 1700)
          OR (p.year_built IS NOT NULL AND p.year_built > v_current_year + 1)
          OR (p.year_built IS NULL AND COALESCE(p.improvement_value, 0) > 0)
        )
      ORDER BY COALESCE(p.improvement_value, 0) DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;

    v_confidence := 'high';
    v_confidence_reason := 'Direct field check — no estimation';
    v_context := jsonb_build_object('rules', jsonb_build_array(
      'year_built < 1700', 'year_built > current_year + 1', 'year_built IS NULL with improvements'
    ));

  ELSIF p_mission_id = 'missing-building-area' THEN
    SELECT count(*) INTO v_total
    FROM parcels WHERE county_id = v_county_id
      AND COALESCE(improvement_value, 0) > 0
      AND (building_area IS NULL OR building_area = 0);

    SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT
        p.id AS parcel_id,
        p.parcel_number AS apn,
        p.address AS situs,
        p.neighborhood_code AS neighborhood,
        p.property_class,
        p.improvement_value,
        p.building_area,
        'Improvement value $' || p.improvement_value::text || ' but ' ||
          CASE WHEN p.building_area IS NULL THEN 'no building area recorded'
               ELSE 'building area is 0 sqft' END ||
          ' — value not defensible without measurement data' AS why_flagged
      FROM parcels p
      WHERE p.county_id = v_county_id
        AND COALESCE(p.improvement_value, 0) > 0
        AND (p.building_area IS NULL OR p.building_area = 0)
      ORDER BY p.improvement_value DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;

    v_confidence := 'high';
    v_confidence_reason := 'Direct null/zero check on building_area';
    v_sources := ARRAY['parcels'];

  ELSIF p_mission_id = 'building-area-outliers' THEN
    -- First compute class stats
    WITH class_stats AS (
      SELECT
        property_class,
        count(*) AS class_n,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY building_area) AS q1,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY building_area) AS q3
      FROM parcels
      WHERE county_id = v_county_id
        AND building_area IS NOT NULL AND building_area > 0
        AND property_class IS NOT NULL
      GROUP BY property_class
    ),
    flagged AS (
      SELECT
        p.id AS parcel_id,
        p.parcel_number AS apn,
        p.address AS situs,
        p.neighborhood_code AS neighborhood,
        p.property_class,
        p.building_area,
        cs.q1,
        cs.q3,
        cs.q3 - cs.q1 AS iqr,
        cs.q1 - 1.5 * (cs.q3 - cs.q1) AS lower_bound,
        cs.q3 + 1.5 * (cs.q3 - cs.q1) AS upper_bound,
        cs.class_n
      FROM parcels p
      JOIN class_stats cs ON cs.property_class = p.property_class
      WHERE p.county_id = v_county_id
        AND p.building_area IS NOT NULL AND p.building_area > 0
        AND (p.building_area < cs.q1 - 1.5 * (cs.q3 - cs.q1) OR p.building_area > cs.q3 + 1.5 * (cs.q3 - cs.q1))
    )
    SELECT count(*) INTO v_total FROM flagged;

    SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT
        f.parcel_id, f.apn, f.situs, f.neighborhood, f.property_class,
        f.building_area AS value,
        'Building area ' || round(f.building_area)::text || ' sqft is ' ||
          CASE WHEN f.building_area > f.upper_bound THEN 'above upper bound ' || round(f.upper_bound)::text
               ELSE 'below lower bound ' || round(f.lower_bound)::text END ||
          ' sqft (1.5×IQR for ' || f.property_class || ', n=' || f.class_n || ')' AS why_flagged,
        jsonb_build_object('q1', round(f.q1), 'q3', round(f.q3), 'iqr', round(f.iqr),
          'lower', round(f.lower_bound), 'upper', round(f.upper_bound), 'class_n', f.class_n) AS signals
      FROM flagged f
      ORDER BY abs(f.building_area - (f.q1 + f.q3) / 2) DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;

    -- Get min class n for confidence
    SELECT COALESCE(min(class_n), 0) INTO v_total
    FROM (
      SELECT count(*) AS class_n FROM parcels
      WHERE county_id = v_county_id AND building_area > 0 AND property_class IS NOT NULL
      GROUP BY property_class
    ) cn;
    
    -- Re-count total from flagged
    WITH class_stats AS (
      SELECT property_class,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY building_area) AS q1,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY building_area) AS q3
      FROM parcels WHERE county_id = v_county_id AND building_area > 0 AND property_class IS NOT NULL
      GROUP BY property_class
    )
    SELECT count(*) INTO v_total
    FROM parcels p JOIN class_stats cs ON cs.property_class = p.property_class
    WHERE p.county_id = v_county_id AND p.building_area > 0
      AND (p.building_area < cs.q1 - 1.5*(cs.q3-cs.q1) OR p.building_area > cs.q3 + 1.5*(cs.q3-cs.q1));

    v_confidence := 'medium';
    v_confidence_reason := '1.5×IQR statistical — review recommended';
    v_context := jsonb_build_object('method', 'IQR_1.5', 'group_by', 'property_class');

  ELSIF p_mission_id = 'zero-imp-permits' THEN
    SELECT count(DISTINCT p.id) INTO v_total
    FROM parcels p JOIN permits pm ON pm.parcel_id = p.id
    WHERE p.county_id = v_county_id AND COALESCE(p.improvement_value, 0) = 0
      AND pm.status IN ('applied', 'pending', 'issued');

    SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT
        p.id AS parcel_id, p.parcel_number AS apn, p.address AS situs,
        p.neighborhood_code AS neighborhood, p.property_class,
        p.improvement_value,
        pm.permit_number, pm.permit_type, pm.status AS permit_status,
        '$0 improvement but has active ' || pm.permit_type || ' permit (' || pm.permit_number || ') — likely missing data' AS why_flagged
      FROM parcels p JOIN permits pm ON pm.parcel_id = p.id
      WHERE p.county_id = v_county_id AND COALESCE(p.improvement_value, 0) = 0
        AND pm.status IN ('applied', 'pending', 'issued')
      ORDER BY pm.application_date DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;

    v_confidence := 'high';
    v_confidence_reason := 'Cross-table join — parcels × permits';
    v_sources := ARRAY['parcels', 'permits'];

  ELSIF p_mission_id = 'geocoding' THEN
    DECLARE v_miss bigint; v_tot bigint;
    BEGIN
      SELECT count(*), count(*) FILTER (WHERE latitude IS NULL) INTO v_tot, v_miss
      FROM parcels WHERE county_id = v_county_id;
      v_total := v_miss;

      SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT p.id AS parcel_id, p.parcel_number AS apn, p.address AS situs,
          p.neighborhood_code AS neighborhood, p.property_class, p.assessed_value,
          'No latitude/longitude — cannot appear on maps or in spatial analysis' AS why_flagged
        FROM parcels p WHERE p.county_id = v_county_id AND p.latitude IS NULL
        ORDER BY p.assessed_value DESC
        LIMIT p_limit OFFSET p_offset
      ) sub;

      v_scope := jsonb_build_object('total_parcels', v_tot, 'missing', v_miss,
        'pct', CASE WHEN v_tot > 0 THEN round((v_miss::numeric/v_tot)*100) ELSE 0 END);
    END;
    v_confidence := 'high';
    v_confidence_reason := 'Direct null check on latitude';

  ELSIF p_mission_id = 'uncertified' THEN
    SELECT count(*) INTO v_total
    FROM assessments WHERE county_id = v_county_id AND certified = false;

    SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT a.id AS assessment_id, a.parcel_id, p.parcel_number AS apn, p.address AS situs,
        a.tax_year, a.total_value, a.land_value, a.improvement_value,
        'Assessment for tax year ' || a.tax_year || ' with total value $' || COALESCE(a.total_value, 0)::text || ' not yet certified' AS why_flagged
      FROM assessments a JOIN parcels p ON p.id = a.parcel_id
      WHERE a.county_id = v_county_id AND a.certified = false
      ORDER BY COALESCE(a.total_value, 0) DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;

    v_confidence := 'high';
    v_confidence_reason := 'Direct boolean check';
    v_sources := ARRAY['assessments', 'parcels'];

  ELSIF p_mission_id = 'appeals' THEN
    SELECT count(*) INTO v_total
    FROM appeals WHERE county_id = v_county_id AND status IN ('filed', 'pending');

    SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT a.id AS appeal_id, a.parcel_id, p.parcel_number AS apn, p.address AS situs,
        a.status, a.appeal_date, a.original_value, a.requested_value, a.hearing_date,
        'Appeal ' || a.status || ' since ' || a.appeal_date::text ||
          CASE WHEN a.requested_value IS NOT NULL THEN ' — requesting $' || a.requested_value::text || ' (from $' || a.original_value::text || ')'
               ELSE ' — original value $' || a.original_value::text END AS why_flagged
      FROM appeals a JOIN parcels p ON p.id = a.parcel_id
      WHERE a.county_id = v_county_id AND a.status IN ('filed', 'pending')
      ORDER BY a.appeal_date ASC
      LIMIT p_limit OFFSET p_offset
    ) sub;

    v_confidence := 'high';
    v_confidence_reason := 'Direct status filter';
    v_sources := ARRAY['appeals', 'parcels'];

  ELSE
    RETURN jsonb_build_object('error', 'Unknown mission_id: ' || p_mission_id);
  END IF;

  RETURN jsonb_build_object(
    'mission_id', p_mission_id,
    'as_of', v_now,
    'sources', to_jsonb(v_sources),
    'confidence', v_confidence,
    'confidence_reason', v_confidence_reason,
    'total', v_total,
    'scope', v_scope,
    'context', v_context,
    'limit', p_limit,
    'offset', p_offset,
    'rows', v_rows
  );
END;
$function$;
