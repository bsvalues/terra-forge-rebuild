-- TerraFusion OS — gis_features composite index for paginated backfill
-- =======================================================================
-- The paginated backfill RPC does:
--   SELECT ... FROM gis_features WHERE layer_id = ? ORDER BY id LIMIT n OFFSET n
-- Without (layer_id, id) index this is a full 83k-row scan + sort every page.

CREATE INDEX IF NOT EXISTS gis_features_layer_id_idx
  ON gis_features (layer_id, id);
