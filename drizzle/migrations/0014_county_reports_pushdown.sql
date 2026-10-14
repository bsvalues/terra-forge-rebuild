-- Rewrites keep identical columns and statistics but let a county_id filter reach the
-- base tables (grouping/partition keys), so county-scoped reads finish within timeouts.
CREATE OR REPLACE VIEW public.vw_assessment_yoy WITH (security_invoker = on) AS
WITH ranked AS (
  SELECT a.id AS assessment_id, a.parcel_id, a.tax_year, a.total_value, a.land_value, a.improvement_value,
    a.certified, a.county_id, p.parcel_number, p.address, p.neighborhood_code,
    LAG(a.total_value)       OVER w AS prev_total_value,
    LAG(a.land_value)        OVER w AS prev_land_value,
    LAG(a.improvement_value) OVER w AS prev_improvement_value,
    LAG(a.tax_year)          OVER w AS prev_tax_year
  FROM public.assessments a
  JOIN public.parcels p ON p.id = a.parcel_id
  -- county_id is constant per parcel; listing it lets county filters push down.
  WINDOW w AS (PARTITION BY a.county_id, a.parcel_id ORDER BY a.tax_year)
)
SELECT assessment_id, parcel_id, parcel_number, address, neighborhood_code, county_id, tax_year, prev_tax_year,
  total_value, land_value, improvement_value, certified, prev_total_value, prev_land_value, prev_improvement_value,
  (total_value - prev_total_value) AS total_delta,
  (land_value - prev_land_value) AS land_delta,
  (improvement_value - prev_improvement_value) AS improvement_delta,
  CASE WHEN prev_total_value IS NOT NULL AND prev_total_value <> 0 THEN ROUND((total_value - prev_total_value)::numeric / prev_total_value * 100, 2) END AS total_pct_change,
  CASE WHEN prev_land_value IS NOT NULL AND prev_land_value <> 0 THEN ROUND((land_value - prev_land_value)::numeric / prev_land_value * 100, 2) END AS land_pct_change,
  CASE WHEN prev_improvement_value IS NOT NULL AND prev_improvement_value <> 0 THEN ROUND((improvement_value - prev_improvement_value)::numeric / prev_improvement_value * 100, 2) END AS improvement_pct_change
FROM ranked;

CREATE OR REPLACE VIEW public.vw_sales_ratio_county_summary WITH (security_invoker = on) AS
SELECT g.sale_year, g.county_id, g.total_sales, g.qualified_sales,
  ROUND(g.mean_r::numeric, 4) AS mean_ratio,
  ROUND(g.median_r::numeric, 4) AS median_ratio,
  ROUND((d.mad / NULLIF(g.median_r, 0) * 100)::numeric, 2) AS cod,
  ROUND((g.mean_r / NULLIF(g.sum_av / NULLIF(g.sum_sp, 0), 0))::numeric, 4) AS prd,
  g.min_ratio, g.max_ratio, g.stddev_ratio, g.sum_sp AS total_sale_volume, g.sum_av AS total_assessed
FROM (
  SELECT sale_year, county_id, COUNT(*) AS total_sales, COUNT(*) FILTER (WHERE is_qualified) AS qualified_sales,
    AVG(ratio) AS mean_r, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ratio) AS median_r,
    MIN(ratio) AS min_ratio, MAX(ratio) AS max_ratio, STDDEV(ratio) AS stddev_ratio,
    SUM(sale_price) AS sum_sp, SUM(assessed_value) AS sum_av, array_agg(ratio) AS ratios
  FROM public.vw_sales_ratio_detail
  WHERE ratio IS NOT NULL AND ratio BETWEEN 0.1 AND 10
  GROUP BY sale_year, county_id
) g
CROSS JOIN LATERAL (SELECT AVG(ABS(r - g.median_r)) AS mad FROM unnest(g.ratios) r) d
ORDER BY g.sale_year DESC;

CREATE OR REPLACE VIEW public.vw_sales_ratio_by_neighborhood WITH (security_invoker = on) AS
WITH stats AS (
  SELECT g.neighborhood_code, g.county_id, g.sale_year, g.sale_count, g.qualified_count,
    ROUND(g.mean_r::numeric, 4) AS mean_ratio,
    ROUND(g.median_r::numeric, 4) AS median_ratio,
    ROUND((d.mad / NULLIF(g.median_r, 0) * 100)::numeric, 2) AS cod,
    ROUND((g.mean_r / NULLIF(g.sum_av / NULLIF(g.sum_sp, 0), 0))::numeric, 4) AS prd,
    g.sum_sp AS total_sale_volume, g.avg_sp AS avg_sale_price, g.sum_av AS total_assessed, g.avg_av AS avg_assessed,
    g.min_ratio, g.max_ratio, g.stddev_ratio, g.within_10pct_count
  FROM (
    SELECT neighborhood_code, county_id, sale_year, COUNT(*) AS sale_count, COUNT(*) FILTER (WHERE is_qualified) AS qualified_count,
      AVG(ratio) AS mean_r, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ratio) AS median_r,
      SUM(sale_price) AS sum_sp, AVG(sale_price) AS avg_sp, SUM(assessed_value) AS sum_av, AVG(assessed_value) AS avg_av,
      MIN(ratio) AS min_ratio, MAX(ratio) AS max_ratio, STDDEV(ratio) AS stddev_ratio,
      COUNT(*) FILTER (WHERE ratio BETWEEN 0.9 AND 1.1) AS within_10pct_count, array_agg(ratio) AS ratios
    FROM public.vw_sales_ratio_detail
    WHERE ratio IS NOT NULL AND ratio BETWEEN 0.1 AND 10
    GROUP BY neighborhood_code, county_id, sale_year
  ) g
  CROSS JOIN LATERAL (SELECT AVG(ABS(r - g.median_r)) AS mad FROM unnest(g.ratios) r) d
)
SELECT *,
  ROUND(within_10pct_count::numeric / NULLIF(sale_count, 0) * 100, 1) AS within_10pct_pct,
  CASE WHEN cod <= 15 THEN 'pass' WHEN cod <= 20 THEN 'marginal' ELSE 'fail' END AS cod_iaao_grade,
  CASE WHEN prd BETWEEN 0.98 AND 1.03 THEN 'pass' WHEN prd BETWEEN 0.95 AND 1.06 THEN 'marginal' ELSE 'fail' END AS prd_iaao_grade,
  CASE WHEN median_ratio BETWEEN 0.90 AND 1.10 THEN 'pass' WHEN median_ratio BETWEEN 0.85 AND 1.15 THEN 'marginal' ELSE 'fail' END AS median_iaao_grade
FROM stats;
CREATE INDEX IF NOT EXISTS idx_assessments_county_parcel_year ON public.assessments (county_id, parcel_id, tax_year);