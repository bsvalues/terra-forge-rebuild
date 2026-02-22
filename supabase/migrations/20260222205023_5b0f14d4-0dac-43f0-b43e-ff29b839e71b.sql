
-- Phase 0: Add canonical point geometry + source tracking
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS situs_point_wgs84 geometry(Point, 4326),
  ADD COLUMN IF NOT EXISTS situs_source text;

-- Populate from existing WGS84 coordinates
UPDATE public.parcels
SET
  situs_point_wgs84 = ST_SetSRID(ST_MakePoint(longitude_wgs84, latitude_wgs84), 4326),
  situs_source = 'wkid_2927_backfill'
WHERE latitude_wgs84 IS NOT NULL
  AND longitude_wgs84 IS NOT NULL
  AND situs_point_wgs84 IS NULL;

-- Also populate from raw coords that are already valid WGS84
UPDATE public.parcels
SET
  situs_point_wgs84 = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
  situs_source = 'raw_wgs84'
WHERE situs_point_wgs84 IS NULL
  AND latitude IS NOT NULL AND longitude IS NOT NULL
  AND latitude BETWEEN 24.0 AND 50.0
  AND longitude BETWEEN -125.0 AND -66.0;

-- GiST index for spatial joins
CREATE INDEX IF NOT EXISTS idx_parcels_situs_point_wgs84
  ON public.parcels USING gist (situs_point_wgs84);

-- Btree on situs_source for filtering
CREATE INDEX IF NOT EXISTS idx_parcels_situs_source
  ON public.parcels (situs_source);

-- Auto-populate situs_point on future backfill updates
CREATE OR REPLACE FUNCTION public.sync_situs_point_on_wgs84_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude_wgs84 IS NOT NULL AND NEW.longitude_wgs84 IS NOT NULL THEN
    NEW.situs_point_wgs84 := ST_SetSRID(ST_MakePoint(NEW.longitude_wgs84, NEW.latitude_wgs84), 4326);
    IF NEW.situs_source IS NULL THEN
      NEW.situs_source := 'wkid_2927_backfill';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_situs_point ON public.parcels;
CREATE TRIGGER trg_sync_situs_point
  BEFORE INSERT OR UPDATE OF latitude_wgs84, longitude_wgs84
  ON public.parcels
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_situs_point_on_wgs84_update();
