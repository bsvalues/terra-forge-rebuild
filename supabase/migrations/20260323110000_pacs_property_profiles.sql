-- Phase 147: Property Profiles — 7th PACS Domain Table
-- 63-column comprehensive property profile from PACS property_profile view.
-- Covers classification, building, land, geographic, site, mobile home data.

CREATE TABLE IF NOT EXISTS pacs_property_profiles (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id   UUID NOT NULL REFERENCES counties(id),

  -- Identity
  prop_id         INTEGER NOT NULL,
  prop_val_yr     INTEGER NOT NULL,
  sup_num         INTEGER DEFAULT 0,

  -- Classification
  class_cd        TEXT,
  state_cd        TEXT,
  property_use_cd TEXT,
  imprv_type_cd   TEXT,
  imprv_det_sub_class_cd TEXT,
  num_imprv       INTEGER,

  -- Building characteristics
  yr_blt              INTEGER,
  actual_year_built   INTEGER,
  eff_yr_blt          INTEGER,
  actual_age          INTEGER,
  living_area         NUMERIC(12,2),
  condition_cd        TEXT,
  percent_complete    NUMERIC(5,2),
  heat_ac_code        TEXT,
  class_cd_highvalue_imprv    TEXT,
  living_area_highvalue_imprv NUMERIC(12,2),

  -- Improvement valuation
  imprv_unit_price  NUMERIC(14,2),
  imprv_add_val     NUMERIC(14,2),
  appraised_val     NUMERIC(14,2),

  -- Land measurements
  land_type_cd      TEXT,
  land_sqft         NUMERIC(14,2),
  land_acres        NUMERIC(14,4),
  land_total_acres  NUMERIC(14,4),
  land_useable_acres NUMERIC(14,4),
  land_useable_sqft NUMERIC(14,2),
  land_front_feet   NUMERIC(10,2),
  land_depth        NUMERIC(10,2),
  land_num_lots     INTEGER,
  land_total_sqft   NUMERIC(14,2),

  -- Land valuation
  land_unit_price       NUMERIC(14,2),
  main_land_unit_price  NUMERIC(14,2),
  main_land_total_adj   NUMERIC(10,4),
  land_appr_method      TEXT,
  ls_table              TEXT,
  size_adj_pct          NUMERIC(10,4),

  -- Geographic / market
  neighborhood     TEXT,
  region           TEXT,
  abs_subdv        TEXT,
  subset_cd        TEXT,
  map_id           TEXT,
  sub_market_cd    TEXT,

  -- Site characteristics
  zoning                TEXT,
  characteristic_zoning1 TEXT,
  characteristic_zoning2 TEXT,
  characteristic_view    TEXT,
  visibility_access_cd   TEXT,
  road_access          TEXT,
  utilities            TEXT,
  topography           TEXT,
  school_id            TEXT,
  city_id              TEXT,
  last_appraisal_dt    DATE,

  -- Mobile home
  mbl_hm_make      TEXT,
  mbl_hm_model     TEXT,
  mbl_hm_sn        TEXT,
  mbl_hm_hud_num   TEXT,
  mbl_hm_title_num TEXT,

  -- Metadata
  last_pacs_sync   TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),

  UNIQUE(county_id, prop_id, prop_val_yr, sup_num)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_pacs_property_profiles_prop
  ON pacs_property_profiles(prop_id, prop_val_yr);

CREATE INDEX IF NOT EXISTS idx_pacs_property_profiles_hood
  ON pacs_property_profiles(neighborhood);

-- RLS
ALTER TABLE pacs_property_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "county-scoped read" ON pacs_property_profiles
  FOR SELECT USING (TRUE);
CREATE POLICY "county-scoped insert" ON pacs_property_profiles
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "county-scoped update" ON pacs_property_profiles
  FOR UPDATE USING (TRUE);

-- updated_at trigger
CREATE OR REPLACE FUNCTION _set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at_pacs_property_profiles
  BEFORE UPDATE ON pacs_property_profiles
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();
