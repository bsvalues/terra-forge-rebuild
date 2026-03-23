-- ═══════════════════════════════════════════════════════════════════════════
-- CostForge: Benton County Custom Cost Schedule Tables
-- ═══════════════════════════════════════════════════════════════════════════
-- TerraFusion CostForge is Benton County's own cost approach, built
-- independently of Marshall & Swift. While other PACS counties license M&S
-- data, Benton County built custom schedules (informed by M&S/Proval but
-- distinct). These tables store that schedule library so TerraFusion can:
--   1. Reproduce historical Ascend/PACS valuations for audit continuity
--   2. Run forward-looking CostForge valuations on new data
--   3. Serve as the seed for other counties adopting TerraFusion
--
-- Source files (Excel, Benton County):
--   Cost Approach.xlsx              → residential base unit costs
--   Section 11-18.xlsx              → commercial base unit costs by occupancy
--   Depreciation.xlsx               → physical depreciation tables (res + comm)
--   local and current cost multipliers.xlsx → geographic + time adjustments
--   Refinement Matrices.xlsx        → HVAC, sprinklers, elevators, shape
--   PACS detail type codes-8-24.xlsx → imprv_det_type_cd lookup
--
-- Cost computation (RCNLD):
--   RCN  = base_unit_cost × (local_mult/100) × (current_cost_mult/100) × area
--   RCNL = RCN × (pct_good/100)       [pct_good from depreciation table]
--   RCNLD = RCNL (+) refinements (HVAC, sprinklers, etc.)
--
-- Tables:
--   costforge_residential_schedules   — res base costs (quality × area × extwall)
--   costforge_commercial_schedules    — comm base costs (section × occupancy × class × quality)
--   costforge_depreciation            — pct_good by prop_type, age, effective_life_class
--   costforge_cost_multipliers        — local (by class) and current (by section × class)
--   costforge_refinements             — HVAC / sprinkler / elevator / shape add-ons
--   costforge_imprv_type_codes        — PACS imprv_det_type_cd → section/occupancy lookup
--   costforge_calc_trace              — per-parcel calculation audit log (future engine)
--
-- All tables carry county_id for multi-county support.
-- Benton County has county_id = '842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d'
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Residential Base Unit Cost Schedules ──────────────────────────────────
-- Source: Cost Approach.xlsx
-- Keyed by: quality_grade × min_area (area band start) × ext_wall_type
-- unit_cost is in $/sqft for that area band and exterior wall type.
-- For a given parcel, select the row where min_area ≤ actual_area and
-- quality_grade matches. Linear interpolation between rows is optional.

CREATE TABLE IF NOT EXISTS costforge_residential_schedules (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id       uuid REFERENCES counties(id) NOT NULL,
  quality_grade   text NOT NULL,        -- 'Low', 'Fair', 'Average', 'Good', 'Excellent'
  min_area        integer NOT NULL,     -- lower bound of this area band (sqft)
  ext_wall_type   text NOT NULL,        -- 'Plywood or Hardboard', 'Metal or Vinyl Siding', etc.
  unit_cost       numeric(8,2) NOT NULL, -- $/sqft
  schedule_year   integer,              -- year of schedule; NULL = current
  source_file     text,                 -- source Excel filename for audit
  created_at      timestamptz DEFAULT now(),
  UNIQUE(county_id, quality_grade, min_area, ext_wall_type, COALESCE(schedule_year, 0))
);

ALTER TABLE costforge_residential_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON costforge_residential_schedules
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_cfres_lookup
  ON costforge_residential_schedules(county_id, quality_grade, min_area);

-- ── 2. Commercial Base Unit Cost Schedules ───────────────────────────────────
-- Source: Section 11–18.xlsx (each file = a section; each sheet = an occupancy)
-- Keyed by: section_id × occupancy_code × construction_class × quality_grade
-- Sections 11-18 correspond to Proval/M&S classification sections.
-- Construction classes: A (Structural Steel), B (Reinforced Concrete),
--   C (Masonry), D (Wood/Steel Frame), S (Pre-Engineered Steel), P (Pole Frame)
-- Quality grades: Low, Average, Good, Excellent

