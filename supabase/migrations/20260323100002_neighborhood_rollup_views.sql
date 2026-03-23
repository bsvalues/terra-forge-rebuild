-- Phase 142: Neighborhood Rollup Views
-- Aggregate PACS domain data by neighborhood for analysis dashboards.

-- ── 1. Neighborhood Land Summary ───────────────────────────────────
CREATE OR REPLACE VIEW vw_neighborhood_land_summary AS
SELECT
  s.hood_cd,
  COUNT(DISTINCT ld.prop_id) AS parcel_count,
  SUM(ld.land_acres)         AS total_acres,
  SUM(ld.land_sqft)          AS total_sqft,
  SUM(ld.land_val)           AS total_land_val,
  AVG(ld.land_val)           AS avg_land_val,
  SUM(ld.ag_val)             AS total_ag_val,
  COUNT(DISTINCT ld.land_type_cd) AS land_type_count
FROM pacs_land_details ld
JOIN pacs_sales s ON ld.prop_id = s.prop_id AND s.hood_cd IS NOT NULL
GROUP BY s.hood_cd;

-- ── 2. Neighborhood Improvement Summary ────────────────────────────
CREATE OR REPLACE VIEW vw_neighborhood_improvement_summary AS
SELECT
  s.hood_cd,
  COUNT(DISTINCT i.prop_id)   AS improved_parcel_count,
  COUNT(i.id)                 AS total_improvements,
  SUM(i.imprv_val)            AS total_imprv_val,
  AVG(i.imprv_val)            AS avg_imprv_val,
  AVG(id2.living_area)        AS avg_living_area,
  AVG(id2.actual_year_built)  AS avg_year_built,
  COUNT(DISTINCT i.imprv_type_cd) AS imprv_type_count
FROM pacs_improvements i
JOIN pacs_sales s ON i.prop_id = s.prop_id AND s.hood_cd IS NOT NULL
LEFT JOIN pacs_improvement_details id2 ON i.prop_id = id2.prop_id AND i.imprv_id = id2.imprv_id
GROUP BY s.hood_cd;

-- ── 3. Neighborhood Sales Summary ──────────────────────────────────
CREATE OR REPLACE VIEW vw_neighborhood_sales_summary AS
SELECT
  hood_cd,
  COUNT(*)                                                AS sale_count,
  AVG(sale_price)                                         AS avg_sale_price,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sale_price) AS median_sale_price,
  MIN(sale_date)                                          AS earliest_sale,
  MAX(sale_date)                                          AS latest_sale,
  AVG(ratio)                                              AS avg_ratio,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ratio)     AS median_ratio,
  COUNT(*) FILTER (WHERE ratio BETWEEN 0.90 AND 1.10)    AS iaao_band_count,
  ROUND(
    COUNT(*) FILTER (WHERE ratio BETWEEN 0.90 AND 1.10)::NUMERIC
    / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 1
  )                                                       AS iaao_band_pct
FROM pacs_sales
WHERE hood_cd IS NOT NULL AND sale_price > 0
GROUP BY hood_cd;

-- ── 4. Neighborhood Assessment Summary ─────────────────────────────
CREATE OR REPLACE VIEW vw_neighborhood_assessment_summary AS
SELECT
  s.hood_cd,
  ar.roll_year,
  COUNT(DISTINCT ar.prop_id) AS parcel_count,
  SUM(ar.appraised_classified + ar.appraised_non_classified) AS total_appraised,
  AVG(ar.appraised_classified + ar.appraised_non_classified) AS avg_appraised,
  SUM(ar.taxable_classified + ar.taxable_non_classified)     AS total_taxable,
  SUM(ar.imprv_hstd_val + ar.imprv_non_hstd_val)           AS total_imprv_val,
  SUM(ar.land_hstd_val + ar.land_non_hstd_val)             AS total_land_val,
  COUNT(DISTINCT ar.tax_area_id)                             AS tax_area_count
FROM pacs_assessment_roll ar
JOIN pacs_sales s ON ar.prop_id = s.prop_id AND s.hood_cd IS NOT NULL
GROUP BY s.hood_cd, ar.roll_year;

-- ── 5. RPC: Get neighborhood rollup for a single hood ──────────────
CREATE OR REPLACE FUNCTION get_neighborhood_rollup(p_hood_cd TEXT)
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'hood_cd', p_hood_cd,
    'land', (SELECT row_to_json(l) FROM vw_neighborhood_land_summary l WHERE l.hood_cd = p_hood_cd),
    'improvements', (SELECT row_to_json(i) FROM vw_neighborhood_improvement_summary i WHERE i.hood_cd = p_hood_cd),
    'sales', (SELECT row_to_json(s) FROM vw_neighborhood_sales_summary s WHERE s.hood_cd = p_hood_cd)
  );
$$;
