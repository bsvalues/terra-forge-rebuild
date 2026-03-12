
ALTER TABLE public.gis_ingest_jobs
  ADD COLUMN IF NOT EXISTS cursor_type text NOT NULL DEFAULT 'objectid';

COMMENT ON COLUMN public.gis_ingest_jobs.cursor_type IS 'Paging strategy: objectid (OBJECTID > lastSeen) or offset (resultOffset). Default objectid. Do NOT change without updating edge function logic.';
COMMENT ON COLUMN public.gis_ingest_jobs.cursor_offset IS 'Stores the last-seen OBJECTID when cursor_type=objectid, or row offset when cursor_type=offset.';
