-- Phase 148: PACS Analytics Views — county-level aggregate statistics
-- Provides at-a-glance PACS health metrics, value distributions, and ownership stats.

-- ── 1. Property count & value totals by table ─────────────────────
CREATE OR REPLACE VIEW vw_pacs_table_stats AS
SELECT
  'pacs_owners'              AS table_name,
  COUNT(*)                   AS row_count,
  COUNT(DISTINCT prop_id)    AS unique_props,
  NULL::numeric              AS total_value,
  NULL::numeric              AS avg_value
FROM pacs_owners
UNION ALL
SELECT
  'pacs_sales',
  COUNT(*),
  COUNT(DISTINCT prop_id),
  SUM(sale_price),
  AVG(sale_price)
FROM pacs_sales
UNION ALL
SELECT
  'pacs_land_details',
  COUNT(*),
  COUNT(DISTINCT prop_id),
  SUM(land_val),
  AVG(land_val)
FROM pacs_land_details
UNION ALL
SELECT
  'pacs_improvements',
  COUNT(*),
  COUNT(DISTINCT prop_id),
  SUM(imprv_val),
  AVG(imprv_val)
FROM pacs_improvements
UNION ALL
SELECT
  'pacs_improvement_details',
  COUNT(*),
  COUNT(DISTINCT prop_id),
  NULL::numeric,
  NULL::numeric
FROM pacs_improvement_details
UNION ALL
SELECT
  'pacs_assessment_roll',
  COUNT(*),
  COUNT(DISTINCT prop_id),
  SUM(COALESCE(appraised_classified,0) + COALESCE(appraised_non_classified,0)),
  AVG(COALESCE(appraised_classified,0) + COALESCE(appraised_non_classified,0))
FROM pacs_assessment_roll;

-- ── 2. Value distribution by neighborhood ─────────────────────────
CREATE OR REPLACE VIEW vw_pacs_value_by_neighborhood AS
SELECT
  s.hood_cd                        AS neighborhood,
  COUNT(DISTINCT ar.prop_id)       AS property_count,
  SUM(COALESCE(ar.appraised_classified,0) + COALESCE(ar.appraised_non_classified,0)) AS total_appraised,
  AVG(COALESCE(ar.appraised_classified,0) + COALESCE(ar.appraised_non_classified,0)) AS avg_appraised,
  MIN(COALESCE(ar.appraised_classified,0) + COALESCE(ar.appraised_non_classified,0)) AS min_appraised,
  MAX(COALESCE(ar.appraised_classified,0) + COALESCE(ar.appraised_non_classified,0)) AS max_appraised,
  SUM(COALESCE(ar.taxable_classified,0) + COALESCE(ar.taxable_non_classified,0)) AS total_taxable,
  COUNT(DISTINCT ar.property_use_cd) AS use_code_count
FROM pacs_assessment_roll ar
JOIN pacs_sales s ON s.prop_id = ar.prop_id
WHERE s.hood_cd IS NOT NULL
GROUP BY s.hood_cd
ORDER BY total_appraised DESC;

-- ── 3. Sales activity by year ─────────────────────────────────────
CREATE OR REPLACE VIEW vw_pacs_sales_by_year AS
SELECT
  EXTRACT(YEAR FROM sale_date::date)::integer AS sale_year,
  COUNT(*)                                    AS sale_count,
  SUM(sale_price)                             AS total_volume,
  AVG(sale_price)                             AS avg_price,
  MAX(sale_price)                             AS max_price,
  COUNT(CASE WHEN sale_price > 0 THEN 1 END)  AS valid_price_count,
  AVG(CASE WHEN ratio IS NOT NULL THEN ratio END) AS avg_ratio
FROM pacs_sales
WHERE sale_date IS NOT NULL
GROUP BY EXTRACT(YEAR FROM sale_date::date)
ORDER BY sale_year DESC;

-- ── 4. PACS bridge coverage stats ─────────────────────────────────
CREATE OR REPLACE VIEW vw_pacs_bridge_coverage AS
SELECT
  (SELECT COUNT(*) FROM parcels)                              AS total_parcels,
  (SELECT COUNT(*) FROM parcels WHERE prop_id IS NOT NULL)    AS linked_parcels,
  (SELECT COUNT(DISTINCT prop_id) FROM pacs_owners)           AS pacs_owner_props,
  (SELECT COUNT(DISTINCT prop_id) FROM pacs_assessment_roll)  AS pacs_assessed_props,
  (SELECT COUNT(DISTINCT prop_id) FROM pacs_sales)            AS pacs_sales_props,
  ROUND(
    (SELECT COUNT(*) FROM parcels WHERE prop_id IS NOT NULL)::numeric /
    NULLIF((SELECT COUNT(*) FROM parcels), 0) * 100, 1
  )                                                           AS link_coverage_pct;
