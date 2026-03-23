-- PACS Land Details Table — Land segments with schedules and ag values
-- Source: Legacy land and ag schedules patterns (Benton County PACS)

CREATE TABLE IF NOT EXISTS pacs_land_details (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid REFERENCES counties(id) NOT NULL,
  prop_id integer NOT NULL,
  prop_val_yr integer NOT NULL,
  sup_num integer DEFAULT 0,
  land_seg_id integer,
  land_type_cd text,
  land_class_code text,
  land_soil_code text,
  land_acres numeric(12,4),
  land_sqft numeric(14,2),
  land_adj_factor numeric(8,4),
  num_lots integer DEFAULT 1,
  land_unit_price numeric(14,2),
  land_val numeric(14,2),
  ag_val numeric(14,2),
  ag_use_val numeric(14,2),
  market_schedule text,
  ag_schedule text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(county_id, prop_id, prop_val_yr, sup_num, land_seg_id)
);

ALTER TABLE pacs_land_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "County isolation" ON pacs_land_details
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_pacs_land_prop ON pacs_land_details(county_id, prop_id);
