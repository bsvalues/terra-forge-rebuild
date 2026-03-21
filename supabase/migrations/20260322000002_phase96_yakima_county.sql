-- Phase 96: Multi-County Expansion — Yakima County Bootstrap
-- Validates RLS isolation with a second county tenant

-- Insert Yakima County WA (FIPS 53077) as validation tenant
INSERT INTO public.counties (name, state, fips_code)
VALUES ('Yakima County', 'WA', '53077')
ON CONFLICT (fips_code) DO NOTHING;

-- Create a default study period for Yakima
INSERT INTO public.study_periods (county_id, name, status, start_date, end_date)
SELECT
  c.id,
  '2025 Annual Revaluation',
  'active',
  '2025-01-01'::date,
  '2025-12-31'::date
FROM public.counties c
WHERE c.fips_code = '53077'
ON CONFLICT DO NOTHING;