CREATE TABLE IF NOT EXISTS costforge_commercial_schedules (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id           uuid REFERENCES counties(id) NOT NULL,
  section_id          integer NOT NULL,   -- 11–18, 61, 64
  occupancy_code      text NOT NULL,      -- e.g. '330' = Homes for the Elderly
  occupancy_desc      text,
  construction_class  text NOT NULL,      -- A, B, C, D, S, P
  quality_grade       text NOT NULL,      -- Low, Average, Good, Excellent
  unit_cost           numeric(8,2),       -- $/sqft base (null = not applicable)
  pct_diff_to_next    numeric(6,4),       -- % from this quality to next (for interpolation)
  depreciation_table  text,               -- e.g. '45R' — which dep table applies
  detail_count        integer,            -- number of PACS detail records for this occupancy
  schedule_year       integer,
  source_file         text,
  source_sheet        text,               -- sheet name within the Excel file
  created_at          timestamptz DEFAULT now(),
  UNIQUE(county_id, section_id, occupancy_code, construction_class, quality_grade,
         COALESCE(schedule_year, 0))
);

ALTER TABLE costforge_commercial_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON costforge_commercial_schedules
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_cfcomm_section
  ON costforge_commercial_schedules(county_id, section_id, occupancy_code);
CREATE INDEX idx_cfcomm_class
  ON costforge_commercial_schedules(county_id, construction_class, quality_grade);

-- ── 3. Depreciation Tables ───────────────────────────────────────────────────
-- Source: Depreciation.xlsx (two sheets: Commercial Properties, Residential Properties)
-- Matrix: age (1-?) × effective_life_class (max economic life in years) → pct_good (0-100)
-- pct_good = 100 means no depreciation. 80 means 20% depreciated.
-- Matrix ID columns reference PACS cms_matrix table IDs (e.g. 3453, 3452...)

CREATE TABLE IF NOT EXISTS costforge_depreciation (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id             uuid REFERENCES counties(id) NOT NULL,
  property_type         text NOT NULL,      -- 'residential' | 'commercial'
  age_years             integer NOT NULL,   -- chronological age of improvement
  effective_life_years  integer NOT NULL,   -- max economic life (20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70)
  pct_good              integer NOT NULL,   -- 0-100 (percent remaining value)
  pacs_matrix_id        integer,            -- PACS cms_matrix.matrix_id (for cross-reference)
  schedule_year         integer,
  source_file           text,
  created_at            timestamptz DEFAULT now(),
  UNIQUE(county_id, property_type, age_years, effective_life_years,
         COALESCE(schedule_year, 0))
);

ALTER TABLE costforge_depreciation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON costforge_depreciation
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_cfdep_lookup
  ON costforge_depreciation(county_id, property_type, age_years, effective_life_years);

