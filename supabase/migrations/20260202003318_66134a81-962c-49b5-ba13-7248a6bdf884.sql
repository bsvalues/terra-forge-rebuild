-- =====================================================
-- TerraFusion Data Architecture Redesign
-- =====================================================

-- 1. Create data_sources table to track import origins
CREATE TABLE public.data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('cama_export', 'state_dor', 'gis_import', 'recorder_feed', 'manual_entry', 'web_scrape', 'external_api')),
  description TEXT,
  connection_config JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  record_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create assessments table for historical values by tax year
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  land_value NUMERIC NOT NULL DEFAULT 0,
  improvement_value NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC GENERATED ALWAYS AS (land_value + improvement_value) STORED,
  assessment_date DATE DEFAULT CURRENT_DATE,
  assessment_reason TEXT CHECK (assessment_reason IN ('annual', 'new_construction', 'remodel', 'appeal_adjustment', 'correction', 'sales_review')),
  certified BOOLEAN DEFAULT false,
  certified_at TIMESTAMPTZ,
  data_source_id UUID REFERENCES public.data_sources(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parcel_id, tax_year)
);

-- 3. Create external_valuations table for comparison data
CREATE TABLE public.external_valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('zillow', 'redfin', 'realtor', 'mls', 'census', 'state_dor')),
  valuation_date DATE NOT NULL,
  estimated_value NUMERIC,
  listing_price NUMERIC,
  days_on_market INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Add source tracking to existing tables
ALTER TABLE public.parcels 
  ADD COLUMN IF NOT EXISTS data_source_id UUID REFERENCES public.data_sources(id),
  ADD COLUMN IF NOT EXISTS source_parcel_id TEXT,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS data_source_id UUID REFERENCES public.data_sources(id),
  ADD COLUMN IF NOT EXISTS source_document_id TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'qualified', 'disqualified')),
  ADD COLUMN IF NOT EXISTS disqualification_reason TEXT;

-- 5. Add tax_year to appeals (replacing study_period dependency)
ALTER TABLE public.appeals
  ADD COLUMN IF NOT EXISTS tax_year INTEGER DEFAULT EXTRACT(year FROM CURRENT_DATE);

-- 6. Create function to compute ratio statistics on-demand
CREATE OR REPLACE FUNCTION public.compute_ratio_statistics(
  p_tax_year INTEGER DEFAULT EXTRACT(year FROM CURRENT_DATE)::INTEGER,
  p_sales_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '24 months')::DATE,
  p_sales_end_date DATE DEFAULT CURRENT_DATE,
  p_neighborhood_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  sample_size INTEGER,
  median_ratio NUMERIC,
  mean_ratio NUMERIC,
  cod NUMERIC,
  prd NUMERIC,
  prb NUMERIC,
  low_tier_median NUMERIC,
  mid_tier_median NUMERIC,
  high_tier_median NUMERIC,
  tier_slope NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ratios NUMERIC[];
  v_values NUMERIC[];
  v_median NUMERIC;
  v_mean NUMERIC;
  v_weighted_mean NUMERIC;
  v_low_ratios NUMERIC[];
  v_mid_ratios NUMERIC[];
  v_high_ratios NUMERIC[];
