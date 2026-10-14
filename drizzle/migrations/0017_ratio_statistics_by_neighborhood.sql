-- One pass per county: IAAO ratio statistics for every neighborhood with 3+ ratios after IQR trimming.
CREATE OR REPLACE FUNCTION public.ratio_statistics_by_neighborhood(p_county_id uuid, p_tax_year integer, p_sales_start_date date, p_sales_end_date date)
RETURNS TABLE(neighborhood_code text, sample_size integer, median_ratio numeric, mean_ratio numeric, cod numeric, prd numeric, prb numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH base AS (
    SELECT p.neighborhood_code AS hood,
           (COALESCE(a.total_value, p.assessed_value) / s.sale_price)::float8 AS r,
           s.sale_price::float8 AS v
    FROM sales s
    JOIN parcels p ON p.id = s.parcel_id AND p.county_id = p_county_id
    LEFT JOIN assessments a ON a.parcel_id = s.parcel_id AND a.tax_year = p_tax_year
    WHERE s.county_id = p_county_id
      AND s.sale_date BETWEEN p_sales_start_date AND p_sales_end_date
      AND s.is_qualified = true AND s.sale_price > 0
      AND COALESCE(a.total_value, p.assessed_value) > 0
      AND p.neighborhood_code IS NOT NULL AND p.neighborhood_code <> ''
  ), q AS (
    SELECT hood, percentile_cont(0.25) WITHIN GROUP (ORDER BY r) q1, percentile_cont(0.75) WITHIN GROUP (ORDER BY r) q3
    FROM base GROUP BY hood HAVING count(*) >= 3
  ), f AS (
    SELECT b.* FROM base b JOIN q USING (hood)
    WHERE b.r BETWEEN q.q1 - 1.5 * (q.q3 - q.q1) AND q.q3 + 1.5 * (q.q3 - q.q1)
  ), m AS (
    SELECT hood, count(*) n, percentile_cont(0.5) WITHIN GROUP (ORDER BY r) med, avg(r) mean, sum(r * v) / sum(v) wmean
    FROM f GROUP BY hood HAVING count(*) >= 3
  )
  SELECT m.hood, m.n::integer,
         round(m.med::numeric, 4), round(m.mean::numeric, 4),
         round((avg(abs(f.r - m.med)) / m.med * 100)::numeric, 2),
         round((m.mean / m.wmean)::numeric, 4),
         round(regr_slope((f.r - m.med) / m.med, ln(0.5 * (f.r * f.v / m.med) + 0.5 * f.v) / ln(2))::numeric, 4)
  FROM m JOIN f USING (hood)
  GROUP BY m.hood, m.n, m.med, m.mean, m.wmean
  ORDER BY m.hood;
$$;
GRANT EXECUTE ON FUNCTION public.ratio_statistics_by_neighborhood(uuid, integer, date, date) TO authenticated;