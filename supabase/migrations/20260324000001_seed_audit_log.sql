-- TerraFusion OS — Seed Audit Log (Phase 193)
-- Tracks every county seeder run: county, source, rows upserted, duration.
-- Write-lane: Python seed scripts (via direct insert); read by IngestAuditLog UI.

CREATE TABLE IF NOT EXISTS seed_audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  county_slug   text        NOT NULL,                          -- e.g. "franklin"
  source        text        NOT NULL,                          -- e.g. "arcgis_open_data", "wa_dnr", "pacs_direct"
  vendor        text,                                          -- e.g. "aumentum_t2"
  layer_name    text,                                          -- ArcGIS layer name if applicable
  rows_fetched  integer     NOT NULL DEFAULT 0,
  rows_upserted integer     NOT NULL DEFAULT 0,
  rows_skipped  integer     NOT NULL DEFAULT 0,
  coverage_pct  numeric(5,1),
  dry_run       boolean     NOT NULL DEFAULT false,
  success       boolean     NOT NULL DEFAULT true,
  error_msg     text,
  duration_ms   integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for the most common queries
CREATE INDEX IF NOT EXISTS idx_seed_audit_log_county_slug ON seed_audit_log (county_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seed_audit_log_created_at  ON seed_audit_log (created_at DESC);

-- RLS: authenticated users can read; service role writes
ALTER TABLE seed_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seed_audit_log: authenticated read"
  ON seed_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role (used by seed scripts) bypasses RLS by default.
-- Comments: add an insert policy here if web-based seeding is ever added.
