-- Phase 151: Exemption Analysis
-- Joins exemptions → parcels to produce IAAO/county-standard exemption analytics.
-- Three views: county summary, by-type breakdown, parcel detail.

-- ── 1. County Summary by Year ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_exemption_county_summary AS
WITH base AS (
  SELECT
    e.tax_year,
    p.county_id,
    e.exemption_type,
    e.exemption_amount,
    e.exemption_percentage,
    e.status,
    p.assessed_value,
    p.id AS parcel_id
  FROM exemptions e
  JOIN parcels p ON p.id = e.parcel_id
),
yearly AS (
  SELECT
    tax_year,
    county_id,
    COUNT(*)                                                    AS total_count,
    COUNT(*) FILTER (WHERE status = 'approved')                 AS approved_count,
    COUNT(*) FILTER (WHERE status = 'pending')                  AS pending_count,
    COUNT(*) FILTER (WHERE status = 'denied')                   AS denied_count,
    COUNT(DISTINCT parcel_id)                                   AS parcel_count,
    COALESCE(SUM(exemption_amount) FILTER (WHERE status = 'approved'), 0)    AS total_exemption_value,
    AVG(exemption_amount) FILTER (WHERE status = 'approved')   AS avg_exemption_amount,
    AVG(exemption_percentage) FILTER (WHERE status = 'approved') AS avg_exemption_pct,
    COUNT(DISTINCT exemption_type)                              AS distinct_types,
    SUM(assessed_value)                                         AS total_assessed_roll
  FROM base
  GROUP BY tax_year, county_id
)
SELECT
  *,
  CASE
    WHEN total_assessed_roll > 0
    THEN ROUND((total_exemption_value / total_assessed_roll * 100)::numeric, 2)
    ELSE NULL
  END AS pct_of_assessed_roll
FROM yearly
ORDER BY tax_year DESC, county_id;

-- ── 2. By Exemption Type and Year ────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_exemption_by_type AS
SELECT
  e.tax_year,
  p.county_id,
  e.exemption_type,
  COUNT(*)                                                        AS total_count,
  COUNT(*) FILTER (WHERE e.status = 'approved')                   AS approved_count,
  COUNT(*) FILTER (WHERE e.status = 'pending')                    AS pending_count,
  COUNT(*) FILTER (WHERE e.status = 'denied')                     AS denied_count,
  COUNT(DISTINCT e.parcel_id)                                     AS parcel_count,
  COALESCE(SUM(e.exemption_amount) FILTER (WHERE e.status = 'approved'), 0)      AS total_exemption_value,
  AVG(e.exemption_amount) FILTER (WHERE e.status = 'approved')   AS avg_exemption_amount,
  MIN(e.exemption_amount) FILTER (WHERE e.status = 'approved')   AS min_exemption_amount,
  MAX(e.exemption_amount) FILTER (WHERE e.status = 'approved')   AS max_exemption_amount,
  AVG(e.exemption_percentage) FILTER (WHERE e.status = 'approved') AS avg_exemption_pct,
  COALESCE(SUM(p.assessed_value), 0)                              AS total_assessed_in_type
FROM exemptions e
JOIN parcels p ON p.id = e.parcel_id
GROUP BY e.tax_year, p.county_id, e.exemption_type
ORDER BY e.tax_year DESC, total_exemption_value DESC;

-- ── 3. Parcel-Level Detail ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_exemption_detail AS
SELECT
  e.id                    AS exemption_id,
  e.parcel_id,
  p.parcel_number,
  p.address,
  p.neighborhood_code,
  p.county_id,
  p.assessed_value,
  p.property_class,
  e.exemption_type,
  e.exemption_amount,
  e.exemption_percentage,
  e.status,
  e.tax_year,
  e.application_date,
  e.approval_date,
  e.expiration_date,
  e.applicant_name,
  e.notes,
  CASE
    WHEN e.exemption_amount IS NOT NULL AND p.assessed_value > 0
    THEN ROUND((e.exemption_amount / p.assessed_value * 100)::numeric, 2)
    ELSE e.exemption_percentage
  END AS computed_pct_of_assessed
FROM exemptions e
JOIN parcels p ON p.id = e.parcel_id
ORDER BY e.tax_year DESC, e.exemption_amount DESC NULLS LAST;
