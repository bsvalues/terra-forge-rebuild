
CREATE OR REPLACE FUNCTION public.compute_ratio_statistics(
  p_tax_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer,
  p_sales_start_date date DEFAULT ((CURRENT_DATE - '2 years'::interval))::date,
  p_sales_end_date date DEFAULT CURRENT_DATE,
  p_neighborhood_code text DEFAULT NULL::text
)
RETURNS TABLE(
  sample_size integer,
  median_ratio numeric,
  mean_ratio numeric,
  cod numeric,
  prd numeric,
  prb numeric,
  low_tier_median numeric,
  mid_tier_median numeric,
  high_tier_median numeric,
  tier_slope numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  -- Compute ratios with IAAO outlier filter: exclude ratios < 0.10 or > 10.0
  SELECT 
    array_agg(ratio ORDER BY ratio),
    array_agg(sale_price ORDER BY sale_price)
  INTO v_ratios, v_values
  FROM (
    SELECT 
      COALESCE(a.total_value, p.assessed_value) / NULLIF(s.sale_price, 0) as ratio,
      s.sale_price
    FROM sales s
    JOIN parcels p ON s.parcel_id = p.id
    LEFT JOIN assessments a ON s.parcel_id = a.parcel_id AND a.tax_year = p_tax_year
    WHERE s.sale_date BETWEEN p_sales_start_date AND p_sales_end_date
      AND s.is_qualified = true
      AND s.sale_price > 0
      AND COALESCE(a.total_value, p.assessed_value) > 0
      AND (p_neighborhood_code IS NULL OR p.neighborhood_code = p_neighborhood_code)
  ) sub
  WHERE ratio IS NOT NULL AND ratio >= 0.10 AND ratio <= 10.0;

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
    ROUND((SELECT AVG(ABS(r - v_median)) FROM unnest(v_ratios) r) / NULLIF(v_median, 0) * 100, 2) as cod,
    ROUND(v_mean / NULLIF(v_weighted_mean, 0), 4) as prd,
    ROUND((COALESCE((v_high_ratios)[array_length(v_high_ratios, 1) / 2 + 1], 0) - COALESCE((v_low_ratios)[array_length(v_low_ratios, 1) / 2 + 1], 0)) / NULLIF(v_median, 0), 4) as prb,
    ROUND(COALESCE((v_low_ratios)[array_length(v_low_ratios, 1) / 2 + 1], 0), 4) as low_tier_median,
    ROUND(COALESCE((v_mid_ratios)[array_length(v_mid_ratios, 1) / 2 + 1], 0), 4) as mid_tier_median,
    ROUND(COALESCE((v_high_ratios)[array_length(v_high_ratios, 1) / 2 + 1], 0), 4) as high_tier_median,
    ROUND(COALESCE((v_high_ratios)[array_length(v_high_ratios, 1) / 2 + 1], 0) - COALESCE((v_low_ratios)[array_length(v_low_ratios, 1) / 2 + 1], 0), 4) as tier_slope;
END;
$function$;
