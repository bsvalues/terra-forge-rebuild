
-- Scheduled tasks: recurring automation definitions
CREATE TABLE public.scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid REFERENCES public.counties(id),
  name text NOT NULL,
  description text,
  task_type text NOT NULL DEFAULT 'report',
  task_config jsonb NOT NULL DEFAULT '{}',
  frequency text NOT NULL DEFAULT 'weekly',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_run_status text,
  last_run_summary jsonb,
  run_count integer NOT NULL DEFAULT 0,
  created_by text NOT NULL DEFAULT auth.uid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scheduled tasks"
  ON public.scheduled_tasks FOR SELECT TO authenticated
  USING (created_by = auth.uid()::text);

CREATE POLICY "Users can create scheduled tasks"
  ON public.scheduled_tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can update own scheduled tasks"
  ON public.scheduled_tasks FOR UPDATE TO authenticated
  USING (created_by = auth.uid()::text);

CREATE POLICY "Users can delete own scheduled tasks"
  ON public.scheduled_tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid()::text);
