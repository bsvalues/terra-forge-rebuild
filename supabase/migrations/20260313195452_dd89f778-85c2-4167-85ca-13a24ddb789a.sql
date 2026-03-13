
-- Compute the distribution of individual parcel-level ratio deviations from median
-- Used by COD drilldown to show how ratios are distributed
CREATE OR REPLACE FUNCTION compute_ratio_distribution(
  p_tax_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)::integer,
  p_sales_start_date date DEFAULT (CURRENT_DATE - interval '24 months')::date,
  p_sales_end_date date DEFAULT CURRENT_DATE,
  p_neighborhood_code text DEFAULT NULL,
  p_outlier_method text DEFAULT 'bounds'
)
RETURNS TABLE(
  range_label text,
  range_min numeric,
  range_max numeric,
  parcel_count integer,
  percentage numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count integer;
  q1_val numeric;
  q3_val numeric;
  iqr_val numeric;
  lower_bound numeric;
  upper_bound numeric;
BEGIN
  -- Build filtered ratios into temp table
  CREATE TEMP TABLE _ratios ON COMMIT DROP AS
  SELECT 
    a.parcel_id,
    a.total_value AS assessed,
    s.sale_price,
    CASE WHEN s.sale_price > 0 THEN a.total_value::numeric / s.sale_price::numeric ELSE NULL END AS ratio
  FROM assessments a
  JOIN parcels p ON p.id = a.parcel_id
  JOIN sales s ON s.parcel_id = a.parcel_id
    AND s.sale_date BETWEEN p_sales_start_date AND p_sales_end_date
    AND s.is_qualified = true
    AND s.sale_price > 0
  WHERE a.tax_year = p_tax_year
    AND (p_neighborhood_code IS NULL OR p.neighborhood_code = p_neighborhood_code);

  -- Remove nulls
  DELETE FROM _ratios WHERE ratio IS NULL;

  -- Apply outlier filtering
  IF p_outlier_method = 'iqr' THEN
    SELECT percentile_cont(0.25) WITHIN GROUP (ORDER BY ratio),
           percentile_cont(0.75) WITHIN GROUP (ORDER BY ratio)
    INTO q1_val, q3_val FROM _ratios;
    
    iqr_val := q3_val - q1_val;
    lower_bound := q1_val - 1.5 * iqr_val;
    upper_bound := q3_val + 1.5 * iqr_val;
    DELETE FROM _ratios WHERE ratio < lower_bound OR ratio > upper_bound;
  ELSE
    DELETE FROM _ratios WHERE ratio < 0.10 OR ratio > 10.0;
  END IF;

  SELECT count(*) INTO total_count FROM _ratios;

  -- Compute COD-style deviation buckets
  -- COD = average absolute deviation from median / median * 100
  -- We bucket individual |deviation from median| percentages
  RETURN QUERY
  WITH median_val AS (
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY ratio) AS med FROM _ratios
  ),
  deviations AS (
    SELECT 
      ABS(r.ratio - m.med) / NULLIF(m.med, 0) * 100 AS pct_deviation
    FROM _ratios r, median_val m
  )
  SELECT 
    b.label::text,
    b.lo,
    b.hi,
    count(d.pct_deviation)::integer AS parcel_count,
    CASE WHEN total_count > 0 
      THEN round(count(d.pct_deviation)::numeric / total_count * 100, 1)
      ELSE 0 
    END AS percentage
  FROM (VALUES 
    ('0-5%', 0::numeric, 5::numeric),
    ('5-10%', 5::numeric, 10::numeric),
    ('10-15%', 10::numeric, 15::numeric),
    ('15-20%', 15::numeric, 20::numeric),
    ('20-25%', 20::numeric, 25::numeric),
    ('>25%', 25::numeric, 999::numeric)
  ) AS b(label, lo, hi)
  LEFT JOIN deviations d ON d.pct_deviation >= b.lo AND d.pct_deviation < b.hi
  GROUP BY b.label, b.lo, b.hi
  ORDER BY b.lo;
END;
$$;
