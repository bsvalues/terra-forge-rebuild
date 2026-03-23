-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 151.5: Ascend/Proval Legacy Staging Tables
-- ═══════════════════════════════════════════════════════════════════════════
-- Maps Benton County pre-2015 Ascend/Proval data into TerraFusion staging.
--
-- Source databases (Microsoft Access .mdb):
--   Real_tables1.mdb      → real_master, real_land, real_improv
--   gis_manatron_2000.mdb → ascend_excise, ascend_values, permits
--
-- Primary key convention: lrsn (Ascend's unique integer property ID)
-- Parcel link: ascend_property.pin = parcels.parcel_number
-- PACS link: parcels now carry BOTH prop_id (PACS) and lrsn (Ascend)
--   → enables full 20+ year value history via vw_full_value_history
--
-- Tables created:
--   ascend_property      — master parcel + owner + 5-year embedded values
--   ascend_improvements  — building characteristics
--   ascend_land          — lot details + utilities + topo
--   ascend_sales         — sales from real_land (3 embedded) + excise records
--   ascend_values        — multi-year assessment history (359,733 rows)
--   ascend_permits       — building permits
-- Views created:
--   vw_ascend_bridge_coverage  — coverage report (parcels with/without lrsn)
--   vw_full_value_history       — PACS + Ascend merged timeline per parcel
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. ascend_property (from real_master) ───────────────────────────────────
-- Canonical parcel record in Ascend/Proval system.
-- Contains 5 years of embedded assessment values (most recent at export time).

CREATE TABLE IF NOT EXISTS ascend_property (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id       uuid REFERENCES counties(id) NOT NULL,
  lrsn            integer NOT NULL,       -- Ascend unique property ID
  pin             text,                   -- parcel number → parcels.parcel_number
  owner1          text,
  owner2          text,
  mail_addr       text,
  mail_city       text,
  mail_state      text,
  mail_zip        text,
  loc_addr        text,
  loc_city        text,
  loc_state       text,
  loc_zip         text,
  prop_class      text,                   -- propclas (property class code)
  nei_desc        text,                   -- neighborhood description
  zoning          text,
  zone_desc       text,
  legal_ac        numeric(12,4),          -- legalac (legal acreage)
  legal1          text,
  legal2          text,
  legal3          text,
  -- Exemptions
  exempt1         text,   exempt1_desc text,
  exempt2         text,   exempt2_desc text,
  exempt3         text,   exempt3_desc text,
  exempt4         text,   exempt4_desc text,
  exempt5         text,   exempt5_desc text,
  -- Assessment year slots (1 = most recent, 5 = oldest in window)
  assmnt1_date    date,   chg_code1    text,   chg_desc1    text,
  assmnt2_date    date,   chg_code2    text,   chg_desc2    text,
  assmnt3_date    date,   chg_code3    text,   chg_desc3    text,
  assmnt4_date    date,   chg_code4    text,   chg_desc4    text,
  assmnt5_date    date,   chg_code5    text,   chg_desc5    text,
  -- Appraised market values per year slot
  land_val1       integer,  land_val2    integer,  land_val3    integer,
  land_val4       integer,  land_val5    integer,
  dwlg_val1       integer,  dwlg_val2    integer,  dwlg_val3    integer,
  dwlg_val4       integer,  dwlg_val5    integer,
  oth_val1        integer,  oth_val2     integer,  oth_val3     integer,
  oth_val4        integer,  oth_val5     integer,
  tot_val1        integer,  tot_val2     integer,  tot_val3     integer,
  tot_val4        integer,  tot_val5     integer,
  -- Taxable values per year slot
  taxland1        integer,  taxland2     integer,  taxland3     integer,
  taxland4        integer,  taxland5     integer,
  taxdwlg1        integer,  taxdwlg2     integer,  taxdwlg3     integer,
  taxdwlg4        integer,  taxdwlg5     integer,
  taxoth1         integer,  taxoth2      integer,  taxoth3      integer,
  taxoth4         integer,  taxoth5      integer,
  taxtot1         integer,  taxtot2      integer,  taxtot3      integer,
  taxtot4         integer,  taxtot5      integer,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(county_id, lrsn)
);

ALTER TABLE ascend_property ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON ascend_property
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_ascend_prop_lrsn  ON ascend_property(county_id, lrsn);
CREATE INDEX idx_ascend_prop_pin   ON ascend_property(county_id, pin);
CREATE INDEX idx_ascend_prop_owner ON ascend_property(county_id, owner1);

-- ── 2. ascend_improvements (from real_improv) ───────────────────────────────
-- Building physical characteristics.

CREATE TABLE IF NOT EXISTS ascend_improvements (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id       uuid REFERENCES counties(id) NOT NULL,
  lrsn            integer NOT NULL,
  pin             text,
  impr_type       text,           -- imprtype
  use_code        text,           -- usecode
  use_desc        text,           -- usedesc
  yr_built        integer,
  fin_size        integer,        -- finished sq ft
  stories         text,
  cond_code       text,
  cond_desc       text,
  const_frame     text,           -- constfr
  foundation      text,           -- foundat
  roof_type       text,
  roof_mat        text,           -- roofmatc
  num_rooms       integer,
  num_bedrooms    integer,
  num_baths_2     text,           -- num2baths (half bath count)
  num_baths_3     text,           -- num3baths (3/4 bath count)
  num_baths_4     text,           -- num4baths (full bath count)
  heat_fuel       text,
  heat_type       text,
  heat_desc       text,
  central_ac      text,           -- centrlac
  attic           text,
  attic_fin       text,
  bsmt_area       text,
  bsmt_fin        text,
  att_gar_sf      text,           -- attached garage sq ft
  det_gar_sf      text,           -- detached garage sq ft
  deck_sf         text,
  lower_area      text,
  lower_fin       text,
  sketch          text,
  photo           text,
  imp_stat        text,           -- improvement status
  last_upd_date   date,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(county_id, lrsn, impr_type)
);

ALTER TABLE ascend_improvements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON ascend_improvements
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_ascend_impr_lrsn ON ascend_improvements(county_id, lrsn);
CREATE INDEX idx_ascend_impr_pin  ON ascend_improvements(county_id, pin);
CREATE INDEX idx_ascend_impr_year ON ascend_improvements(county_id, yr_built);

-- ── 3. ascend_land (from real_land) ─────────────────────────────────────────
-- Lot details, utilities, topography.
-- NOTE: The 3 embedded sale records in real_land are extracted into ascend_sales.

CREATE TABLE IF NOT EXISTS ascend_land (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id       uuid REFERENCES counties(id) NOT NULL,
  lrsn            integer NOT NULL,
  pin             text,
  acres           numeric(12,4),
  sqft            text,
  shape           text,
  front_siz       text,
  rear_siz        text,
  lien_date       text,
  num_dwlg        integer,
  num_oth         integer,
  num_impr        integer,
  lien_owner      text,
  -- Topography
  topo_cod1       text,   topo_des1    text,
  topo_cod2       text,   topo_des2    text,
  topo_cod3       text,   topo_des3    text,
  -- Utilities
  elec            text,
  gas             text,
  water           text,
  sewer           text,
  cable           text,
  well            text,
  septic          text,
  -- Land types
  land_typ1       text,   land_des1    text,
  land_typ2       text,   land_des2    text,
  land_typ3       text,   land_des3    text,
  land_typ4       text,   land_des4    text,
  land_typ5       text,   land_des5    text,
  -- GIS / admin metadata
  impervious_sf   text,
  gis_upd_date    text,
  adm_upd_date    text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(county_id, lrsn)
);

ALTER TABLE ascend_land ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON ascend_land
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_ascend_land_lrsn ON ascend_land(county_id, lrsn);
CREATE INDEX idx_ascend_land_pin  ON ascend_land(county_id, pin);

-- ── 4. ascend_sales ──────────────────────────────────────────────────────────
-- Merged from two sources:
--   'land_record' → real_land.sale1-3 (up to 3 per parcel)
--   'excise'      → ascend_excise (20,054 formal excise transactions)
-- The excise table is the authoritative source for recorded sales.

CREATE TABLE IF NOT EXISTS ascend_sales (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id       uuid REFERENCES counties(id) NOT NULL,
  lrsn            integer NOT NULL,
  pin             text,
  sale_date       date,
  sale_price      numeric(14,2),
  grantor         text,
  doc_ref         text,
  doc_type        text,
  -- Excise-specific fields (null for land_record rows)
  excise_number   text,
  gross_sale_price numeric(14,2),
  mod_sale_price   numeric(14,2),
  portion_ind      text,
  remarks          text,
  recording_number text,
  excise_id        integer,
  -- Source tracking
  source          text NOT NULL DEFAULT 'land_record', -- 'land_record' | 'excise'
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE ascend_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON ascend_sales
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_ascend_sales_lrsn ON ascend_sales(county_id, lrsn);
CREATE INDEX idx_ascend_sales_pin  ON ascend_sales(county_id, pin);
CREATE INDEX idx_ascend_sales_date ON ascend_sales(county_id, sale_date);

-- ── 5. ascend_values ─────────────────────────────────────────────────────────
-- THE HISTORICAL GOLDMINE: 359,733 rows spanning many tax years.
-- Source: gis_manatron_2000.mdb → ascend_values
-- Columns:
--   MKLND/MKIMP/MKTTL = Market Land / Improvement / Total
--   CULND/CUIMP/CUTTL = Current Use Land / Improvement / Total
--   TRV = Taxable Regular Value
--   AVR = Assessed Value Regular

CREATE TABLE IF NOT EXISTS ascend_values (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id       uuid REFERENCES counties(id) NOT NULL,
  lrsn            integer NOT NULL,
  pin             text,
  tax_year        text NOT NULL,          -- e.g. '2014', '2013', ...
  -- Market values
  mklnd           numeric(14,2),          -- market land value
  mkimp           numeric(14,2),          -- market improvement value
  mkttl           numeric(14,2),          -- market total value
  -- Current use values (WA RCW 84.34 / 84.33 programs)
  culnd           numeric(14,2),
  cuimp           numeric(14,2),
  cuttl           numeric(14,2),
  -- Taxable values
  trv             numeric(14,2),          -- taxable regular value
  avr             numeric(14,2),          -- assessed value regular
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(county_id, lrsn, tax_year)
);

ALTER TABLE ascend_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON ascend_values
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_ascend_values_lrsn ON ascend_values(county_id, lrsn);
CREATE INDEX idx_ascend_values_pin  ON ascend_values(county_id, pin);
CREATE INDEX idx_ascend_values_year ON ascend_values(county_id, tax_year);

-- ── 6. ascend_permits ────────────────────────────────────────────────────────
-- Building permits from gis_manatron_2000.mdb → permits (46,396 rows).

CREATE TABLE IF NOT EXISTS ascend_permits (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id       uuid REFERENCES counties(id) NOT NULL,
  lrsn            text NOT NULL,          -- stored as text in Ascend
  permit_ref      text,
  permit_type     text,
  permit_desc     text,
  status          text,
  cost_estimate   integer,
  sq_ft           integer,
  filing_date     date,
  callback        date,
  inactive_date   date,
  last_update     date,
  cert_for_occ    date,
  permit_source   text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE ascend_permits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON ascend_permits
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_ascend_permits_lrsn ON ascend_permits(county_id, lrsn);
CREATE INDEX idx_ascend_permits_date ON ascend_permits(county_id, filing_date);

-- ── 7. Add lrsn column to parcels table ──────────────────────────────────────
-- parcels now carries BOTH connectors:
--   prop_id (integer) → PACS  (2015-present)
--   lrsn    (integer) → Ascend (pre-2015)
-- Joined on parcel_number = pin for backfill.

ALTER TABLE parcels ADD COLUMN IF NOT EXISTS lrsn INTEGER;

CREATE INDEX IF NOT EXISTS idx_parcels_lrsn
  ON parcels (lrsn) WHERE lrsn IS NOT NULL;

-- Backfill lrsn from staged ascend_property where pin matches parcel_number.
-- Runs only once; idempotent (WHERE lrsn IS NULL guard).
UPDATE parcels p
SET lrsn = sub.lrsn
FROM (
  SELECT DISTINCT ON (pin) pin, lrsn
  FROM ascend_property
  WHERE pin IS NOT NULL
  ORDER BY pin, lrsn DESC
) sub
WHERE p.parcel_number = sub.pin
  AND p.lrsn IS NULL;

-- ── 8. RPC: resolve lrsn ↔ parcel ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION resolve_lrsn_to_parcel(p_lrsn INTEGER)
RETURNS TABLE(parcel_id UUID, parcel_number TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id AS parcel_id, parcel_number
  FROM parcels
  WHERE lrsn = p_lrsn;
$$;

CREATE OR REPLACE FUNCTION resolve_parcel_to_lrsn(p_parcel_id UUID)
RETURNS TABLE(lrsn INTEGER, pin TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT p.lrsn, p.parcel_number AS pin
  FROM parcels p
  WHERE p.id = p_parcel_id;
$$;

-- ── 9. Views ──────────────────────────────────────────────────────────────────

-- vw_ascend_bridge_coverage: which parcels have an Ascend link
CREATE OR REPLACE VIEW vw_ascend_bridge_coverage AS
SELECT
  p.id                                            AS parcel_id,
  p.county_id,
  p.parcel_number,
  p.lrsn,
  ap.owner1,
  ap.tot_val1                                     AS latest_total_value,
  ap.assmnt1_date                                 AS latest_assessment_date,
  p.lrsn IS NOT NULL                              AS has_ascend_link,
  COALESCE(av_cnt.cnt, 0) > 0                     AS has_value_history,
  COALESCE(av_cnt.cnt, 0)                         AS value_history_years
FROM parcels p
LEFT JOIN ascend_property ap
       ON ap.lrsn = p.lrsn
      AND ap.county_id = p.county_id
LEFT JOIN (
  SELECT lrsn, county_id, COUNT(*) AS cnt
  FROM ascend_values
  GROUP BY lrsn, county_id
) av_cnt ON av_cnt.lrsn = p.lrsn AND av_cnt.county_id = p.county_id;

-- vw_full_value_history: merged PACS + Ascend timeline per parcel
-- This is the 20-year history view — Ascend pre-2015, PACS 2015+
CREATE OR REPLACE VIEW vw_full_value_history AS
  -- Ascend multi-year history (pre-2015)
  SELECT
    p.id                    AS parcel_id,
    p.parcel_number,
    av.tax_year::integer    AS roll_year,
    av.mklnd                AS land_value,
    av.mkimp                AS impr_value,
    av.mkttl                AS total_value,
    av.avr                  AS taxable_value,
    'ascend'::text          AS source_system
  FROM parcels p
  JOIN ascend_values av
    ON av.lrsn = p.lrsn
   AND av.county_id = p.county_id

UNION ALL

  -- PACS assessment roll (2015+)
  SELECT
    p.id                                                          AS parcel_id,
    p.parcel_number,
    par.roll_year,
    (par.land_hstd_val + par.land_non_hstd_val)                  AS land_value,
    (par.imprv_hstd_val + par.imprv_non_hstd_val)                AS impr_value,
    (par.land_hstd_val + par.land_non_hstd_val
     + par.imprv_hstd_val + par.imprv_non_hstd_val)              AS total_value,
    (par.taxable_classified + par.taxable_non_classified)        AS taxable_value,
    'pacs'::text            AS source_system
  FROM parcels p
  JOIN pacs_assessment_roll par
    ON par.prop_id = p.prop_id
   AND par.county_id = p.county_id;
