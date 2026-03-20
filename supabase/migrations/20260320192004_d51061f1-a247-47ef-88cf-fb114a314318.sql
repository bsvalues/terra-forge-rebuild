-- Seed income property data for SLCO commercial parcels
-- net_operating_income is a generated column, so we omit it
INSERT INTO public.income_properties (county_id, parcel_id, gross_rental_income, vacancy_rate, operating_expenses, cap_rate, grm, property_type, income_year, created_by)
SELECT 
  '00000000-0000-0000-0000-000000000002',
  p.id,
  CASE 
    WHEN p.property_class ILIKE '%Office%' THEN round(((18 + random() * 12) * COALESCE(p.building_area, 2000))::numeric, 0)
    WHEN p.property_class ILIKE '%Retail%' THEN round(((15 + random() * 10) * COALESCE(p.building_area, 1500))::numeric, 0)
    WHEN p.property_class ILIKE '%Apartment%' OR p.property_class ILIKE '%Condo%' THEN round(((12 + random() * 8) * COALESCE(p.building_area, 1200))::numeric, 0)
    WHEN p.property_class ILIKE '%Industrial%' THEN round(((8 + random() * 6) * COALESCE(p.building_area, 3000))::numeric, 0)
    ELSE round(((14 + random() * 8) * COALESCE(p.building_area, 1800))::numeric, 0)
  END,
  round((0.03 + random() * 0.09)::numeric, 3),
  CASE 
    WHEN p.property_class ILIKE '%Office%' THEN round(((18 + random() * 12) * COALESCE(p.building_area, 2000) * (0.38 + random() * 0.12))::numeric, 0)
    WHEN p.property_class ILIKE '%Retail%' THEN round(((15 + random() * 10) * COALESCE(p.building_area, 1500) * (0.35 + random() * 0.10))::numeric, 0)
    WHEN p.property_class ILIKE '%Apartment%' OR p.property_class ILIKE '%Condo%' THEN round(((12 + random() * 8) * COALESCE(p.building_area, 1200) * (0.40 + random() * 0.12))::numeric, 0)
    WHEN p.property_class ILIKE '%Industrial%' THEN round(((8 + random() * 6) * COALESCE(p.building_area, 3000) * (0.30 + random() * 0.08))::numeric, 0)
    ELSE round(((14 + random() * 8) * COALESCE(p.building_area, 1800) * (0.37 + random() * 0.10))::numeric, 0)
  END,
  round((0.055 + random() * 0.04)::numeric, 4),
  round((8 + random() * 6)::numeric, 2),
  CASE 
    WHEN p.property_class ILIKE '%Office%' THEN 'Office'
    WHEN p.property_class ILIKE '%Retail%' THEN 'Retail'
    WHEN p.property_class ILIKE '%Apartment%' OR p.property_class ILIKE '%Condo%' THEN 'Multifamily'
    WHEN p.property_class ILIKE '%Industrial%' THEN 'Industrial'
    ELSE 'Commercial'
  END,
  2026,
  'e07ff573-e75c-4f27-9096-bbee589db304'
FROM public.parcels p
WHERE p.county_id = '00000000-0000-0000-0000-000000000002'
  AND (p.property_class ILIKE '%Commercial%' OR p.property_class ILIKE '%Industrial%')
LIMIT 150
ON CONFLICT DO NOTHING;