-- TerraFusion OS — Centroid Backfill RPC
-- =======================================
-- Server-side bulk UPDATE: copies centroid_lat/centroid_lng from gis_features
-- (ArcGIS parcel layer) to parcels.latitude_wgs84/longitude_wgs84
-- in a single SQL query.
--
-- The DB trigger trg_sync_situs_point fires on UPDATE OF latitude_wgs84,
-- longitude_wgs84 and auto-computes situs_point_wgs84.
--
-- Why an RPC: making 83k individual REST PATCH requests from a Python script
-- trips Supabase CDN rate-limiting after ~4,000 requests from one IP.
-- A single server-side call avoids this entirely.
--
-- Call: POST /rest/v1/rpc/backfill_parcel_centroids (service role, no args)
-- Returns: integer (number of parcels updated)

CREATE OR REPLACE FUNCTION public.backfill_parcel_centroids()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE parcels p
  SET
    latitude_wgs84  = f.centroid_lat,
    longitude_wgs84 = f.centroid_lng,
    situs_source    = 'arcgis_centroid'
  FROM gis_features f
  JOIN gis_layers   l ON l.id = f.layer_id
  WHERE f.parcel_id    = p.id
    AND l.name         = 'Benton Parcels (ArcGIS)'
    AND f.parcel_id   IS NOT NULL
    AND f.centroid_lat IS NOT NULL
    AND f.centroid_lng IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Allow service role to call it
GRANT EXECUTE ON FUNCTION public.backfill_parcel_centroids() TO service_role;
