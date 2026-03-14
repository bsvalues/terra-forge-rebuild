
-- Phase 34: Batch Notice Jobs table
CREATE TABLE public.batch_notice_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  neighborhood_code text,
  property_class text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_parcels integer NOT NULL DEFAULT 0,
  notices_generated integer NOT NULL DEFAULT 0,
  notices_failed integer NOT NULL DEFAULT 0,
  ai_drafted_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  calibration_run_id uuid REFERENCES public.calibration_runs(id),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_batch_notice_jobs_county ON public.batch_notice_jobs(county_id);
CREATE INDEX idx_batch_notice_jobs_status ON public.batch_notice_jobs(status);

-- RLS
ALTER TABLE public.batch_notice_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view batch jobs in their county"
  ON public.batch_notice_jobs FOR SELECT TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can create batch jobs in their county"
  ON public.batch_notice_jobs FOR INSERT TO authenticated
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update batch jobs in their county"
  ON public.batch_notice_jobs FOR UPDATE TO authenticated
  USING (county_id = get_user_county_id());

-- Add batch_job_id to notices table for linking
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS batch_job_id uuid REFERENCES public.batch_notice_jobs(id);
CREATE INDEX IF NOT EXISTS idx_notices_batch_job ON public.notices(batch_job_id);
