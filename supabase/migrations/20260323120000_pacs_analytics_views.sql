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
  SUM(sl_price),
  AVG(sl_price)
FROM pacs_sales
UNION ALL
SELECT
  'pacs_land_details',
  COUNT(*),
  COUNT(DISTINCT prop_id),
  SUM(land_seg_mkt_val),
  AVG(land_seg_mkt_val)
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
  SUM(appraised_val),
  AVG(appraised_val)
FROM pacs_assessment_roll
UNION ALL
SELECT
  'pacs_property_profiles',
  COUNT(*),
  COUNT(DISTINCT prop_id),
  SUM(appraised_val),
  AVG(appraised_val)
FROM pacs_property_profiles;

-- ── 2. Value distribution by neighborhood ─────────────────────────
CREATE OR REPLACE VIEW vw_pacs_value_by_neighborhood AS
SELECT
  ar.hood_cd                       AS neighborhood,
  COUNT(DISTINCT ar.prop_id)       AS property_count,
  SUM(ar.appraised_val)            AS total_appraised,
  AVG(ar.appraised_val)            AS avg_appraised,
  MIN(ar.appraised_val)            AS min_appraised,
  MAX(ar.appraised_val)            AS max_appraised,
  SUM(ar.taxable_val)              AS total_taxable,
  COUNT(DISTINCT ar.use_cd)        AS use_code_count
FROM pacs_assessment_roll ar
WHERE ar.hood_cd IS NOT NULL
GROUP BY ar.hood_cd
ORDER BY total_appraised DESC;

-- ── 3. Sales activity by year ─────────────────────────────────────
CREATE OR REPLACE VIEW vw_pacs_sales_by_year AS
SELECT
  EXTRACT(YEAR FROM sl_dt)::integer AS sale_year,
  COUNT(*)                          AS sale_count,
  SUM(sl_price)                     AS total_volume,
  AVG(sl_price)                     AS avg_price,
  MAX(sl_price)                     AS max_price,
  COUNT(CASE WHEN sl_price > 0 THEN 1 END) AS valid_price_count,
  AVG(CASE WHEN sl_ratio IS NOT NULL THEN sl_ratio END) AS avg_ratio
FROM pacs_sales
WHERE sl_dt IS NOT NULL
GROUP BY EXTRACT(YEAR FROM sl_dt)
ORDER BY sale_year DESC;

-- ── 4. PACS bridge coverage stats ─────────────────────────────────
CREATE OR REPLACE VIEW vw_pacs_bridge_coverage AS
SELECT
  (SELECT COUNT(*) FROM parcels)                         AS total_parcels,
  (SELECT COUNT(*) FROM parcels WHERE prop_id IS NOT NULL) AS linked_parcels,
  (SELECT COUNT(DISTINCT prop_id) FROM pacs_owners)      AS pacs_owner_props,
  (SELECT COUNT(DISTINCT prop_id) FROM pacs_assessment_roll) AS pacs_assessed_props,
  (SELECT COUNT(DISTINCT prop_id) FROM pacs_sales)       AS pacs_sales_props,
  (SELECT COUNT(DISTINCT prop_id) FROM pacs_property_profiles) AS pacs_profile_props,
  ROUND(
    (SELECT COUNT(*) FROM parcels WHERE prop_id IS NOT NULL)::numeric /
    NULLIF((SELECT COUNT(*) FROM parcels), 0) * 100, 1
  )                                                       AS link_coverage_pct;
