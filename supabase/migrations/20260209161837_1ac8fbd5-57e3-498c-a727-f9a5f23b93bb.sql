
-- Storage bucket for uploaded data files
INSERT INTO storage.buckets (id, name, public) VALUES ('data-imports', 'data-imports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for data-imports bucket: authenticated users can upload
CREATE POLICY "Authenticated users can upload data files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'data-imports');

CREATE POLICY "Authenticated users can read their data files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'data-imports');

-- Ingest jobs tracking table
CREATE TABLE public.ingest_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id UUID NOT NULL REFERENCES public.counties(id),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  target_table TEXT NOT NULL CHECK (target_table IN ('parcels', 'sales', 'assessments')),
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'mapping', 'validating', 'previewing', 'publishing', 'complete', 'failed')),
  column_mapping JSONB DEFAULT '{}'::jsonb,
  validation_results JSONB DEFAULT '{}'::jsonb,
  row_count INTEGER,
  rows_imported INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  sha256_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ingest_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ingest jobs for their county"
ON public.ingest_jobs FOR SELECT TO authenticated
USING (county_id = public.get_user_county_id());

CREATE POLICY "Users can create ingest jobs for their county"
ON public.ingest_jobs FOR INSERT TO authenticated
WITH CHECK (county_id = public.get_user_county_id());

CREATE POLICY "Users can update ingest jobs for their county"
ON public.ingest_jobs FOR UPDATE TO authenticated
USING (county_id = public.get_user_county_id());

CREATE TRIGGER update_ingest_jobs_updated_at
BEFORE UPDATE ON public.ingest_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ingest_jobs_county ON public.ingest_jobs(county_id);
CREATE INDEX idx_ingest_jobs_status ON public.ingest_jobs(status);
