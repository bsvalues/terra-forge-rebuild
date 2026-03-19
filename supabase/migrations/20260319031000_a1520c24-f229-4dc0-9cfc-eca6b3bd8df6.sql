-- Phase 62: Constitutional Traceability Hardening (retry)

-- 1. Source-of-Truth metadata on SLCO canonical tables
ALTER TABLE public.slco_parcel_master
  ADD COLUMN IF NOT EXISTS source_system text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS pipeline_version text DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS lineage_hash text,
  ADD COLUMN IF NOT EXISTS payload_checksum text,
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz DEFAULT now();

ALTER TABLE public.slco_parcel_geometry_snapshot
  ADD COLUMN IF NOT EXISTS source_system text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS pipeline_version text DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS lineage_hash text;

ALTER TABLE public.slco_parcel_assessment_summary
  ADD COLUMN IF NOT EXISTS source_system text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS pipeline_version text DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS lineage_hash text;

-- 2. Immutable value lineage table (append-only)
CREATE TABLE IF NOT EXISTS public.slco_value_lineage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id text NOT NULL,
  county_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000049'::uuid,
  event_type text NOT NULL,
  source_module text NOT NULL,
  value_before jsonb DEFAULT '{}',
  value_after jsonb DEFAULT '{}',
  delta_amount numeric,
  delta_pct numeric,
  reason text,
  trace_event_id uuid,
  correlation_id uuid,
  pipeline_stage text,
  source_system text DEFAULT 'unknown',
  pipeline_version text DEFAULT '1.0.0',
  lineage_hash text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

ALTER TABLE public.slco_value_lineage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read value lineage"
  ON public.slco_value_lineage FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert value lineage"
  ON public.slco_value_lineage FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Write-lane violation log (append-only)
CREATE TABLE IF NOT EXISTS public.write_lane_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_module text NOT NULL,
  target_domain text NOT NULL,
  expected_owner text NOT NULL,
  violation_type text NOT NULL DEFAULT 'cross_lane',
  context jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  actor_id uuid DEFAULT auth.uid()
);

ALTER TABLE public.write_lane_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read violations"
  ON public.write_lane_violations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can log violations"
  ON public.write_lane_violations FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Appeal audit trail view (corrected column names)
CREATE OR REPLACE VIEW public.appeal_audit_trail AS
SELECT
  a.id AS appeal_id,
  a.parcel_id,
  a.status AS appeal_status,
  a.appeal_date,
  a.original_value,
  a.requested_value,
  a.final_value,
  a.resolution_type,
  a.resolution_date,
  a.hearing_date,
  a.notes AS appeal_notes,
  a.county_id,
  a.tax_year,
  asc_tbl.id AS status_change_id,
  asc_tbl.previous_status,
  asc_tbl.new_status,
  asc_tbl.change_reason,
  asc_tbl.created_at AS status_changed_at,
  va.id AS adjustment_id,
  va.adjustment_type,
  va.previous_value AS adj_previous_value,
  va.new_value AS adj_new_value,
  va.adjustment_reason AS adj_reason,
  va.applied_at AS adj_applied_at
FROM public.appeals a
LEFT JOIN public.appeal_status_changes asc_tbl ON asc_tbl.appeal_id = a.id
LEFT JOIN public.value_adjustments va ON va.parcel_id = a.parcel_id
  AND va.applied_at >= a.appeal_date::timestamptz
ORDER BY a.appeal_date DESC, asc_tbl.created_at DESC;

-- 5. Lineage summary view
CREATE OR REPLACE VIEW public.slco_lineage_summary AS
SELECT
  vl.parcel_id,
  vl.event_type,
  vl.source_module,
  vl.delta_amount,
  vl.delta_pct,
  vl.reason,
  vl.pipeline_stage,
  vl.source_system,
  vl.pipeline_version,
  vl.lineage_hash,
  vl.created_at,
  pm.parcel_id_normalized,
  pm.situs_address
FROM public.slco_value_lineage vl
LEFT JOIN public.slco_parcel_master pm ON pm.parcel_id_normalized = vl.parcel_id
ORDER BY vl.created_at DESC;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_slco_value_lineage_parcel ON public.slco_value_lineage(parcel_id);
CREATE INDEX IF NOT EXISTS idx_slco_value_lineage_created ON public.slco_value_lineage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slco_value_lineage_event ON public.slco_value_lineage(event_type);
CREATE INDEX IF NOT EXISTS idx_write_lane_violations_created ON public.write_lane_violations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slco_master_source ON public.slco_parcel_master(source_system);
CREATE INDEX IF NOT EXISTS idx_slco_master_lineage ON public.slco_parcel_master(lineage_hash);

-- 7. Append-only enforcement triggers
CREATE OR REPLACE FUNCTION public.enforce_append_only_lineage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'This table is append-only. Updates and deletes are prohibited.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_lineage_no_update ON public.slco_value_lineage;
CREATE TRIGGER trg_lineage_no_update
  BEFORE UPDATE OR DELETE ON public.slco_value_lineage
  FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only_lineage();

DROP TRIGGER IF EXISTS trg_violations_no_update ON public.write_lane_violations;
CREATE TRIGGER trg_violations_no_update
  BEFORE UPDATE OR DELETE ON public.write_lane_violations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only_lineage();