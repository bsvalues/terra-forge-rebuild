-- PACS Owners Table — Property ownership from dbo.owner + dbo.account
-- Source: Legacy ownership.sql patterns (Benton County PACS)

CREATE TABLE IF NOT EXISTS pacs_owners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid REFERENCES counties(id) NOT NULL,
  prop_id integer NOT NULL,
  owner_id integer NOT NULL,
  owner_name text,
  pct_ownership numeric(5,2),
  owner_tax_yr integer,
  sup_num integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(county_id, prop_id, owner_id, owner_tax_yr, sup_num)
);

ALTER TABLE pacs_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "County isolation" ON pacs_owners
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_pacs_owners_prop ON pacs_owners(county_id, prop_id);
CREATE INDEX idx_pacs_owners_name ON pacs_owners(county_id, owner_name);
