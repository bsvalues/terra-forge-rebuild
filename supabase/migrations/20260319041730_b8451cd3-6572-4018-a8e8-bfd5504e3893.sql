
-- Phase 70: Neighborhood auto-discovery RPC
-- "I found a neighborhood hiding in the data. It was scared." — Ralph Wiggum

-- Add model_type and property_classes columns to neighborhoods for model area config
ALTER TABLE public.neighborhoods
  ADD COLUMN IF NOT EXISTS model_type text DEFAULT 'linear',
  ADD COLUMN IF NOT EXISTS property_classes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'discovered';

-- RPC: Discover neighborhood codes from parcels that are not yet registered
CREATE OR REPLACE FUNCTION public.discover_unregistered_neighborhoods()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.parcel_count DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      p.neighborhood_code AS hood_cd,
      COUNT(*) AS parcel_count,
      ROUND(AVG(p.assessed_value)::numeric, 0) AS avg_value,
      ROUND(AVG(p.building_area)::numeric, 0) AS avg_building_area,
      ROUND(AVG(p.year_built)::numeric, 0) AS avg_year_built,
      COUNT(*) FILTER (WHERE p.latitude IS NOT NULL) AS with_coords,
      COUNT(DISTINCT p.property_class) AS class_count,
      ARRAY_AGG(DISTINCT p.property_class) FILTER (WHERE p.property_class IS NOT NULL) AS property_classes,
      EXISTS(
        SELECT 1 FROM neighborhoods n
        WHERE n.hood_cd = p.neighborhood_code
      ) AS is_registered,
      (
        SELECT cr.r_squared FROM calibration_runs cr
        WHERE cr.neighborhood_code = p.neighborhood_code AND cr.status = 'applied'
        ORDER BY cr.created_at DESC LIMIT 1
      ) AS latest_r_squared
    FROM parcels p
    WHERE p.neighborhood_code IS NOT NULL
    GROUP BY p.neighborhood_code
  ) sub;

  RETURN result;
END;
$$;