-- ── 4. Cost Multipliers ──────────────────────────────────────────────────────
-- Source: local and current cost multipliers.xlsx
-- Two types stored together with multiplier_type discriminator:
--
--   'local'  — geographic adjustment by construction_class
--              (e.g. Class A = 112%, applied once for the county's location)
--              section_id = NULL for local multipliers
--
--   'current' — time/inflation adjustment by section_id × construction_class
--              (e.g. Section 11, Class A = 99%)
--              Applied to bring base schedule costs to current value

CREATE TABLE IF NOT EXISTS costforge_cost_multipliers (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id           uuid REFERENCES counties(id) NOT NULL,
  multiplier_type     text NOT NULL,     -- 'local' | 'current'
  construction_class  text NOT NULL,     -- A, B, C, D, S, P
  section_id          integer,           -- NULL for local multipliers; 11-18 for current cost
  multiplier          numeric(6,2) NOT NULL,  -- percentage value (e.g. 112.0 = 112%)
  pacs_matrix_id      integer,
  schedule_year       integer,
  source_file         text,
  created_at          timestamptz DEFAULT now(),
  UNIQUE(county_id, multiplier_type, construction_class,
         COALESCE(section_id, 0), COALESCE(schedule_year, 0))
);

ALTER TABLE costforge_cost_multipliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON costforge_cost_multipliers
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_cfmult_lookup
  ON costforge_cost_multipliers(county_id, multiplier_type, construction_class, section_id);

-- ── 5. Refinement Matrices (HVAC, Sprinklers, Elevators, Shape) ─────────────
-- Source: Refinement Matrices.xlsx
-- Add-on costs expressed as $/sqft (HVAC, sprinklers, height/shape multipliers)
-- or flat $/unit (elevators).
-- These are applied AFTER base RCN is computed.

CREATE TABLE IF NOT EXISTS costforge_refinements (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id       uuid REFERENCES counties(id) NOT NULL,
  refinement_type text NOT NULL,     -- 'hvac' | 'sprinkler' | 'elevator' | 'shape' | 'height'
  qualifier       text NOT NULL,     -- HVAC type, sprinkler class, elevator type, shape code, etc.
  qualifier_desc  text,              -- human-readable description
  section_id      integer,           -- which cost section this applies to (null = all)
  area_band_min   integer,           -- for area-interpolated refinements (sprinklers)
  unit             text NOT NULL,    -- 'per_sqft' | 'flat' | 'multiplier'
  value           numeric(10,4) NOT NULL,  -- $/sqft, flat $, or multiplier
  pacs_attribute_cd text,            -- maps to imprv_attr.i_attr_cd in PACS
  schedule_year   integer,
  source_file     text,
  source_sheet    text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE costforge_refinements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON costforge_refinements
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_cfref_lookup
  ON costforge_refinements(county_id, refinement_type, qualifier, section_id);

-- ── 6. Improvement Type Code Lookup ──────────────────────────────────────────
-- Source: PACS detail type codes-8-24.xlsx
-- Maps PACS imprv_det_type_cd → TerraFusion/CostForge section + occupancy.
-- This is the bridge between "what PACS calls it" and "what section/occupancy
-- schedule to look up for valuation."

CREATE TABLE IF NOT EXISTS costforge_imprv_type_codes (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id           uuid REFERENCES counties(id) NOT NULL,
  imprv_det_type_cd   text NOT NULL,    -- PACS/Ascend code (e.g. 'ATTGAR', 'APART')
  type_desc           text,
  canonical_code      text,             -- normalized TerraFusion code
  canonical_desc      text,
  section_id          integer,          -- which CostForge section (11-18, 61, 64, 99=res)
  occupancy_code      text,             -- which occupancy within the section
  is_residential      boolean DEFAULT false,
  is_active           boolean DEFAULT true,
  notes               text,
  created_at          timestamptz DEFAULT now(),
  UNIQUE(county_id, imprv_det_type_cd)
);

ALTER TABLE costforge_imprv_type_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON costforge_imprv_type_codes
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_cftypes_cd
  ON costforge_imprv_type_codes(county_id, imprv_det_type_cd);
CREATE INDEX idx_cftypes_section
  ON costforge_imprv_type_codes(county_id, section_id, occupancy_code);

-- ── 7. CostForge Calculation Trace (audit log) ──────────────────────────────
-- Stores the per-improvement breakdown of how a value was computed.
-- NOT populated by the seeder — populated by the CostForge calc engine
-- when it runs a valuation. Enables full audit trail:
--   "this parcel's improvement value = this schedule + this multiplier - this dep"

CREATE TABLE IF NOT EXISTS costforge_calc_trace (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id       uuid REFERENCES counties(id) NOT NULL,
  parcel_id       uuid REFERENCES parcels(id),
  lrsn            integer,     -- Ascend ID
  prop_id         integer,     -- PACS ID
  calc_year       integer NOT NULL,
  imprv_sequence  integer DEFAULT 1,   -- which improvement on the parcel
  imprv_type_cd   text,
  section_id      integer,
  occupancy_code  text,
  construction_class text,
  quality_grade   text,
  area_sqft       numeric(10,2),
  -- Cost components
  base_unit_cost      numeric(8,2),    -- $/sqft from schedule lookup
  local_multiplier    numeric(6,2),    -- from costforge_cost_multipliers (local)
  current_cost_mult   numeric(6,2),    -- from costforge_cost_multipliers (current)
  rcn_before_ref      numeric(14,2),   -- RCN before refinements
  refinements_total   numeric(14,2),   -- sum of HVAC + sprinklers + etc.
  rcn                 numeric(14,2),   -- Replacement Cost New (total)
  -- Depreciation
  age_years           integer,
  effective_life_years integer,
  pct_good            integer,         -- from costforge_depreciation
  -- Result
  rcnld               numeric(14,2),   -- RCN Less Depreciation
  -- Provenance
  schedule_source     text,            -- schedule file used
  calc_method         text DEFAULT 'costforge_v1',
  calc_run_at         timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE costforge_calc_trace ENABLE ROW LEVEL SECURITY;
CREATE POLICY "County isolation" ON costforge_calc_trace
  FOR ALL USING (county_id IN (
    SELECT county_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_cftrace_parcel
  ON costforge_calc_trace(county_id, parcel_id);
CREATE INDEX idx_cftrace_lrsn
  ON costforge_calc_trace(county_id, lrsn);
CREATE INDEX idx_cftrace_year
  ON costforge_calc_trace(county_id, calc_year);

-- ── 8. Convenience view: CostForge schedule coverage summary ────────────────

CREATE OR REPLACE VIEW vw_costforge_coverage AS
SELECT
  cm.county_id,
  (SELECT COUNT(*) FROM costforge_residential_schedules r WHERE r.county_id = cm.county_id) AS res_schedule_rows,
  (SELECT COUNT(DISTINCT section_id || '-' || occupancy_code)
     FROM costforge_commercial_schedules c WHERE c.county_id = cm.county_id)                AS comm_occupancies,
  (SELECT COUNT(*) FROM costforge_commercial_schedules c WHERE c.county_id = cm.county_id)  AS comm_schedule_rows,
  (SELECT COUNT(*) FROM costforge_depreciation d WHERE d.county_id = cm.county_id)          AS depreciation_rows,
  (SELECT COUNT(*) FROM costforge_cost_multipliers m WHERE m.county_id = cm.county_id)      AS multiplier_rows,
  (SELECT COUNT(*) FROM costforge_refinements rf WHERE rf.county_id = cm.county_id)         AS refinement_rows,
  (SELECT COUNT(*) FROM costforge_imprv_type_codes t WHERE t.county_id = cm.county_id)      AS type_code_rows
FROM (SELECT DISTINCT county_id FROM costforge_residential_schedules
      UNION SELECT DISTINCT county_id FROM costforge_commercial_schedules) cm;

-- ── 9. Convenience view: calc-ready improvement inputs ──────────────────────
-- Joins Ascend improvement records to type code lookups so the calc engine
-- can pick up all inputs in one query per improvement.

CREATE OR REPLACE VIEW vw_costforge_imprv_inputs AS
SELECT
  ai.lrsn,
  ai.pin,
  ai.county_id,
  ai.impr_type                    AS imprv_det_type_cd,
  ai.yr_built,
  ai.fin_size                     AS area_sqft,
  ai.cond_code                    AS condition_code,
  ai.const_frame                  AS construction_class_raw,
  ai.use_code,
  ai.use_desc,
  -- CostForge schedule resolution
  tc.section_id,
  tc.occupancy_code,
  tc.is_residential,
  tc.canonical_desc
FROM ascend_improvements ai
LEFT JOIN costforge_imprv_type_codes tc
       ON tc.imprv_det_type_cd = ai.impr_type
      AND tc.county_id = ai.county_id;
