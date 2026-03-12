
-- GIS Ingest Job state machine + append-only event log
-- Governance backbone for resumable polygon ingestion

CREATE TABLE public.gis_ingest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  dataset text NOT NULL,
  feature_server_url text NOT NULL,
  parcel_id_field text NOT NULL DEFAULT 'Parcel_ID',
  page_size integer NOT NULL DEFAULT 2000,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'paused', 'failed', 'complete')),
  cursor_offset integer NOT NULL DEFAULT 0,
  total_fetched integer NOT NULL DEFAULT 0,
  total_upserted integer NOT NULL DEFAULT 0,
  total_matched integer NOT NULL DEFAULT 0,
  pages_processed integer NOT NULL DEFAULT 0,
  last_error text,
  layer_id uuid REFERENCES public.gis_layers(id),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  started_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gis_ingest_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ingest jobs"
  ON public.gis_ingest_jobs FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users can view ingest jobs in their county"
  ON public.gis_ingest_jobs FOR SELECT
  USING (county_id = get_user_county_id());

CREATE INDEX idx_gis_ingest_jobs_county_status ON public.gis_ingest_jobs(county_id, status);

-- Append-only event log (TerraTrace pattern)
CREATE TABLE public.gis_ingest_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.gis_ingest_jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('start', 'page_ok', 'page_fail', 'pause', 'resume', 'complete', 'error')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gis_ingest_job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ingest events in their county"
  ON public.gis_ingest_job_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.gis_ingest_jobs j
    WHERE j.id = gis_ingest_job_events.job_id
    AND j.county_id = get_user_county_id()
  ));

CREATE POLICY "Admins can insert ingest events"
  ON public.gis_ingest_job_events FOR INSERT
  WITH CHECK (is_admin());

CREATE INDEX idx_gis_ingest_events_job ON public.gis_ingest_job_events(job_id, created_at);

-- Enable realtime for live progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.gis_ingest_jobs;
