-- TerraFusion OS — Backfill gis_features.geom for boundary polygon layers
-- =========================================================================
-- seed_arcgis.py did json.dumps(coords) before storing, so gis_features.coordinates
-- is JSONB but its value is a JSON *string* (e.g. "[[[-119.1, 46.2], ...]]"),
-- not a JSONB array.  ST_GeomFromGeoJSON sees a string where it expects an array
-- and raises XX000.
--
-- Fix: use the JSONB text-extraction operator (#>> '{}') to strip the outer
-- quote layer and recover the raw coordinate array text, then embed it directly
-- into a GeoJSON string via ||.
--
-- Targets only the small boundary layers (< 20 features each):
--   Benton Reval Areas        (7 polygons)
--   Benton School Districts   (9 polygons)
--   Benton Hospital Districts (2 polygons)
--   Benton Irrigation Districts (7 polygons)
-- Skips the large parcel layer to avoid a 79k-row update.

UPDATE gis_features f
SET    geom = ST_SetSRID(
                 ST_GeomFromGeoJSON(
                   '{"type":"' || f.geometry_type ||
                   '","coordinates":' || (f.coordinates #>> '{}') || '}'
                 ),
               4326
             )
FROM   gis_layers l
WHERE  f.layer_id       = l.id
  AND  f.geom           IS NULL
  AND  f.coordinates    IS NOT NULL
  AND  f.geometry_type  IN ('Polygon', 'MultiPolygon')
  AND  l.name           IN (
         'Benton Reval Areas',
         'Benton School Districts',
         'Benton Hospital Districts',
         'Benton Irrigation Districts'
       );
