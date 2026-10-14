-- Same columns and matching rule (closest assessment within 2 years, later year on ties),
-- rewritten as a LATERAL lookup so it uses idx_assessments_parcel_year instead of hashing
-- every assessment; county summaries now finish within the API statement timeout.
CREATE OR REPLACE VIEW public.vw_sales_ratio_detail WITH (security_invoker = on) AS
SELECT
  s.id AS sale_id, s.parcel_id, p.parcel_number, p.address, p.neighborhood_code, s.county_id,
  s.sale_date, EXTRACT(YEAR FROM s.sale_date)::integer AS sale_year, s.sale_price, s.deed_type, s.is_qualified,
  a.id AS assessment_id, a.tax_year, a.total_value AS assessed_value, a.land_value, a.improvement_value, a.certified,
  CASE WHEN s.sale_price > 0 THEN ROUND(a.total_value::numeric / s.sale_price, 4) END AS ratio,
  (a.total_value - s.sale_price) AS value_delta,
  CASE WHEN s.sale_price > 0 THEN ROUND((a.total_value - s.sale_price)::numeric / s.sale_price * 100, 2) END AS pct_over_under
FROM public.sales s
JOIN public.parcels p ON p.id = s.parcel_id
JOIN LATERAL (
  SELECT a2.* FROM public.assessments a2
  WHERE a2.parcel_id = s.parcel_id
    AND a2.tax_year BETWEEN EXTRACT(YEAR FROM s.sale_date)::integer - 2 AND EXTRACT(YEAR FROM s.sale_date)::integer + 2
  ORDER BY ABS(a2.tax_year - EXTRACT(YEAR FROM s.sale_date)::integer), a2.tax_year DESC
  LIMIT 1
) a ON true
WHERE s.sale_price > 0 AND a.total_value > 0;
CREATE INDEX IF NOT EXISTS idx_sales_county_price ON public.sales (county_id) WHERE sale_price > 0;