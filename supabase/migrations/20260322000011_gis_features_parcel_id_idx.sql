-- TerraFusion OS — gis_features index for parcel_id joins
-- ==========================================================
-- The backfill_parcel_attributes_from_gis RPC joins gis_features → parcels
-- via gis_features.parcel_id = parcels.id.
-- Without an index on parcel_id this is a sequential scan for every page.

CREATE INDEX IF NOT EXISTS gis_features_parcel_id_idx
  ON gis_features (parcel_id)
  WHERE parcel_id IS NOT NULL;
