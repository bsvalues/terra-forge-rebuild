
-- TerraFusion OS — Readiness Score v2
-- Dual indices (model vs roll), worst_field per neighborhood,
-- projected_after_backfill, bitmask combos, effective coord alignment
-- Schema version: 2

CREATE OR REPLACE FUNCTION public.compute_readiness_score(
  p_county_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_county_id uuid;
  v_result jsonb;
BEGIN
  v_county_id := COALESCE(p_county_id, public.get_user_county_id());
  IF v_county_id IS NULL THEN
    RAISE EXCEPTION 'No county context available';
  END IF;

  WITH base AS (
    SELECT
      p.id,
      p.neighborhood_code,
      p.property_class,
      -- Effective coordinate: canonical wins, else raw valid CONUS degrees
      (COALESCE(p.latitude_wgs84,
        CASE WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL
             AND NOT (p.latitude = 0 AND p.longitude = 0)
             AND p.latitude BETWEEN 24.0 AND 50.0
             AND p.longitude BETWEEN -125.0 AND -66.0
        THEN p.latitude END
      ) IS NOT NULL) AS has_effective_coords,
      -- Raw-any: non-null raw excluding (0,0)
      (p.latitude IS NOT NULL AND p.longitude IS NOT NULL
       AND NOT (p.latitude = 0 AND p.longitude = 0)) AS has_raw_any,
      -- Convertible 2927: raw present, high magnitude, no canonical yet
      (p.latitude_wgs84 IS NULL AND p.longitude_wgs84 IS NULL
       AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
       AND NOT (p.latitude = 0 AND p.longitude = 0)
       AND (abs(p.latitude) > 1000 OR abs(p.longitude) > 1000)) AS is_convertible_2927,
      -- Core model features
      (p.building_area IS NOT NULL AND p.building_area > 0) AS has_gla,
      (p.year_built IS NOT NULL AND p.year_built BETWEEN 1800 AND (EXTRACT(year FROM now())::int + 1)) AS has_year_built,
      (p.property_class IS NOT NULL AND length(trim(p.property_class)) > 0) AS has_property_class,
      (p.land_area IS NOT NULL AND p.land_area > 0) AS has_land_area,
      (p.address IS NOT NULL AND length(trim(p.address)) > 5) AS has_situs,
      (p.assessed_value IS NOT NULL AND p.assessed_value > 0) AS has_assessed_value,
      (p.bedrooms IS NOT NULL) AS has_bedrooms,
      (p.bathrooms IS NOT NULL) AS has_bathrooms,
      (p.neighborhood_code IS NOT NULL AND length(trim(p.neighborhood_code)) > 0) AS has_neighborhood
    FROM parcels p
    WHERE p.county_id = v_county_id
  ),
  scored AS (
    SELECT
      id, neighborhood_code, property_class,
      has_effective_coords, has_raw_any, is_convertible_2927,
      has_gla, has_year_built, has_property_class, has_land_area,
      has_situs, has_assessed_value, has_bedrooms, has_bathrooms, has_neighborhood,
      -- Model readiness (max 19): what breaks valuation models
      (CASE WHEN has_effective_coords THEN 3 ELSE 0 END) +
      (CASE WHEN has_gla THEN 3 ELSE 0 END) +
      (CASE WHEN has_year_built THEN 2 ELSE 0 END) +
      (CASE WHEN has_property_class THEN 1 ELSE 0 END) +
      (CASE WHEN has_land_area THEN 2 ELSE 0 END) +
      (CASE WHEN has_situs THEN 1 ELSE 0 END) +
      (CASE WHEN has_assessed_value THEN 1 ELSE 0 END) +
      (CASE WHEN has_bedrooms THEN 1 ELSE 0 END) +
      (CASE WHEN has_bathrooms THEN 1 ELSE 0 END) +
      (CASE WHEN has_neighborhood THEN 2 ELSE 0 END) +
      -- Projected: if convertible 2927 would become map-ready
      (CASE WHEN NOT has_effective_coords AND is_convertible_2927 THEN 2 ELSE 0 END) AS model_score_projected,
      17 AS model_max,
      -- Roll readiness (max 19): CAMA completeness for roll ops
      (CASE WHEN has_effective_coords THEN 2 ELSE 0 END) +
      (CASE WHEN has_gla THEN 2 ELSE 0 END) +
      (CASE WHEN has_year_built THEN 2 ELSE 0 END) +
      (CASE WHEN has_property_class THEN 2 ELSE 0 END) +
      (CASE WHEN has_land_area THEN 1 ELSE 0 END) +
      (CASE WHEN has_situs THEN 2 ELSE 0 END) +
      (CASE WHEN has_assessed_value THEN 3 ELSE 0 END) +
      (CASE WHEN has_bedrooms THEN 1 ELSE 0 END) +
      (CASE WHEN has_bathrooms THEN 1 ELSE 0 END) +
      (CASE WHEN has_neighborhood THEN 1 ELSE 0 END) AS roll_score,
      17 AS roll_max,
      -- Model score (without projected)
      (CASE WHEN has_effective_coords THEN 3 ELSE 0 END) +
      (CASE WHEN has_gla THEN 3 ELSE 0 END) +
      (CASE WHEN has_year_built THEN 2 ELSE 0 END) +
      (CASE WHEN has_property_class THEN 1 ELSE 0 END) +
      (CASE WHEN has_land_area THEN 2 ELSE 0 END) +
      (CASE WHEN has_situs THEN 1 ELSE 0 END) +
      (CASE WHEN has_assessed_value THEN 1 ELSE 0 END) +
      (CASE WHEN has_bedrooms THEN 1 ELSE 0 END) +
      (CASE WHEN has_bathrooms THEN 1 ELSE 0 END) +
      (CASE WHEN has_neighborhood THEN 2 ELSE 0 END) AS model_score
    FROM base
  ),
  summary AS (
    SELECT
      count(*) AS total_parcels,
      round(avg(model_score::numeric / model_max) * 100, 1) AS model_readiness_index,
      round(avg(roll_score::numeric / roll_max) * 100, 1) AS roll_readiness_index,
      count(*) FILTER (WHERE model_score::numeric / model_max >= 0.8) AS model_ready,
      count(*) FILTER (WHERE model_score::numeric / model_max >= 0.5 AND model_score::numeric / model_max < 0.8) AS model_partial,
      count(*) FILTER (WHERE model_score::numeric / model_max < 0.5) AS model_at_risk,
      count(*) FILTER (WHERE roll_score::numeric / roll_max >= 0.8) AS roll_ready,
      -- Projected: how many would become model-ready after 2927 backfill
      count(*) FILTER (WHERE model_score_projected::numeric / model_max >= 0.8) AS model_ready_after_backfill,
      count(*) FILTER (WHERE is_convertible_2927) AS convertible_2927_count
    FROM scored
  ),
  field_coverage AS (
    SELECT jsonb_build_object(
      'effective_coords', round(count(*) FILTER (WHERE has_effective_coords)::numeric / greatest(count(*), 1) * 100, 1),
      'building_area', round(count(*) FILTER (WHERE has_gla)::numeric / greatest(count(*), 1) * 100, 1),
      'year_built', round(count(*) FILTER (WHERE has_year_built)::numeric / greatest(count(*), 1) * 100, 1),
      'property_class', round(count(*) FILTER (WHERE has_property_class)::numeric / greatest(count(*), 1) * 100, 1),
      'land_area', round(count(*) FILTER (WHERE has_land_area)::numeric / greatest(count(*), 1) * 100, 1),
      'situs_address', round(count(*) FILTER (WHERE has_situs)::numeric / greatest(count(*), 1) * 100, 1),
      'assessed_value', round(count(*) FILTER (WHERE has_assessed_value)::numeric / greatest(count(*), 1) * 100, 1),
      'bedrooms', round(count(*) FILTER (WHERE has_bedrooms)::numeric / greatest(count(*), 1) * 100, 1),
      'bathrooms', round(count(*) FILTER (WHERE has_bathrooms)::numeric / greatest(count(*), 1) * 100, 1),
      'neighborhood', round(count(*) FILTER (WHERE has_neighborhood)::numeric / greatest(count(*), 1) * 100, 1)
    ) AS coverage
    FROM scored
  ),
  -- Per-neighborhood with worst_field
  neighborhood_readiness AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'code', COALESCE(sub.neighborhood_code, 'UNASSIGNED'),
        'parcel_count', sub.cnt,
        'readiness_index', sub.ri,
        'parcels_ready', sub.pr,
        'parcels_at_risk', sub.par,
        'worst_field', sub.worst_field,
        'worst_field_pct', sub.worst_field_pct
      ) ORDER BY sub.ri ASC
    ) AS neighborhoods
    FROM (
      SELECT
        neighborhood_code,
        count(*) AS cnt,
        round(avg(model_score::numeric / model_max) * 100, 1) AS ri,
        count(*) FILTER (WHERE model_score::numeric / model_max >= 0.8) AS pr,
        count(*) FILTER (WHERE model_score::numeric / model_max < 0.5) AS par,
        -- Find worst field by coverage %
        (SELECT f.field_name FROM (VALUES
          ('effective_coords', round(count(*) FILTER (WHERE has_effective_coords)::numeric / greatest(count(*), 1) * 100, 1)),
          ('building_area', round(count(*) FILTER (WHERE has_gla)::numeric / greatest(count(*), 1) * 100, 1)),
          ('year_built', round(count(*) FILTER (WHERE has_year_built)::numeric / greatest(count(*), 1) * 100, 1)),
          ('land_area', round(count(*) FILTER (WHERE has_land_area)::numeric / greatest(count(*), 1) * 100, 1)),
          ('neighborhood', round(count(*) FILTER (WHERE has_neighborhood)::numeric / greatest(count(*), 1) * 100, 1)),
          ('situs_address', round(count(*) FILTER (WHERE has_situs)::numeric / greatest(count(*), 1) * 100, 1))
        ) AS f(field_name, pct) ORDER BY f.pct ASC LIMIT 1) AS worst_field,
        (SELECT f.pct FROM (VALUES
          ('effective_coords', round(count(*) FILTER (WHERE has_effective_coords)::numeric / greatest(count(*), 1) * 100, 1)),
          ('building_area', round(count(*) FILTER (WHERE has_gla)::numeric / greatest(count(*), 1) * 100, 1)),
          ('year_built', round(count(*) FILTER (WHERE has_year_built)::numeric / greatest(count(*), 1) * 100, 1)),
          ('land_area', round(count(*) FILTER (WHERE has_land_area)::numeric / greatest(count(*), 1) * 100, 1)),
          ('neighborhood', round(count(*) FILTER (WHERE has_neighborhood)::numeric / greatest(count(*), 1) * 100, 1)),
          ('situs_address', round(count(*) FILTER (WHERE has_situs)::numeric / greatest(count(*), 1) * 100, 1))
        ) AS f(field_name, pct) ORDER BY f.pct ASC LIMIT 1) AS worst_field_pct
      FROM scored
      GROUP BY neighborhood_code
      ORDER BY avg(model_score::numeric / model_max) ASC
      LIMIT 30
    ) sub
  ),
  -- Bitmask combo patterns for parcels below 80%
  combos AS (
    SELECT jsonb_agg(
      jsonb_build_object('pattern', combo_key, 'count', cnt)
      ORDER BY cnt DESC
    ) AS missing_combos
    FROM (
      SELECT
        concat_ws(',',
          CASE WHEN NOT has_effective_coords THEN 'no_coords' END,
          CASE WHEN NOT has_gla THEN 'no_gla' END,
          CASE WHEN NOT has_year_built THEN 'no_yr' END,
          CASE WHEN NOT has_land_area THEN 'no_land' END,
          CASE WHEN NOT has_neighborhood THEN 'no_nh' END,
          CASE WHEN NOT has_situs THEN 'no_situs' END
        ) AS combo_key,
        count(*) AS cnt
      FROM scored
      WHERE model_score::numeric / model_max < 0.8
      GROUP BY 1
      HAVING count(*) >= 3
      ORDER BY cnt DESC
      LIMIT 15
    ) sub
    WHERE combo_key IS NOT NULL AND combo_key <> ''
  )
  SELECT jsonb_build_object(
    'schema_version', 2,
    'county_id', v_county_id,
    'computed_at', now(),
    'summary', jsonb_build_object(
      'total_parcels', s.total_parcels,
      'model_readiness_index', s.model_readiness_index,
      'roll_readiness_index', s.roll_readiness_index,
      'model_ready', s.model_ready,
      'model_partial', s.model_partial,
      'model_at_risk', s.model_at_risk,
      'roll_ready', s.roll_ready,
      'model_ready_after_backfill', s.model_ready_after_backfill,
      'convertible_2927_count', s.convertible_2927_count
    ),
    'field_coverage', fc.coverage,
    'neighborhoods', COALESCE(nr.neighborhoods, '[]'::jsonb),
    'missing_combos', COALESCE(c.missing_combos, '[]'::jsonb),
    'weights', jsonb_build_object(
      'model', jsonb_build_object(
        'effective_coords', 3, 'building_area', 3, 'year_built', 2,
        'property_class', 1, 'land_area', 2, 'situs_address', 1,
        'assessed_value', 1, 'bedrooms', 1, 'bathrooms', 1, 'neighborhood', 2,
        'max_score', 17
      ),
      'roll', jsonb_build_object(
        'effective_coords', 2, 'building_area', 2, 'year_built', 2,
        'property_class', 2, 'land_area', 1, 'situs_address', 2,
        'assessed_value', 3, 'bedrooms', 1, 'bathrooms', 1, 'neighborhood', 1,
        'max_score', 17
      )
    ),
    'definitions', jsonb_build_object(
      'model_readiness_index', 'weighted % of critical model-input fields, averaged across county (coords, GLA, year, land weighted highest)',
      'roll_readiness_index', 'weighted % of CAMA completeness fields (assessed value, situs, property class weighted highest)',
      'effective_coords', 'canonical WGS84 if present, else raw if valid CONUS degrees (24-50N, 66-125W). Aligned with geometry health canonical-wins rule.',
      'model_ready_after_backfill', 'projected model-ready count if all convertible_2927 parcels gain effective coords',
      'missing_combos', 'bitmask co-occurrence patterns of missing fields among parcels below 80% model readiness',
      'worst_field', 'lowest-coverage critical field per neighborhood (drives worklist priority)',
      'parcels_ready', 'model_score >= 80% of max',
      'parcels_at_risk', 'model_score < 50% of max'
    )
  ) INTO v_result
  FROM summary s, field_coverage fc, neighborhood_readiness nr, combos c;

  RETURN v_result;
END;
$$;
