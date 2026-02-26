
-- TerraFusion OS — Feature Completeness / Readiness Scoring RPC
-- Replaces quarterly valuation stats with always-on data quality metrics
-- Schema version: 1

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
  -- Resolve county
  v_county_id := COALESCE(p_county_id, public.get_user_county_id());
  IF v_county_id IS NULL THEN
    RAISE EXCEPTION 'No county context available';
  END IF;

  WITH base AS (
    SELECT
      p.id,
      p.neighborhood_code,
      p.property_class,
      -- Effective coordinate (canonical wins)
      (COALESCE(p.latitude_wgs84, 
        CASE WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL
             AND NOT (p.latitude = 0 AND p.longitude = 0)
             AND p.latitude BETWEEN 24.0 AND 50.0
             AND p.longitude BETWEEN -125.0 AND -66.0
        THEN p.latitude END
      ) IS NOT NULL) AS has_coords,
      -- Core model features mapped to actual schema
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
      id,
      neighborhood_code,
      property_class,
      -- Weighted score (total max = 16)
      (CASE WHEN has_coords THEN 3 ELSE 0 END) +
      (CASE WHEN has_gla THEN 2 ELSE 0 END) +
      (CASE WHEN has_year_built THEN 2 ELSE 0 END) +
      (CASE WHEN has_property_class THEN 1 ELSE 0 END) +
      (CASE WHEN has_land_area THEN 2 ELSE 0 END) +
      (CASE WHEN has_situs THEN 1 ELSE 0 END) +
      (CASE WHEN has_assessed_value THEN 2 ELSE 0 END) +
      (CASE WHEN has_bedrooms THEN 1 ELSE 0 END) +
      (CASE WHEN has_bathrooms THEN 1 ELSE 0 END) +
      (CASE WHEN has_neighborhood THEN 1 ELSE 0 END) AS score,
      16 AS max_score,
      -- Individual flags for field coverage
      has_coords, has_gla, has_year_built, has_property_class,
      has_land_area, has_situs, has_assessed_value,
      has_bedrooms, has_bathrooms, has_neighborhood
    FROM base
  ),
  -- Overall summary
  summary AS (
    SELECT
      count(*) AS total_parcels,
      round(avg(score::numeric / max_score) * 100, 1) AS readiness_index,
      count(*) FILTER (WHERE score::numeric / max_score >= 0.8) AS parcels_ready,
      count(*) FILTER (WHERE score::numeric / max_score >= 0.5 AND score::numeric / max_score < 0.8) AS parcels_partial,
      count(*) FILTER (WHERE score::numeric / max_score < 0.5) AS parcels_at_risk
    FROM scored
  ),
  -- Field coverage rates
  field_coverage AS (
    SELECT jsonb_build_object(
      'effective_coords', round(count(*) FILTER (WHERE has_coords)::numeric / greatest(count(*), 1) * 100, 1),
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
  -- Per-neighborhood breakdown (top 30 worst)
  neighborhood_readiness AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'code', COALESCE(neighborhood_code, 'UNASSIGNED'),
        'parcel_count', cnt,
        'readiness_index', ri,
        'parcels_ready', pr,
        'parcels_at_risk', par
      ) ORDER BY ri ASC
    ) AS neighborhoods
    FROM (
      SELECT
        neighborhood_code,
        count(*) AS cnt,
        round(avg(score::numeric / max_score) * 100, 1) AS ri,
        count(*) FILTER (WHERE score::numeric / max_score >= 0.8) AS pr,
        count(*) FILTER (WHERE score::numeric / max_score < 0.5) AS par
      FROM scored
      GROUP BY neighborhood_code
      ORDER BY avg(score::numeric / max_score) ASC
      LIMIT 30
    ) sub
  ),
  -- Co-occurrence patterns (missing feature combos)
  combos AS (
    SELECT jsonb_agg(
      jsonb_build_object('pattern', pattern, 'count', cnt)
      ORDER BY cnt DESC
    ) AS missing_combos
    FROM (
      SELECT
        CASE
          WHEN NOT has_gla AND NOT has_year_built THEN 'no_building_record'
          WHEN has_coords AND NOT has_situs THEN 'gis_only_no_address'
          WHEN has_assessed_value AND NOT has_gla AND NOT has_land_area THEN 'value_no_characteristics'
          WHEN NOT has_coords AND has_situs THEN 'address_only_no_coords'
          WHEN NOT has_neighborhood AND has_coords THEN 'coords_no_neighborhood'
          ELSE NULL
        END AS pattern,
        count(*) AS cnt
      FROM scored
      WHERE score::numeric / max_score < 0.8
      GROUP BY 1
      HAVING count(*) >= 2
    ) sub
    WHERE pattern IS NOT NULL
  )
  SELECT jsonb_build_object(
    'schema_version', 1,
    'county_id', v_county_id,
    'computed_at', now(),
    'summary', row_to_json(s)::jsonb,
    'field_coverage', fc.coverage,
    'neighborhoods', COALESCE(nr.neighborhoods, '[]'::jsonb),
    'missing_combos', COALESCE(c.missing_combos, '[]'::jsonb),
    'weights', jsonb_build_object(
      'effective_coords', 3, 'building_area', 2, 'year_built', 2,
      'property_class', 1, 'land_area', 2, 'situs_address', 1,
      'assessed_value', 2, 'bedrooms', 1, 'bathrooms', 1, 'neighborhood', 1,
      'max_score', 16
    ),
    'definitions', jsonb_build_object(
      'readiness_index', 'weighted % of critical fields present and valid per parcel, averaged across county',
      'parcels_ready', 'score >= 80% of max weighted score',
      'parcels_at_risk', 'score < 50% of max weighted score',
      'effective_coords', 'canonical WGS84 if present, else raw if valid CONUS degrees (24-50N, 66-125W)',
      'missing_combos', 'co-occurring missing field patterns among parcels below 80% readiness'
    )
  ) INTO v_result
  FROM summary s, field_coverage fc, neighborhood_readiness nr, combos c;

  RETURN v_result;
END;
$$;
