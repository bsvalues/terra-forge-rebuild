-- PACS Assessment Roll Table — DOR-style compliance reporting snapshot
-- Source: Legacy Real_Prop_Monitor stored procedure patterns (Benton County PACS)

CREATE TABLE IF NOT EXISTS pacs_assessment_roll (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid REFERENCES counties(id) NOT NULL,
  prop_id integer NOT NULL,
  geo_id text,
  owner_id integer,
  owner_name text,
  imprv_hstd_val numeric(14,2),
  imprv_non_hstd_val numeric(14,2),
  land_hstd_val numeric(14,2),
  land_non_hstd_val numeric(14,2),
  timber_market numeric(14,2),
  ag_market numeric(14,2),
  appraised_classified numeric(14,2),
  appraised_non_classified numeric(14,2),
  taxable_classified numeric(14,2),
  taxable_non_classified numeric(14,2),
  tax_area_id integer,
  tax_area_desc text,
  situs_display text,
  property_use_cd text,
  state_cd text,
  roll_year integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(county_id, prop_id, roll_year)
);

ALTER TABLE pacs_assessment_roll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "County isolation" ON pacs_assessment_roll
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_pacs_roll_prop ON pacs_assessment_roll(county_id, prop_id);
CREATE INDEX idx_pacs_roll_tax_area ON pacs_assessment_roll(county_id, tax_area_id);
CREATE INDEX idx_pacs_roll_year ON pacs_assessment_roll(county_id, roll_year);
