CREATE OR REPLACE FUNCTION public.compute_ratio_statistics_county(p_county_id uuid, p_tax_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer, p_sales_start_date date DEFAULT ((CURRENT_DATE - '2 years'::interval))::date, p_sales_end_date date DEFAULT CURRENT_DATE, p_neighborhood_code text DEFAULT NULL::text, p_outlier_method text DEFAULT 'bounds'::text)
 RETURNS TABLE(sample_size integer, median_ratio numeric, mean_ratio numeric, cod numeric, prd numeric, prb numeric, low_tier_median numeric, mid_tier_median numeric, high_tier_median numeric, tier_slope numeric)
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_all_ratios NUMERIC[];
  v_ratios NUMERIC[];
  v_values NUMERIC[];
  v_median NUMERIC;
  v_mean NUMERIC;
  v_weighted_mean NUMERIC;
  v_low_ratios NUMERIC[];
  v_mid_ratios NUMERIC[];
  v_high_ratios NUMERIC[];
  v_q1 NUMERIC;
  v_q3 NUMERIC;
  v_iqr NUMERIC;
  v_lower_fence NUMERIC;
  v_upper_fence NUMERIC;
BEGIN
  -- County-scoped ratio sample; sale prices stay paired with their ratio.
  SELECT
    array_agg(ratio ORDER BY ratio),
    array_agg(sale_price ORDER BY ratio)
  INTO v_all_ratios, v_values
  FROM (
    SELECT
      COALESCE(a.total_value, p.assessed_value) / NULLIF(s.sale_price, 0) as ratio,
      s.sale_price
    FROM sales s
    JOIN parcels p ON s.parcel_id = p.id
    LEFT JOIN assessments a ON s.parcel_id = a.parcel_id AND a.tax_year = p_tax_year
    WHERE p.county_id = p_county_id AND s.county_id = p_county_id
      AND s.sale_date BETWEEN p_sales_start_date AND p_sales_end_date
      AND s.is_qualified = true
      AND s.sale_price > 0
      AND COALESCE(a.total_value, p.assessed_value) > 0
      AND (p_neighborhood_code IS NULL OR p.neighborhood_code = p_neighborhood_code)
  ) sub
  WHERE ratio IS NOT NULL AND ratio > 0;

  IF v_all_ratios IS NULL OR array_length(v_all_ratios, 1) < 3 THEN
    RETURN QUERY SELECT 0::INTEGER, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF p_outlier_method = 'iqr' THEN
    v_q1 := (v_all_ratios)[GREATEST(1, array_length(v_all_ratios, 1) / 4)];
    v_q3 := (v_all_ratios)[GREATEST(1, array_length(v_all_ratios, 1) * 3 / 4)];
    v_iqr := v_q3 - v_q1;
    v_lower_fence := v_q1 - 1.5 * v_iqr;
    v_upper_fence := v_q3 + 1.5 * v_iqr;
    SELECT array_agg(r ORDER BY r), array_agg(v ORDER BY r)
    INTO v_ratios, v_values
    FROM unnest(v_all_ratios, v_values) AS t(r, v)
    WHERE r >= v_lower_fence AND r <= v_upper_fence;
  ELSE
    SELECT array_agg(r ORDER BY r), array_agg(v ORDER BY r)
    INTO v_ratios, v_values
    FROM unnest(v_all_ratios, v_values) AS t(r, v)
    WHERE r >= 0.10 AND r <= 10.0;
  END IF;

  IF v_ratios IS NULL OR array_length(v_ratios, 1) < 3 THEN
    RETURN QUERY SELECT 0::INTEGER, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- True median (averages the two middle ratios for even samples)
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY r) INTO v_median FROM unnest(v_ratios) r;
  SELECT AVG(r) INTO v_mean FROM unnest(v_ratios) r;
  -- Sale-weighted mean = sum(assessed) / sum(sale price)
  SELECT SUM(r * v) / NULLIF(SUM(v), 0) INTO v_weighted_mean
  FROM unnest(v_ratios, v_values) AS t(r, v);

  SELECT
    array_agg(r ORDER BY r) FILTER (WHERE idx <= array_length(v_ratios, 1) * 0.33),
    array_agg(r ORDER BY r) FILTER (WHERE idx > array_length(v_ratios, 1) * 0.33 AND idx <= array_length(v_ratios, 1) * 0.67),
    array_agg(r ORDER BY r) FILTER (WHERE idx > array_length(v_ratios, 1) * 0.67)
  INTO v_low_ratios, v_mid_ratios, v_high_ratios
  FROM (SELECT r, row_number() OVER (ORDER BY v) as idx FROM unnest(v_ratios, v_values) AS t(r, v)) sub;

  RETURN QUERY SELECT
    array_length(v_ratios, 1)::INTEGER,
    ROUND(v_median, 4),
    ROUND(v_mean, 4),
    ROUND((SELECT AVG(ABS(r - v_median)) FROM unnest(v_ratios) r) / NULLIF(v_median, 0) * 100, 2),
    ROUND(v_mean / NULLIF(v_weighted_mean, 0), 4),
    -- IAAO PRB: slope of (ratio - median)/median on log2 of value proxy 0.5*(A/median) + 0.5*S
    (SELECT ROUND(regr_slope(((r - v_median) / v_median)::float8,
                             (ln(0.5 * (r * v / v_median) + 0.5 * v) / ln(2))::float8)::numeric, 4)
       FROM unnest(v_ratios, v_values) AS t(r, v)),
    ROUND(COALESCE((v_low_ratios)[array_length(v_low_ratios, 1) / 2 + 1], 0), 4),
    ROUND(COALESCE((v_mid_ratios)[array_length(v_mid_ratios, 1) / 2 + 1], 0), 4),
    ROUND(COALESCE((v_high_ratios)[array_length(v_high_ratios, 1) / 2 + 1], 0), 4),
    ROUND(COALESCE((v_high_ratios)[array_length(v_high_ratios, 1) / 2 + 1], 0) - COALESCE((v_low_ratios)[array_length(v_low_ratios, 1) / 2 + 1], 0), 4);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.compute_ratio_statistics_county(uuid,integer,date,date,text,text) TO authenticated;