-- TerraFusion OS — GiST spatial indices for spatial join performance
-- ====================================================================
-- Without GiST indices, ST_Intersects in assign_parcels_from_polygon_layer
-- does sequential scans across all 70k+ parcel points × all polygon features,
-- hitting the Supabase 8s statement timeout.
--
-- Adds:
--   idx_gis_features_geom         — speeds up polygon lookups
--   idx_parcels_situs_point_wgs84 — speeds up point-in-polygon checks

CREATE INDEX IF NOT EXISTS idx_gis_features_geom
  ON public.gis_features USING GIST (geom)
  WHERE geom IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parcels_situs_point_wgs84
  ON public.parcels USING GIST (situs_point_wgs84)
  WHERE situs_point_wgs84 IS NOT NULL;
