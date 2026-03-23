-- Phase 146: Sales & Assessment Reconciliation Views
-- Cross-reference TerraForge canonical tables with PACS domain tables
-- via parcels.prop_id bridge (established in 20260323100001)

-- ═══════════════════════════════════════════════════════════════════
-- 1. Sales Reconciliation: TF sales ↔ PACS pacs_sales
-- ═══════════════════════════════════════════════════════════════════
-- Matches by parcel + date proximity (±30 days) + price match
CREATE OR REPLACE VIEW vw_sales_reconciliation AS
SELECT
  p.id              AS parcel_id,
  p.parcel_number,
  p.prop_id,

  -- TerraForge side
  s.id              AS tf_sale_id,
  s.sale_date       AS tf_sale_date,
  s.sale_price      AS tf_sale_price,
  s.sale_type       AS tf_sale_type,
  s.is_qualified    AS tf_is_qualified,
  s.grantor         AS tf_grantor,
  s.grantee         AS tf_grantee,

  -- PACS side
  ps.id             AS pacs_sale_id,
  ps.sale_date      AS pacs_sale_date,
  ps.sale_price     AS pacs_sale_price,
  ps.sale_type_cd   AS pacs_sale_type,
  ps.ratio          AS pacs_ratio,
  ps.market_value   AS pacs_market_value,
  ps.hood_cd        AS pacs_hood_cd,

  -- Match analysis
  CASE
    WHEN s.id IS NOT NULL AND ps.id IS NOT NULL THEN 'matched'
    WHEN s.id IS NOT NULL AND ps.id IS NULL     THEN 'tf_only'
    WHEN s.id IS NULL     AND ps.id IS NOT NULL THEN 'pacs_only'
  END AS match_status,

  CASE
    WHEN s.sale_price IS NOT NULL AND ps.sale_price IS NOT NULL
    THEN ABS(s.sale_price - ps.sale_price)
  END AS price_delta,

  CASE
    WHEN s.sale_date IS NOT NULL AND ps.sale_date IS NOT NULL
    THEN ABS(s.sale_date - ps.sale_date)
  END AS date_delta_days

FROM parcels p
LEFT JOIN sales s ON s.parcel_id = p.id
FULL OUTER JOIN pacs_sales ps
  ON ps.prop_id = p.prop_id
  AND (
    -- Match by date proximity (±30 days)
    s.id IS NULL
    OR ps.id IS NULL
    OR ABS(s.sale_date - ps.sale_date) <= 30
  )
WHERE p.prop_id IS NOT NULL
  AND (s.id IS NOT NULL OR ps.id IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════════
-- 2. Sales Reconciliation Summary (aggregate stats)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW vw_sales_reconciliation_summary AS
SELECT
  match_status,
  COUNT(*)                                    AS record_count,
  AVG(price_delta)                            AS avg_price_delta,
  MAX(price_delta)                            AS max_price_delta,
  AVG(date_delta_days)                        AS avg_date_delta_days,
  COUNT(*) FILTER (WHERE price_delta = 0)     AS exact_price_matches,
  COUNT(*) FILTER (WHERE price_delta > 0
    AND price_delta <= 1000)                  AS near_price_matches,
  COUNT(*) FILTER (WHERE price_delta > 1000)  AS price_discrepancies
FROM vw_sales_reconciliation
GROUP BY match_status;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Assessment Reconciliation: TF assessments ↔ PACS assessment_roll
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW vw_assessment_reconciliation AS
SELECT
  p.id              AS parcel_id,
  p.parcel_number,
  p.prop_id,

  -- TerraForge side
  a.id              AS tf_assessment_id,
  a.tax_year        AS tf_tax_year,
  a.land_value      AS tf_land_value,
  a.improvement_value AS tf_improvement_value,
  a.total_value     AS tf_total_value,
  a.certified       AS tf_certified,

  -- PACS side
  ar.id             AS pacs_roll_id,
  ar.roll_year      AS pacs_roll_year,
  (ar.land_hstd_val + ar.land_non_hstd_val)   AS pacs_land_value,
  (ar.imprv_hstd_val + ar.imprv_non_hstd_val) AS pacs_improvement_value,
  (ar.appraised_classified + ar.appraised_non_classified) AS pacs_total_appraised,
  (ar.taxable_classified + ar.taxable_non_classified)     AS pacs_total_taxable,
  ar.situs_display   AS pacs_situs,
  ar.property_use_cd AS pacs_use_code,
  ar.tax_area_desc   AS pacs_tax_area,

  -- Match analysis
  CASE
    WHEN a.id IS NOT NULL AND ar.id IS NOT NULL THEN 'matched'
    WHEN a.id IS NOT NULL AND ar.id IS NULL     THEN 'tf_only'
    WHEN a.id IS NULL     AND ar.id IS NOT NULL THEN 'pacs_only'
  END AS match_status,

  CASE
    WHEN a.total_value IS NOT NULL
     AND (ar.appraised_classified + ar.appraised_non_classified) IS NOT NULL
    THEN a.total_value - (ar.appraised_classified + ar.appraised_non_classified)
  END AS total_value_delta,

  CASE
    WHEN a.land_value IS NOT NULL
     AND (ar.land_hstd_val + ar.land_non_hstd_val) IS NOT NULL
    THEN a.land_value - (ar.land_hstd_val + ar.land_non_hstd_val)
  END AS land_value_delta,

  CASE
    WHEN a.improvement_value IS NOT NULL
     AND (ar.imprv_hstd_val + ar.imprv_non_hstd_val) IS NOT NULL
    THEN a.improvement_value - (ar.imprv_hstd_val + ar.imprv_non_hstd_val)
  END AS improvement_value_delta

FROM parcels p
LEFT JOIN assessments a ON a.parcel_id = p.id
FULL OUTER JOIN pacs_assessment_roll ar
  ON ar.prop_id = p.prop_id
  AND (a.tax_year IS NULL OR ar.roll_year IS NULL OR a.tax_year = ar.roll_year)
WHERE p.prop_id IS NOT NULL
  AND (a.id IS NOT NULL OR ar.id IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════════
-- 4. Assessment Reconciliation Summary
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW vw_assessment_reconciliation_summary AS
SELECT
  match_status,
  COUNT(*)                                           AS record_count,
  AVG(ABS(total_value_delta))                        AS avg_total_delta,
  MAX(ABS(total_value_delta))                        AS max_total_delta,
  AVG(ABS(land_value_delta))                         AS avg_land_delta,
  AVG(ABS(improvement_value_delta))                  AS avg_improvement_delta,
  COUNT(*) FILTER (WHERE total_value_delta = 0)      AS exact_value_matches,
  COUNT(*) FILTER (WHERE ABS(total_value_delta) > 0
    AND ABS(total_value_delta) <= 5000)              AS near_value_matches,
  COUNT(*) FILTER (WHERE ABS(total_value_delta) > 5000) AS value_discrepancies
FROM vw_assessment_reconciliation
GROUP BY match_status;
