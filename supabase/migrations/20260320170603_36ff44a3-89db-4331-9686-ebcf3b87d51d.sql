INSERT INTO assessment_ratios (parcel_id, sale_id, study_period_id, assessed_value, sale_price, is_outlier, value_tier)
SELECT 
  s.parcel_id,
  s.id as sale_id,
  'a0000000-0000-0000-0000-000000000001' as study_period_id,
  a.total_value as assessed_value,
  s.sale_price,
  CASE 
    WHEN (a.total_value::numeric / NULLIF(s.sale_price, 0)) < 0.5 OR (a.total_value::numeric / NULLIF(s.sale_price, 0)) > 2.0 THEN true
    ELSE false
  END as is_outlier,
  CASE
    WHEN s.sale_price < 200000 THEN 'low'
    WHEN s.sale_price < 500000 THEN 'medium'
    ELSE 'high'
  END as value_tier
FROM sales s
JOIN assessments a ON s.parcel_id = a.parcel_id
WHERE s.county_id = '00000000-0000-0000-0000-000000000002'
  AND s.sale_price > 0
  AND a.total_value > 0
ON CONFLICT DO NOTHING;