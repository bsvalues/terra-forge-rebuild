CREATE OR REPLACE FUNCTION public.assign_parcels_from_polygon_layer(p_county_id uuid, p_layer_id uuid, p_layer_property_key text, p_target_column text, p_limit integer DEFAULT 50000)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_assigned bigint := 0; v_unassigned bigint := 0; v_ambiguous bigint := 0;
BEGIN
  -- Only service code or administrators may run bulk spatial assignment.
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  -- Only these parcel attributes may be derived from polygon layers.
  IF p_target_column NOT IN ('neighborhood_code', 'city', 'zip_code') THEN
    RAISE EXCEPTION 'Unsupported target column: %', p_target_column USING ERRCODE = '22023';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200000 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 200000' USING ERRCODE = '22023';
  END IF;

  WITH hits AS (
    SELECT p.id, count(*) AS n FROM parcels p
    JOIN gis_features f ON f.layer_id = p_layer_id AND f.geom IS NOT NULL
     AND p.situs_point_wgs84 IS NOT NULL AND ST_Intersects(f.geom, p.situs_point_wgs84::geometry)
    WHERE p.county_id = p_county_id GROUP BY p.id)
  SELECT count(*) INTO v_ambiguous FROM hits WHERE n > 1;

  WITH candidates AS (
    SELECT p.id AS parcel_id, (f.properties ->> p_layer_property_key) AS val
    FROM parcels p
    JOIN LATERAL (
      SELECT f2.properties FROM gis_features f2
      WHERE f2.layer_id = p_layer_id AND f2.geom IS NOT NULL
        AND ST_Intersects(f2.geom, p.situs_point_wgs84::geometry)
      ORDER BY f2.source_object_id NULLS LAST, f2.id LIMIT 1) f ON true
    WHERE p.county_id = p_county_id AND p.situs_point_wgs84 IS NOT NULL
    LIMIT p_limit)
  UPDATE parcels p SET
    neighborhood_code = CASE WHEN p_target_column = 'neighborhood_code' THEN c.val ELSE p.neighborhood_code END,
    city = CASE WHEN p_target_column = 'city' THEN c.val ELSE p.city END,
    zip_code = CASE WHEN p_target_column = 'zip_code' THEN c.val ELSE p.zip_code END
  FROM candidates c WHERE p.id = c.parcel_id AND c.val IS NOT NULL;
  GET DIAGNOSTICS v_assigned = ROW_COUNT;

  SELECT count(*) INTO v_unassigned FROM parcels p
  WHERE p.county_id = p_county_id AND p.situs_point_wgs84 IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM gis_features f WHERE f.layer_id = p_layer_id AND f.geom IS NOT NULL
      AND ST_Intersects(f.geom, p.situs_point_wgs84::geometry));

  INSERT INTO trace_events (county_id, source_module, event_type, event_data)
  VALUES (p_county_id, 'spatial-join', 'assign_parcels_from_polygon_layer',
    jsonb_build_object('layer_id', p_layer_id, 'property_key', p_layer_property_key, 'target_column', p_target_column,
      'assigned', v_assigned, 'unassigned', v_unassigned, 'ambiguous', v_ambiguous, 'limit', p_limit));

  RETURN jsonb_build_object('assigned', v_assigned, 'unassigned', v_unassigned, 'ambiguous', v_ambiguous);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.assign_parcels_from_polygon_layer(uuid, uuid, text, text, int4) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_parcels_from_polygon_layer(uuid, uuid, text, text, int4) TO service_role;