-- Seed SLCO cost schedules with created_by = system user
INSERT INTO public.cost_schedules (county_id, property_class, quality_grade, base_cost_per_sqft, effective_year, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'Residential', 'Economy',   85.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Residential', 'Average',  135.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Residential', 'Good',     185.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Residential', 'Excellent', 265.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial', 'Economy',   95.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial', 'Average',  155.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial', 'Good',     215.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial', 'Excellent', 295.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Apartment & Condo', 'Economy',   90.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Apartment & Condo', 'Average',  140.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Apartment & Condo', 'Good',     195.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Apartment & Condo', 'Excellent', 270.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Office Space', 'Economy',  105.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Office Space', 'Average', 170.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Office Space', 'Good',    240.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Office Space', 'Excellent', 320.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Retail', 'Economy',   90.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Retail', 'Average',  145.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Retail', 'Good',     200.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Retail', 'Excellent', 280.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Industrial', 'Economy',   65.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Industrial', 'Average',  105.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Industrial', 'Good',     150.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Industrial', 'Excellent', 210.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Industrial', 'Economy',   70.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Industrial', 'Average',  115.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Industrial', 'Good',     160.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304'),
  ('00000000-0000-0000-0000-000000000002', 'Commercial - Industrial', 'Excellent', 225.00, 2026, 'e07ff573-e75c-4f27-9096-bbee589db304');

-- Seed depreciation curves for each new schedule
DO $$
DECLARE
  sched RECORD;
BEGIN
  FOR sched IN SELECT id FROM public.cost_schedules WHERE county_id = '00000000-0000-0000-0000-000000000002' AND effective_year = 2026
  LOOP
    INSERT INTO public.cost_depreciation (schedule_id, age_from, age_to, depreciation_pct, condition_modifier)
    VALUES
      (sched.id, 0,  5,   5.0, 1.0),
      (sched.id, 6,  10, 12.0, 1.0),
      (sched.id, 11, 15, 20.0, 1.0),
      (sched.id, 16, 20, 27.0, 1.0),
      (sched.id, 21, 25, 33.0, 1.0),
      (sched.id, 26, 30, 38.0, 1.0),
      (sched.id, 31, 40, 45.0, 1.0),
      (sched.id, 41, 50, 55.0, 1.0),
      (sched.id, 51, 60, 63.0, 1.0),
      (sched.id, 61, 75, 70.0, 1.0),
      (sched.id, 76, 100, 78.0, 1.0),
      (sched.id, 101, 200, 85.0, 1.0)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;