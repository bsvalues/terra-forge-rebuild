-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create table to track scheduled job configurations
CREATE TABLE public.scheduled_scrapes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cron_expression TEXT NOT NULL DEFAULT '0 2 * * *', -- Default: 2 AM daily
  counties JSONB NOT NULL DEFAULT '[]'::jsonb,
  batch_size INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  cron_job_id BIGINT, -- Reference to pg_cron job
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_scrapes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view scheduled scrapes"
  ON public.scheduled_scrapes FOR SELECT USING (true);

CREATE POLICY "Admins can manage scheduled scrapes"
  ON public.scheduled_scrapes FOR ALL USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_scrapes_updated_at
  BEFORE UPDATE ON public.scheduled_scrapes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();