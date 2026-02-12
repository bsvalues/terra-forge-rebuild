-- Widen latitude/longitude columns to handle State Plane coordinates and WGS84
ALTER TABLE public.parcels 
  ALTER COLUMN latitude TYPE double precision,
  ALTER COLUMN longitude TYPE double precision;