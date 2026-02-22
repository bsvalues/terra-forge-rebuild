
-- ============================================================
-- Neighborhood Analytics Spine: Year-Scoped Dimension + Bridge
-- ============================================================

-- 1) Neighborhoods dimension table (year-versioned, matching PACS hood_yr)
CREATE TABLE public.neighborhoods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id UUID NOT NULL REFERENCES public.counties(id),
  year INTEGER NOT NULL,
  hood_cd TEXT NOT NULL,
  hood_name TEXT,
  geometry JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, year, hood_cd)
);

-- 2) Parcel ↔ Neighborhood bridge (year-scoped assignment from property_val)
CREATE TABLE public.parcel_neighborhood_year (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id UUID NOT NULL REFERENCES public.counties(id),
  year INTEGER NOT NULL,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id),
  hood_cd TEXT NOT NULL,
  sup_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, year, parcel_id)
);

-- Indexes for fast neighborhood rollups
CREATE INDEX idx_neighborhoods_county_year ON public.neighborhoods(county_id, year);
CREATE INDEX idx_pny_county_year_hood ON public.parcel_neighborhood_year(county_id, year, hood_cd);
CREATE INDEX idx_pny_parcel ON public.parcel_neighborhood_year(parcel_id);

-- RLS: neighborhoods
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view neighborhoods in their county"
  ON public.neighborhoods FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert neighborhoods for their county"
  ON public.neighborhoods FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update neighborhoods in their county"
  ON public.neighborhoods FOR UPDATE
  USING (county_id = get_user_county_id());

CREATE POLICY "Admins can delete neighborhoods"
  ON public.neighborhoods FOR DELETE
  USING (is_admin());

-- RLS: parcel_neighborhood_year
ALTER TABLE public.parcel_neighborhood_year ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parcel neighborhoods in their county"
  ON public.parcel_neighborhood_year FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert parcel neighborhoods for their county"
  ON public.parcel_neighborhood_year FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update parcel neighborhoods in their county"
  ON public.parcel_neighborhood_year FOR UPDATE
  USING (county_id = get_user_county_id());

CREATE POLICY "Admins can delete parcel neighborhoods"
  ON public.parcel_neighborhood_year FOR DELETE
  USING (is_admin());

-- 3) RPC: Neighborhood rollup stats for a given year
CREATE OR REPLACE FUNCTION public.get_neighborhood_stats(
  p_year INTEGER DEFAULT EXTRACT(year FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  hood_cd TEXT,
  hood_name TEXT,
  parcel_count BIGINT,
  avg_assessed_value NUMERIC,
  min_assessed_value NUMERIC,
  max_assessed_value NUMERIC,
  avg_land_value NUMERIC,
  avg_improvement_value NUMERIC,
  total_assessed_value NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pny.hood_cd,
    n.hood_name,
    COUNT(*)::BIGINT AS parcel_count,
    ROUND(AVG(p.assessed_value), 2) AS avg_assessed_value,
    MIN(p.assessed_value) AS min_assessed_value,
    MAX(p.assessed_value) AS max_assessed_value,
    ROUND(AVG(p.land_value), 2) AS avg_land_value,
    ROUND(AVG(p.improvement_value), 2) AS avg_improvement_value,
    SUM(p.assessed_value) AS total_assessed_value
  FROM parcel_neighborhood_year pny
  JOIN parcels p ON p.id = pny.parcel_id
  LEFT JOIN neighborhoods n
    ON n.county_id = pny.county_id
    AND n.year = pny.year
    AND n.hood_cd = pny.hood_cd
  WHERE pny.county_id = get_user_county_id()
    AND pny.year = p_year
  GROUP BY pny.hood_cd, n.hood_name
  ORDER BY parcel_count DESC;
$$;
