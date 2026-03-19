
-- Phase 78: Comparative Dashboard — Multi-Cycle Overlay

CREATE TABLE public.comparison_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  snapshot_label text NOT NULL,
  tax_year integer NOT NULL,
  neighborhood_code text,
  property_class text,
  total_parcels integer NOT NULL DEFAULT 0,
  avg_assessed_value numeric NOT NULL DEFAULT 0,
  median_assessed_value numeric NOT NULL DEFAULT 0,
  avg_land_value numeric NOT NULL DEFAULT 0,
  avg_improvement_value numeric NOT NULL DEFAULT 0,
  total_assessed_value numeric NOT NULL DEFAULT 0,
  avg_sale_price numeric,
  median_ratio numeric,
  cod numeric,
  prd numeric,
  total_sales integer DEFAULT 0,
  qualified_sales integer DEFAULT 0,
  appeal_count integer DEFAULT 0,
  appeal_rate numeric,
  exemption_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comparison_snapshots_county ON public.comparison_snapshots(county_id);
CREATE INDEX idx_comparison_snapshots_year ON public.comparison_snapshots(tax_year);
CREATE INDEX idx_comparison_snapshots_nbhd ON public.comparison_snapshots(neighborhood_code);

ALTER TABLE public.comparison_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view snapshots"
  ON public.comparison_snapshots FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create snapshots"
  ON public.comparison_snapshots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own snapshots"
  ON public.comparison_snapshots FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- RPC: Generate a comparison snapshot from live assessment data
CREATE OR REPLACE FUNCTION public.generate_comparison_snapshot(
  p_county_id uuid,
  p_tax_year integer,
  p_label text DEFAULT NULL,
  p_neighborhood_code text DEFAULT NULL,
  p_property_class text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id uuid;
  v_total_parcels integer;
  v_avg_assessed numeric;
  v_median_assessed numeric;
  v_avg_land numeric;
  v_avg_improvement numeric;
  v_total_assessed numeric;
  v_avg_sale_price numeric;
  v_total_sales integer;
  v_qualified_sales integer;
  v_appeal_count integer;
  v_exemption_count integer;
  v_label text;
BEGIN
  v_label := COALESCE(p_label, 'TY ' || p_tax_year || COALESCE(' — ' || p_neighborhood_code, ''));

  SELECT
    COUNT(*)::integer,
    COALESCE(AVG(a.total_value), 0),
    COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY a.total_value), 0),
    COALESCE(AVG(a.land_value), 0),
    COALESCE(AVG(a.improvement_value), 0),
    COALESCE(SUM(a.total_value), 0)
  INTO v_total_parcels, v_avg_assessed, v_median_assessed, v_avg_land, v_avg_improvement, v_total_assessed
  FROM assessments a
  JOIN parcels p ON p.id = a.parcel_id
  WHERE a.county_id = p_county_id
    AND a.tax_year = p_tax_year
    AND (p_neighborhood_code IS NULL OR p.neighborhood_code = p_neighborhood_code)
    AND (p_property_class IS NULL OR p.property_class = p_property_class);

  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE s.is_qualified)::integer,
    COALESCE(AVG(s.sale_price), 0)
  INTO v_total_sales, v_qualified_sales, v_avg_sale_price
  FROM sales s
  JOIN parcels p ON p.id = s.parcel_id
  WHERE p.county_id = p_county_id
    AND EXTRACT(YEAR FROM s.sale_date::date) = p_tax_year
    AND (p_neighborhood_code IS NULL OR p.neighborhood_code = p_neighborhood_code)
    AND (p_property_class IS NULL OR p.property_class = p_property_class);

  SELECT COUNT(*)::integer INTO v_appeal_count
  FROM appeals ap
  WHERE ap.county_id = p_county_id
    AND ap.tax_year = p_tax_year;

  SELECT COUNT(*)::integer INTO v_exemption_count
  FROM exemptions ex
  JOIN parcels p ON p.id = ex.parcel_id
  WHERE p.county_id = p_county_id
    AND ex.tax_year = p_tax_year;

  INSERT INTO comparison_snapshots (
    county_id, snapshot_label, tax_year, neighborhood_code, property_class,
    total_parcels, avg_assessed_value, median_assessed_value,
    avg_land_value, avg_improvement_value, total_assessed_value,
    avg_sale_price, total_sales, qualified_sales,
    appeal_count, appeal_rate, exemption_count
  ) VALUES (
    p_county_id, v_label, p_tax_year, p_neighborhood_code, p_property_class,
    v_total_parcels, v_avg_assessed, v_median_assessed,
    v_avg_land, v_avg_improvement, v_total_assessed,
    v_avg_sale_price, v_total_sales, v_qualified_sales,
    v_appeal_count,
    CASE WHEN v_total_parcels > 0 THEN ROUND((v_appeal_count::numeric / v_total_parcels) * 100, 2) ELSE 0 END,
    v_exemption_count
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;
