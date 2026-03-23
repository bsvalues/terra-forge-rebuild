-- PACS Sales Table — Qualified arm's-length sales with IAAO ratio
-- Source: Legacy Sales Ratio + Land Sales patterns (Benton County PACS)

CREATE TABLE IF NOT EXISTS pacs_sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid REFERENCES counties(id) NOT NULL,
  chg_of_owner_id integer,
  prop_id integer NOT NULL,
  geo_id text,
  sale_price numeric(14,2),
  sale_date date,
  sale_type_cd text,
  ratio_cd text,
  ratio_type_cd text,
  market_value numeric(14,2),
  hood_cd text,
  ratio numeric(8,4),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(county_id, chg_of_owner_id, prop_id)
);

ALTER TABLE pacs_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "County isolation" ON pacs_sales
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_pacs_sales_prop ON pacs_sales(county_id, prop_id);
CREATE INDEX idx_pacs_sales_date ON pacs_sales(county_id, sale_date);
CREATE INDEX idx_pacs_sales_hood ON pacs_sales(county_id, hood_cd);
