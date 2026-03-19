INSERT INTO public.counties (id, name, state, fips_code, config)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Salt Lake County',
  'UT',
  '49035',
  '{"timezone": "America/Denver", "assessment_cycle": "annual"}'::jsonb
) ON CONFLICT (id) DO NOTHING;