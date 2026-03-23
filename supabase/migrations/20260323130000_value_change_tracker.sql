-- Phase 149: Value Change Tracker — Year-over-Year Assessment Deltas
-- Uses window functions (LAG) on the 247K-row TF assessments table.
-- Surfaces per-parcel changes, county-level rollups, and top movers.

-- ── 1. Per-parcel year-over-year view ────────────────────────────
CREATE OR REPLACE VIEW vw_assessment_yoy AS
WITH ranked AS (
  SELECT
    a.id                   AS assessment_id,
    a.parcel_id,
    a.tax_year,
    a.total_value,
    a.land_value,
    a.improvement_value,
    a.certified,
    a.county_id,
    p.parcel_number,
    p.address,
    p.neighborhood_code,
    -- LAG to get previous year values within the same parcel
    LAG(a.total_value)       OVER (PARTITION BY a.parcel_id ORDER BY a.tax_year) AS prev_total_value,
    LAG(a.land_value)        OVER (PARTITION BY a.parcel_id ORDER BY a.tax_year) AS prev_land_value,
    LAG(a.improvement_value) OVER (PARTITION BY a.parcel_id ORDER BY a.tax_year) AS prev_improvement_value,
    LAG(a.tax_year)          OVER (PARTITION BY a.parcel_id ORDER BY a.tax_year) AS prev_tax_year
  FROM assessments a
  JOIN parcels p ON p.id = a.parcel_id
)
SELECT
  assessment_id,
  parcel_id,
  parcel_number,
  address,
  neighborhood_code,
  county_id,
  tax_year,
  prev_tax_year,
  total_value,
  land_value,
  improvement_value,
  certified,
  prev_total_value,
  prev_land_value,
  prev_improvement_value,
  -- Dollar deltas
  (total_value - prev_total_value)             AS total_delta,
  (land_value - prev_land_value)               AS land_delta,
  (improvement_value - prev_improvement_value) AS improvement_delta,
  -- Percent changes (null-safe, avoid division by zero)
  CASE
    WHEN prev_total_value IS NOT NULL AND prev_total_value <> 0
    THEN ROUND((total_value - prev_total_value)::numeric / prev_total_value * 100, 2)
  END AS total_pct_change,
  CASE
    WHEN prev_land_value IS NOT NULL AND prev_land_value <> 0
    THEN ROUND((land_value - prev_land_value)::numeric / prev_land_value * 100, 2)
  END AS land_pct_change,
  CASE
    WHEN prev_improvement_value IS NOT NULL AND prev_improvement_value <> 0
    THEN ROUND((improvement_value - prev_improvement_value)::numeric / prev_improvement_value * 100, 2)
  END AS improvement_pct_change
FROM ranked;

-- ── 2. County-level YoY summary by tax_year ──────────────────────
CREATE OR REPLACE VIEW vw_assessment_yoy_summary AS
SELECT
  tax_year,
  prev_tax_year,
  county_id,
  COUNT(*)                                                   AS parcel_count,
  COUNT(*) FILTER (WHERE prev_total_value IS NOT NULL)      AS yoy_parcel_count,
  AVG(total_delta)        FILTER (WHERE total_delta IS NOT NULL AND prev_total_value IS NOT NULL) AS avg_total_delta,
  SUM(total_delta)        FILTER (WHERE total_delta IS NOT NULL AND prev_total_value IS NOT NULL) AS sum_total_delta,
  AVG(total_pct_change)   FILTER (WHERE total_pct_change IS NOT NULL)  AS avg_pct_change,
  COUNT(*) FILTER (WHERE total_delta > 0 AND prev_total_value IS NOT NULL)  AS increased_count,
  COUNT(*) FILTER (WHERE total_delta < 0 AND prev_total_value IS NOT NULL)  AS decreased_count,
  COUNT(*) FILTER (WHERE total_delta = 0 AND prev_total_value IS NOT NULL)  AS unchanged_count,
  MAX(total_pct_change)   FILTER (WHERE total_pct_change IS NOT NULL)  AS max_pct_increase,
  MIN(total_pct_change)   FILTER (WHERE total_pct_change IS NOT NULL)  AS max_pct_decrease,
  SUM(total_value)                                           AS total_roll_value,
  AVG(total_value)                                           AS avg_value
FROM vw_assessment_yoy
GROUP BY tax_year, prev_tax_year, county_id
ORDER BY tax_year DESC, prev_tax_year DESC;

-- ── 3. Top movers (largest absolute dollar changes per year) ──────
CREATE OR REPLACE VIEW vw_assessment_top_movers AS
SELECT
  parcel_id,
  parcel_number,
  address,
  neighborhood_code,
  county_id,
  tax_year,
  prev_tax_year,
  total_value,
  prev_total_value,
  total_delta,
  total_pct_change,
  land_delta,
  improvement_delta,
  ABS(total_delta) AS abs_delta
FROM vw_assessment_yoy
WHERE total_delta IS NOT NULL
  AND prev_total_value IS NOT NULL
  AND prev_total_value > 0
ORDER BY ABS(total_delta) DESC;
