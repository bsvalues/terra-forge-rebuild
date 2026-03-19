
-- Phase 60: Salt Lake County Canonical Schema (10 tables)
-- Provenance-first, county-partitioned, temporal validity windows

-- 1) Parcel Master — the authoritative parcel key
CREATE TABLE public.slco_parcel_master (
    parcel_sk uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id text NOT NULL DEFAULT '49035',
    parcel_id text NOT NULL,
    parcel_id_normalized text NOT NULL,
    source_preferred text NOT NULL DEFAULT 'sgid',
    situs_address text,
    situs_city text,
    situs_zip text,
    owner_name text,
    property_type_code text,
    property_type_label text,
    land_use_code text,
    tax_district_id text,
    model_area_id text,
    acreage numeric(12,4),
    geom_source text,
    active_flag boolean NOT NULL DEFAULT true,
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_to timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_slco_parcel_master_county_parcel
    ON public.slco_parcel_master(county_id, parcel_id_normalized, valid_from);

-- 2) Parcel Source Registry — lineage tracking
CREATE TABLE public.slco_parcel_source_registry (
    source_row_sk uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id text NOT NULL DEFAULT '49035',
    parcel_id_normalized text NOT NULL,
    source_system text NOT NULL,
    source_url text,
    source_dataset text,
    source_record_id text,
    retrieved_at timestamptz NOT NULL DEFAULT now(),
    snapshot_date date,
    license_terms_note text,
    raw_payload_hash text NOT NULL
);

-- 3) Parcel Geometry Snapshots — versioned geometry
CREATE TABLE public.slco_parcel_geometry_snapshot (
    geom_sk uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id text NOT NULL DEFAULT '49035',
    parcel_id_normalized text NOT NULL,
    geometry_version int NOT NULL DEFAULT 1,
    area_sqft numeric(18,2),
    area_acres numeric(18,4),
    centroid_lat numeric,
    centroid_lng numeric,
    coordinates jsonb,
    source_system text NOT NULL,
    retrieved_at timestamptz NOT NULL DEFAULT now(),
    superseded_at timestamptz
);

-- 4) Parcel Assessment Summary — tax-year snapshots
CREATE TABLE public.slco_parcel_assessment_summary (
    assessment_sk uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id text NOT NULL DEFAULT '49035',
    parcel_id_normalized text NOT NULL,
    tax_year int NOT NULL,
    land_value numeric(14,2),
    improvement_value numeric(14,2),
    total_market_value numeric(14,2),
    assessed_value numeric(14,2),
    tax_district_id text,
    property_type_code text,
    property_type_label text,
    source_system text NOT NULL,
    snapshot_date date,
    retrieved_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_slco_assessment_year
    ON public.slco_parcel_assessment_summary(county_id, parcel_id_normalized, tax_year, source_system);

-- 5) Commercial Characteristics
CREATE TABLE public.slco_parcel_commercial_characteristics (
    commercial_sk uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id text NOT NULL DEFAULT '49035',
    parcel_id_normalized text NOT NULL,
    source_system text NOT NULL,
    snapshot_date date,
    rentable_sqft numeric(14,2),
    total_floor_area_sqft numeric(14,2),
    income_unit_count int,
    rental_class text,
    building_class text,
    percent_office numeric(5,2),
    zoning text,
    year_built int,
    effective_year_built int,
    remodel_year int,
    stories int,
    notes text,
    retrieved_at timestamptz NOT NULL DEFAULT now()
);

-- 6) Value History
CREATE TABLE public.slco_parcel_value_history (
    value_hist_sk uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id text NOT NULL DEFAULT '49035',
    parcel_id_normalized text NOT NULL,
    tax_year int NOT NULL,
    market_value numeric(14,2),
    land_value numeric(14,2),
    improvement_value numeric(14,2),
    source_system text NOT NULL,
    snapshot_date date,
    retrieved_at timestamptz NOT NULL DEFAULT now()
);

