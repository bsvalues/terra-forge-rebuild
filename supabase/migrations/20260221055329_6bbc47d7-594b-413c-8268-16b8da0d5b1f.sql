
-- Performance indexes for County Twin Timeline source tables
-- These keep the get_county_timeline() RPC fast at scale (1M+ events)

CREATE INDEX IF NOT EXISTS idx_pipeline_events_county_time
  ON pipeline_events (county_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_mission_events_county_time
  ON mission_events (county_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trace_events_county_time
  ON trace_events (county_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calibration_runs_county_time
  ON calibration_runs (county_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_receipts_time
  ON model_receipts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_receipts_operator_time
  ON model_receipts (operator_id, created_at DESC);
