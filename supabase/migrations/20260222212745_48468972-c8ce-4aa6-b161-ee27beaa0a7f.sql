
-- Ensure required GiST indexes exist
CREATE INDEX IF NOT EXISTS gis_features_geom_gist ON public.gis_features USING gist (geom);
CREATE INDEX IF NOT EXISTS gis_features_layer_county_idx ON public.gis_features (county_id, layer_id);

-- Spatial link RPC: point-in-polygon with smallest-area tie-breaking
CREATE OR REPLACE FUNCTION public.link_parcels_to_polygons_by_location(
  p_county_id uuid,
  p_layer_id uuid,
  p_limit integer DEFAULT 50000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked bigint := 0;
  v_ambiguous bigint := 0;
  v_unmatched bigint := 0;
BEGIN
  WITH hits AS (
    SELECT p.id AS parcel_id, count(*) AS n
    FROM parcels p
    JOIN gis_features f
      ON f.county_id = p.county_id
     AND f.layer_id  = p_layer_id
     AND f.geom IS NOT NULL
     AND p.situs_point_wgs84 IS NOT NULL
     AND ST_Covers(f.geom, p.situs_point_wgs84)
    WHERE p.county_id = p_county_id
    GROUP BY p.id
  )
  SELECT count(*) INTO v_ambiguous FROM hits WHERE n > 1;

  WITH candidates AS (
    SELECT
      p.id AS parcel_id,
      f.id AS feature_id,
      f.geom AS geom,
      f.properties AS props,
      row_number() OVER (
        PARTITION BY p.id
        ORDER BY ST_Area(f.geom) ASC, f.source_object_id NULLS LAST, f.id
      ) AS rn
    FROM parcels p
    JOIN gis_features f
      ON f.county_id = p.county_id
     AND f.layer_id  = p_layer_id
     AND f.geom IS NOT NULL
     AND p.situs_point_wgs84 IS NOT NULL
     AND ST_Covers(f.geom, p.situs_point_wgs84)
    WHERE p.county_id = p_county_id
      AND p.parcel_geom_wgs84 IS NULL
    LIMIT p_limit
  ),
  chosen AS (
    SELECT * FROM candidates WHERE rn = 1
  ),
  u_parcels AS (
    UPDATE parcels p
    SET parcel_geom_wgs84 = c.geom,
        neighborhood_code = COALESCE(NULLIF(c.props->>'neighborhood_code',''), p.neighborhood_code)
    FROM chosen c
    WHERE p.id = c.parcel_id
    RETURNING 1
  ),
  u_features AS (
    UPDATE gis_features f
    SET parcel_id = c.parcel_id
    FROM chosen c
    WHERE f.id = c.feature_id
    RETURNING 1
  )
  SELECT (SELECT count(*) FROM u_parcels) INTO v_linked;

  SELECT count(*) INTO v_unmatched
  FROM parcels p
  WHERE p.county_id = p_county_id
    AND p.situs_point_wgs84 IS NOT NULL
    AND p.parcel_geom_wgs84 IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM gis_features f
      WHERE f.county_id = p.county_id
        AND f.layer_id = p_layer_id
        AND f.geom IS NOT NULL
        AND ST_Covers(f.geom, p.situs_point_wgs84)
    );

  INSERT INTO trace_events (county_id, source_module, event_type, event_data, actor_id)
  VALUES (
    p_county_id, 'parcel-polygon-link', 'link_by_location',
    jsonb_build_object('layer_id', p_layer_id, 'linked', v_linked, 'ambiguous', v_ambiguous, 'unmatched', v_unmatched, 'limit', p_limit),
    '00000000-0000-0000-0000-000000000000'
  );

  RETURN jsonb_build_object('linked', v_linked, 'ambiguous', v_ambiguous, 'unmatched', v_unmatched, 'limit', p_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.link_parcels_to_polygons_by_location(uuid, uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.link_parcels_to_polygons_by_location(uuid, uuid, integer) TO authenticated;
