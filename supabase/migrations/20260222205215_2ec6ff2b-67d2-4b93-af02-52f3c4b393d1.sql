
-- Harden trigger: null-guard + coord_source awareness
CREATE OR REPLACE FUNCTION public.sync_situs_point_on_wgs84_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude_wgs84 IS NULL OR NEW.longitude_wgs84 IS NULL THEN
    NEW.situs_point_wgs84 := NULL;
    RETURN NEW;
  END IF;

  NEW.situs_point_wgs84 := ST_SetSRID(ST_MakePoint(NEW.longitude_wgs84, NEW.latitude_wgs84), 4326);

  IF NEW.coord_source = 'raw_wgs84' THEN
    NEW.situs_source := 'raw_wgs84';
  ELSE
    NEW.situs_source := 'wkid_2927_backfill';
  END IF;

  RETURN NEW;
END;
$$;

-- Rebind trigger to also fire on coord_source changes
DROP TRIGGER IF EXISTS trg_sync_situs_point ON public.parcels;
CREATE TRIGGER trg_sync_situs_point
  BEFORE INSERT OR UPDATE OF latitude_wgs84, longitude_wgs84, coord_source
  ON public.parcels
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_situs_point_on_wgs84_update();

-- SRID safety constraint
ALTER TABLE public.parcels
  ADD CONSTRAINT parcels_situs_point_wgs84_srid_chk
  CHECK (situs_point_wgs84 IS NULL OR st_srid(situs_point_wgs84) = 4326);
