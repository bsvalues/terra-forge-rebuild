-- Phase 150: Sales Ratio Study — IAAO-standard ratio analysis
-- Joins TF sales to TF assessments (same parcel + same/adjacent tax year).
-- Produces per-sale ratios, neighborhood aggregates, and IAAO compliance stats.
-- Reference: IAAO Standard on Ratio Studies (2013).

-- ── 1. Per-sale ratio detail view ────────────────────────────────
CREATE OR REPLACE VIEW vw_sales_ratio_detail AS
SELECT
  s.id                            AS sale_id,
  s.parcel_id,
  p.parcel_number,
  p.address,
  p.neighborhood_code,
  s.county_id,
  s.sale_date,
  EXTRACT(YEAR FROM s.sale_date)::integer AS sale_year,
  s.sale_price,
  s.deed_type,
  s.is_qualified,
  a.id                            AS assessment_id,
  a.tax_year,
  a.total_value                   AS assessed_value,
  a.land_value,
  a.improvement_value,
  a.certified,
  -- Core ratio: assessed / sale
  CASE
    WHEN s.sale_price > 0
    THEN ROUND(a.total_value::numeric / s.sale_price, 4)
  END                             AS ratio,
  -- Dollar difference
  (a.total_value - s.sale_price)  AS value_delta,
  -- Percent over/under
  CASE
    WHEN s.sale_price > 0
    THEN ROUND((a.total_value - s.sale_price)::numeric / s.sale_price * 100, 2)
  END                             AS pct_over_under
FROM sales s
JOIN parcels p ON p.id = s.parcel_id
-- Match assessment within ±1 year of sale year for closest appraisal
JOIN assessments a ON a.parcel_id = s.parcel_id
  AND a.tax_year = (
    SELECT a2.tax_year
    FROM assessments a2
    WHERE a2.parcel_id = s.parcel_id
      AND ABS(a2.tax_year - EXTRACT(YEAR FROM s.sale_date)::integer) <= 2
    ORDER BY ABS(a2.tax_year - EXTRACT(YEAR FROM s.sale_date)::integer), a2.tax_year DESC
    LIMIT 1
  )
WHERE s.sale_price > 0
  AND a.total_value > 0;

-- ── 2. Neighborhood-level ratio study summary ─────────────────────
-- IAAO stats: median ratio, mean ratio, COD, PRD, sale count
CREATE OR REPLACE VIEW vw_sales_ratio_by_neighborhood AS
WITH base AS (
  SELECT
    neighborhood_code,
    county_id,
    sale_year,
    ratio,
    sale_price,
    assessed_value,
    is_qualified
  FROM vw_sales_ratio_detail
  WHERE ratio IS NOT NULL
    AND ratio BETWEEN 0.1 AND 10
),
medians AS (
  SELECT
    neighborhood_code,
    county_id,
    sale_year,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ratio) AS median_ratio
  FROM base
  GROUP BY neighborhood_code, county_id, sale_year
),
stats AS (
  SELECT
    b.neighborhood_code,
    b.county_id,
    b.sale_year,
    COUNT(*)                                      AS sale_count,
    COUNT(*) FILTER (WHERE b.is_qualified)        AS qualified_count,
    ROUND(AVG(b.ratio)::numeric, 4)               AS mean_ratio,
    ROUND(m.median_ratio::numeric, 4)             AS median_ratio,
    ROUND(
      (AVG(ABS(b.ratio - m.median_ratio))
      / NULLIF(m.median_ratio, 0) * 100)::numeric
    , 2) AS cod,
    ROUND(
      (AVG(b.ratio) /
      NULLIF(SUM(b.assessed_value) / NULLIF(SUM(b.sale_price), 0), 0))::numeric
    , 4) AS prd,
    SUM(b.sale_price)                             AS total_sale_volume,
    AVG(b.sale_price)                             AS avg_sale_price,
    SUM(b.assessed_value)                         AS total_assessed,
    AVG(b.assessed_value)                         AS avg_assessed,
    MIN(b.ratio)                                  AS min_ratio,
    MAX(b.ratio)                                  AS max_ratio,
    STDDEV(b.ratio)                               AS stddev_ratio,
    COUNT(*) FILTER (WHERE b.ratio BETWEEN 0.9 AND 1.1) AS within_10pct_count
  FROM base b
  JOIN medians m USING (neighborhood_code, county_id, sale_year)
  GROUP BY b.neighborhood_code, b.county_id, b.sale_year, m.median_ratio
)
SELECT
  *,
  ROUND(within_10pct_count::numeric / NULLIF(sale_count, 0) * 100, 1) AS within_10pct_pct,
  -- IAAO compliance flags
  CASE
    WHEN cod <= 15 THEN 'pass'
    WHEN cod <= 20 THEN 'marginal'
    ELSE 'fail'
  END AS cod_iaao_grade,
  CASE
    WHEN prd BETWEEN 0.98 AND 1.03 THEN 'pass'
    WHEN prd BETWEEN 0.95 AND 1.06 THEN 'marginal'
    ELSE 'fail'
  END AS prd_iaao_grade,
  CASE
    WHEN median_ratio BETWEEN 0.90 AND 1.10 THEN 'pass'
    WHEN median_ratio BETWEEN 0.85 AND 1.15 THEN 'marginal'
    ELSE 'fail'
  END AS median_iaao_grade
FROM stats;

-- ── 3. County-level summary by year ──────────────────────────────
CREATE OR REPLACE VIEW vw_sales_ratio_county_summary AS
WITH base AS (
  SELECT sale_year, county_id, ratio, sale_price, assessed_value, is_qualified
  FROM vw_sales_ratio_detail
  WHERE ratio IS NOT NULL AND ratio BETWEEN 0.1 AND 10
),
medians AS (
  SELECT sale_year, county_id,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ratio) AS median_ratio
  FROM base
  GROUP BY sale_year, county_id
)
SELECT
  b.sale_year,
  b.county_id,
  COUNT(*)                                      AS total_sales,
  COUNT(*) FILTER (WHERE b.is_qualified)        AS qualified_sales,
  ROUND(AVG(b.ratio)::numeric, 4)               AS mean_ratio,
  ROUND(m.median_ratio::numeric, 4)             AS median_ratio,
  ROUND(
    (AVG(ABS(b.ratio - m.median_ratio))
    / NULLIF(m.median_ratio, 0) * 100)::numeric
  , 2) AS cod,
  ROUND(
    (AVG(b.ratio) /
    NULLIF(SUM(b.assessed_value) / NULLIF(SUM(b.sale_price), 0), 0))::numeric
  , 4) AS prd,
  MIN(b.ratio) AS min_ratio,
  MAX(b.ratio) AS max_ratio,
  STDDEV(b.ratio) AS stddev_ratio,
  SUM(b.sale_price) AS total_sale_volume,
  SUM(b.assessed_value) AS total_assessed
FROM base b
JOIN medians m USING (sale_year, county_id)
GROUP BY b.sale_year, b.county_id, m.median_ratio
ORDER BY b.sale_year DESC;