-- 7) Recorder Document Index
CREATE TABLE public.slco_recorder_document_index (
    document_sk uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id text NOT NULL DEFAULT '49035',
    recorder_doc_number text NOT NULL,
    parcel_id_normalized text,
    recording_date date,
    document_type text,
    grantor text,
    grantee text,
    legal_description text,
    image_available boolean DEFAULT false,
    source_system text NOT NULL DEFAULT 'recorder',
    retrieved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_slco_recorder_parcel ON public.slco_recorder_document_index(county_id, parcel_id_normalized);

-- 8) Parcel Identifier History — split/merge tracking
CREATE TABLE public.slco_parcel_identifier_history (
    id_hist_sk uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id text NOT NULL DEFAULT '49035',
    parcel_id_normalized text NOT NULL,
    prior_parcel_id_normalized text,
    successor_parcel_id_normalized text,
    relationship_type text,
    effective_date date,
    source_system text NOT NULL,
    retrieved_at timestamptz NOT NULL DEFAULT now()
);

-- 9) Spatial Context Join Table
CREATE TABLE public.slco_parcel_spatial_context (
    context_sk uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id text NOT NULL DEFAULT '49035',
    parcel_id_normalized text NOT NULL,
    tax_district_id text,
    model_area_id text,
    municipality text,
    joined_at timestamptz NOT NULL DEFAULT now(),
    source_system text NOT NULL
);

-- 10) Evidence Registry
CREATE TABLE public.slco_parcel_evidence_registry (
    evidence_sk uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id text NOT NULL DEFAULT '49035',
    parcel_id_normalized text NOT NULL,
    evidence_type text,
    source_system text NOT NULL,
    source_url text,
    source_ref text,
    snapshot_date date,
    retrieved_at timestamptz NOT NULL DEFAULT now(),
    file_hash text,
    storage_uri text
);

-- Pipeline stage tracking table
CREATE TABLE public.slco_pipeline_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stage text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    rows_in int DEFAULT 0,
    rows_out int DEFAULT 0,
    rows_rejected int DEFAULT 0,
    error_message text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on all tables
ALTER TABLE public.slco_parcel_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slco_parcel_source_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slco_parcel_geometry_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slco_parcel_assessment_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slco_parcel_commercial_characteristics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slco_parcel_value_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slco_recorder_document_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slco_parcel_identifier_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slco_parcel_spatial_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slco_parcel_evidence_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slco_pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Public read policies (demo data is public for the live demo)
CREATE POLICY "Anyone can view slco_parcel_master" ON public.slco_parcel_master FOR SELECT USING (true);
CREATE POLICY "Anyone can view slco_parcel_source_registry" ON public.slco_parcel_source_registry FOR SELECT USING (true);
CREATE POLICY "Anyone can view slco_parcel_geometry_snapshot" ON public.slco_parcel_geometry_snapshot FOR SELECT USING (true);
CREATE POLICY "Anyone can view slco_parcel_assessment_summary" ON public.slco_parcel_assessment_summary FOR SELECT USING (true);
CREATE POLICY "Anyone can view slco_parcel_commercial_characteristics" ON public.slco_parcel_commercial_characteristics FOR SELECT USING (true);
CREATE POLICY "Anyone can view slco_parcel_value_history" ON public.slco_parcel_value_history FOR SELECT USING (true);
CREATE POLICY "Anyone can view slco_recorder_document_index" ON public.slco_recorder_document_index FOR SELECT USING (true);
CREATE POLICY "Anyone can view slco_parcel_identifier_history" ON public.slco_parcel_identifier_history FOR SELECT USING (true);
CREATE POLICY "Anyone can view slco_parcel_spatial_context" ON public.slco_parcel_spatial_context FOR SELECT USING (true);
CREATE POLICY "Anyone can view slco_parcel_evidence_registry" ON public.slco_parcel_evidence_registry FOR SELECT USING (true);
CREATE POLICY "Anyone can view slco_pipeline_runs" ON public.slco_pipeline_runs FOR SELECT USING (true);

