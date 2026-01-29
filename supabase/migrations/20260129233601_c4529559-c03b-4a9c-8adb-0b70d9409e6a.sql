-- Scrape Jobs Table for background job tracking
CREATE TABLE public.scrape_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL DEFAULT 'statewide', -- 'statewide', 'region', 'county', 'scheduled'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  counties JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of county names to process
  current_county TEXT, -- Currently processing county
  counties_completed INTEGER NOT NULL DEFAULT 0,
  counties_total INTEGER NOT NULL DEFAULT 0,
  parcels_enriched INTEGER NOT NULL DEFAULT 0,
  sales_added INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of error objects
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Anyone can view scrape jobs
CREATE POLICY "Anyone can view scrape jobs"
  ON public.scrape_jobs FOR SELECT
  USING (true);

-- Admins can manage scrape jobs
CREATE POLICY "Admins can manage scrape jobs"
  ON public.scrape_jobs FOR ALL
  USING (is_admin());

-- Update trigger for updated_at
CREATE TRIGGER update_scrape_jobs_updated_at
  BEFORE UPDATE ON public.scrape_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.scrape_jobs;

-- Index for active jobs
CREATE INDEX idx_scrape_jobs_status ON public.scrape_jobs(status);
CREATE INDEX idx_scrape_jobs_created_at ON public.scrape_jobs(created_at DESC);