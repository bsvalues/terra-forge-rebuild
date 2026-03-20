
CREATE INDEX IF NOT EXISTS idx_parcels_nbhd_coords 
ON parcels (county_id, latitude_wgs84, longitude_wgs84) 
WHERE neighborhood_code IS NOT NULL AND neighborhood_code != '' 
  AND latitude_wgs84 IS NOT NULL AND longitude_wgs84 IS NOT NULL;