-- Admin write policies
CREATE POLICY "Admins can insert slco_parcel_master" ON public.slco_parcel_master FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update slco_parcel_master" ON public.slco_parcel_master FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can insert slco_parcel_source_registry" ON public.slco_parcel_source_registry FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can insert slco_parcel_geometry_snapshot" ON public.slco_parcel_geometry_snapshot FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can insert slco_parcel_assessment_summary" ON public.slco_parcel_assessment_summary FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can insert slco_parcel_commercial_characteristics" ON public.slco_parcel_commercial_characteristics FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can insert slco_parcel_value_history" ON public.slco_parcel_value_history FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can insert slco_recorder_document_index" ON public.slco_recorder_document_index FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can insert slco_parcel_identifier_history" ON public.slco_parcel_identifier_history FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can insert slco_parcel_spatial_context" ON public.slco_parcel_spatial_context FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can insert slco_parcel_evidence_registry" ON public.slco_parcel_evidence_registry FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can insert slco_pipeline_runs" ON public.slco_pipeline_runs FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update slco_pipeline_runs" ON public.slco_pipeline_runs FOR UPDATE USING (is_admin());

-- Mart views
CREATE OR REPLACE VIEW public.mart_slco_workbench_summary AS
SELECT
    pm.county_id,
    pm.parcel_id,
    pm.parcel_id_normalized,
    pm.situs_address,
    pm.situs_city,
    pm.situs_zip,
    pm.owner_name,
    pm.property_type_code,
    pm.property_type_label,
    pm.acreage,
    sc.tax_district_id,
    sc.model_area_id,
    sc.municipality,
    av.tax_year,
    av.total_market_value,
    av.land_value AS assessment_land_value,
    av.improvement_value AS assessment_improvement_value,
    av.assessed_value
FROM public.slco_parcel_master pm
LEFT JOIN public.slco_parcel_spatial_context sc
  ON sc.county_id = pm.county_id AND sc.parcel_id_normalized = pm.parcel_id_normalized
LEFT JOIN public.slco_parcel_assessment_summary av
  ON av.county_id = pm.county_id AND av.parcel_id_normalized = pm.parcel_id_normalized
  AND av.tax_year = EXTRACT(year FROM current_date)::int
WHERE pm.active_flag = true;

CREATE OR REPLACE VIEW public.mart_slco_forge_cost_context AS
SELECT
    pm.county_id,
    pm.parcel_id_normalized,
    pm.property_type_code,
    cc.building_class,
    cc.year_built,
    cc.effective_year_built,
    cc.total_floor_area_sqft,
    cc.rentable_sqft,
    cc.stories,
    cc.zoning,
    av.total_market_value,
    av.land_value,
    av.improvement_value
FROM public.slco_parcel_master pm
LEFT JOIN public.slco_parcel_commercial_characteristics cc
  ON cc.county_id = pm.county_id AND cc.parcel_id_normalized = pm.parcel_id_normalized
LEFT JOIN public.slco_parcel_assessment_summary av
  ON av.county_id = pm.county_id AND av.parcel_id_normalized = pm.parcel_id_normalized
  AND av.tax_year = EXTRACT(year FROM current_date)::int
WHERE pm.active_flag = true;

CREATE OR REPLACE VIEW public.mart_slco_dossier_index AS
SELECT
    pm.county_id,
    pm.parcel_id_normalized,
    pm.situs_address,
    pm.owner_name,
    er.evidence_type,
    er.source_system,
    er.source_url,
    er.snapshot_date,
    er.file_hash,
    rd.recorder_doc_number,
    rd.document_type,
    rd.recording_date,
    rd.grantor,
    rd.grantee
FROM public.slco_parcel_master pm
LEFT JOIN public.slco_parcel_evidence_registry er
  ON er.county_id = pm.county_id AND er.parcel_id_normalized = pm.parcel_id_normalized
LEFT JOIN public.slco_recorder_document_index rd
  ON rd.county_id = pm.county_id AND rd.parcel_id_normalized = pm.parcel_id_normalized
WHERE pm.active_flag = true;