BEGIN
  -- Collect ratios from qualified sales within the window
  SELECT 
    array_agg(a.total_value / NULLIF(s.sale_price, 0) ORDER BY a.total_value / NULLIF(s.sale_price, 0)),
    array_agg(s.sale_price ORDER BY s.sale_price)
  INTO v_ratios, v_values
  FROM sales s
  JOIN parcels p ON s.parcel_id = p.id
  LEFT JOIN assessments a ON s.parcel_id = a.parcel_id AND a.tax_year = p_tax_year
  WHERE s.sale_date BETWEEN p_sales_start_date AND p_sales_end_date
    AND s.is_qualified = true
    AND s.sale_price > 0
    AND (a.total_value IS NOT NULL OR p.assessed_value IS NOT NULL)
    AND (p_neighborhood_code IS NULL OR p.neighborhood_code = p_neighborhood_code);

  -- Use assessed_value from parcels if no assessment record exists
  IF array_length(v_ratios, 1) IS NULL OR array_length(v_ratios, 1) < 3 THEN
    SELECT 
      array_agg(p.assessed_value / NULLIF(s.sale_price, 0) ORDER BY p.assessed_value / NULLIF(s.sale_price, 0)),
      array_agg(s.sale_price ORDER BY s.sale_price)
    INTO v_ratios, v_values
    FROM sales s
    JOIN parcels p ON s.parcel_id = p.id
    WHERE s.sale_date BETWEEN p_sales_start_date AND p_sales_end_date
      AND s.is_qualified = true
      AND s.sale_price > 0
      AND p.assessed_value > 0
      AND (p_neighborhood_code IS NULL OR p.neighborhood_code = p_neighborhood_code);
  END IF;

  IF v_ratios IS NULL OR array_length(v_ratios, 1) < 3 THEN
    RETURN QUERY SELECT 0::INTEGER, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Calculate median
  v_median := (v_ratios)[array_length(v_ratios, 1) / 2 + 1];
  
  -- Calculate mean
  SELECT AVG(r) INTO v_mean FROM unnest(v_ratios) r;
  
  -- Calculate weighted mean (by value)
  SELECT SUM(r * v) / NULLIF(SUM(v), 0) INTO v_weighted_mean 
  FROM unnest(v_ratios, v_values) AS t(r, v);

  -- Split into tiers based on value
  SELECT 
    array_agg(r ORDER BY r) FILTER (WHERE idx <= array_length(v_ratios, 1) * 0.33),
    array_agg(r ORDER BY r) FILTER (WHERE idx > array_length(v_ratios, 1) * 0.33 AND idx <= array_length(v_ratios, 1) * 0.67),
    array_agg(r ORDER BY r) FILTER (WHERE idx > array_length(v_ratios, 1) * 0.67)
  INTO v_low_ratios, v_mid_ratios, v_high_ratios
  FROM (SELECT r, row_number() OVER (ORDER BY v) as idx FROM unnest(v_ratios, v_values) AS t(r, v)) sub;

  RETURN QUERY SELECT
    array_length(v_ratios, 1)::INTEGER as sample_size,
    ROUND(v_median, 4) as median_ratio,
    ROUND(v_mean, 4) as mean_ratio,
    -- COD = (avg absolute deviation from median / median) * 100
    ROUND((SELECT AVG(ABS(r - v_median)) FROM unnest(v_ratios) r) / NULLIF(v_median, 0) * 100, 2) as cod,
    -- PRD = mean ratio / weighted mean ratio
    ROUND(v_mean / NULLIF(v_weighted_mean, 0), 4) as prd,
    -- PRB simplified approximation
    ROUND((COALESCE((v_high_ratios)[array_length(v_high_ratios, 1) / 2 + 1], 0) - COALESCE((v_low_ratios)[array_length(v_low_ratios, 1) / 2 + 1], 0)) / NULLIF(v_median, 0), 4) as prb,
    -- Tier medians
    ROUND(COALESCE((v_low_ratios)[array_length(v_low_ratios, 1) / 2 + 1], 0), 4) as low_tier_median,
    ROUND(COALESCE((v_mid_ratios)[array_length(v_mid_ratios, 1) / 2 + 1], 0), 4) as mid_tier_median,
    ROUND(COALESCE((v_high_ratios)[array_length(v_high_ratios, 1) / 2 + 1], 0), 4) as high_tier_median,
    -- Tier slope = high tier median - low tier median
    ROUND(COALESCE((v_high_ratios)[array_length(v_high_ratios, 1) / 2 + 1], 0) - COALESCE((v_low_ratios)[array_length(v_low_ratios, 1) / 2 + 1], 0), 4) as tier_slope;
END;
$$;

-- 7. Create index for performance
CREATE INDEX IF NOT EXISTS idx_assessments_parcel_year ON public.assessments(parcel_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_assessments_tax_year ON public.assessments(tax_year);
CREATE INDEX IF NOT EXISTS idx_sales_date_qualified ON public.sales(sale_date, is_qualified);
CREATE INDEX IF NOT EXISTS idx_external_valuations_parcel ON public.external_valuations(parcel_id, source);

-- 8. Enable RLS on new tables
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_valuations ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
CREATE POLICY "Anyone can view data sources" ON public.data_sources FOR SELECT USING (true);
CREATE POLICY "Admins can manage data sources" ON public.data_sources FOR ALL USING (is_admin());

CREATE POLICY "Anyone can view assessments" ON public.assessments FOR SELECT USING (true);
CREATE POLICY "Admins can manage assessments" ON public.assessments FOR ALL USING (is_admin());

CREATE POLICY "Anyone can view external valuations" ON public.external_valuations FOR SELECT USING (true);
CREATE POLICY "Admins can manage external valuations" ON public.external_valuations FOR ALL USING (is_admin());

-- 10. Add triggers for updated_at
CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();