
-- Workflow tasks table for TerraPilot Pilot-mode tools: assign_task, create_workflow, escalate_task
CREATE TABLE public.workflow_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  parcel_id UUID REFERENCES public.parcels(id),
  assigned_to UUID,
  assigned_by UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  due_date DATE,
  escalated_to UUID,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  workflow_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view tasks in their county"
  ON public.workflow_tasks FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can create tasks in their county"
  ON public.workflow_tasks FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update tasks in their county"
  ON public.workflow_tasks FOR UPDATE
  USING (county_id = get_user_county_id());

CREATE POLICY "Admins can delete tasks"
  ON public.workflow_tasks FOR DELETE
  USING (is_admin());

-- Timestamp trigger
CREATE TRIGGER update_workflow_tasks_updated_at
  BEFORE UPDATE ON public.workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_workflow_tasks_county ON public.workflow_tasks(county_id);
CREATE INDEX idx_workflow_tasks_status ON public.workflow_tasks(status);
CREATE INDEX idx_workflow_tasks_assigned ON public.workflow_tasks(assigned_to);
CREATE INDEX idx_workflow_tasks_parcel ON public.workflow_tasks(parcel_id);
