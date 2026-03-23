-- PACS Improvements Table — Improvement headers with value and depreciation
-- Source: Legacy res_condensed.sql patterns (Benton County PACS)

CREATE TABLE IF NOT EXISTS pacs_improvements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid REFERENCES counties(id) NOT NULL,
  prop_id integer NOT NULL,
  prop_val_yr integer NOT NULL,
  sup_num integer DEFAULT 0,
  imprv_id integer NOT NULL,
  imprv_type_cd text,
  imprv_desc text,
  imprv_val numeric(14,2),
  flat_val numeric(14,2),
  imprv_val_source text,
  economic_pct numeric(5,2),
  physical_pct numeric(5,2),
  functional_pct numeric(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(county_id, prop_id, prop_val_yr, sup_num, imprv_id)
);

ALTER TABLE pacs_improvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "County isolation" ON pacs_improvements
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_pacs_imprv_prop ON pacs_improvements(county_id, prop_id);

-- PACS Improvement Details Table — Beds, baths, living area, condition
-- Source: Legacy Res_withPopulation.sql patterns (Benton County PACS)

CREATE TABLE IF NOT EXISTS pacs_improvement_details (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid REFERENCES counties(id) NOT NULL,
  prop_id integer NOT NULL,
  prop_val_yr integer NOT NULL,
  sup_num integer DEFAULT 0,
  imprv_id integer NOT NULL,
  imprv_det_id integer NOT NULL,
  imprv_det_type_cd text,
  imprv_det_class_cd text,
  imprv_det_area numeric(12,2),
  imprv_det_val numeric(14,2),
  actual_year_built integer,
  yr_remodel integer,
  condition_cd text,
  quality_cd text,
  living_area numeric(12,2),
  num_bedrooms integer,
  total_bath numeric(4,1),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(county_id, prop_id, prop_val_yr, sup_num, imprv_id, imprv_det_id)
);

ALTER TABLE pacs_improvement_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "County isolation" ON pacs_improvement_details
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_pacs_imprv_det_prop ON pacs_improvement_details(county_id, prop_id);
