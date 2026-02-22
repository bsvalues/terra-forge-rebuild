
-- Hardening: constrain coord metadata fields
ALTER TABLE public.parcels
  ADD CONSTRAINT parcels_coord_confidence_range
  CHECK (coord_confidence IS NULL OR (coord_confidence BETWEEN 0 AND 100));

ALTER TABLE public.parcels
  ADD CONSTRAINT parcels_coord_detected_srid_valid
  CHECK (coord_detected_srid IS NULL OR coord_detected_srid IN (2927, 4326));
