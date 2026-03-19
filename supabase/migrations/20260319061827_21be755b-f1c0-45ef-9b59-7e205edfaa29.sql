
-- Phase 82: Workflow Templates & Instances Schema

-- 1. Workflow template definitions
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  trigger_type text NOT NULL DEFAULT 'manual',
  trigger_config jsonb NOT NULL DEFAULT '{}',
  steps jsonb NOT NULL DEFAULT '[]',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow templates for their county"
  ON public.workflow_templates FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Admins can manage workflow templates"
  ON public.workflow_templates FOR ALL
  TO authenticated
  USING (county_id = get_user_county_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (county_id = get_user_county_id() AND public.has_role(auth.uid(), 'admin'));

-- 2. Workflow instances (running workflows)
CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workflow_templates(id),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  parcel_id uuid REFERENCES public.parcels(id),
  current_step int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  step_results jsonb NOT NULL DEFAULT '[]',
  started_by uuid NOT NULL DEFAULT auth.uid(),
  assigned_to uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  context jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow instances for their county"
  ON public.workflow_instances FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can create workflow instances for their county"
  ON public.workflow_instances FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update workflow instances for their county"
  ON public.workflow_instances FOR UPDATE
  USING (county_id = get_user_county_id());

-- Indexes
CREATE INDEX idx_workflow_templates_county ON public.workflow_templates (county_id);
CREATE INDEX idx_workflow_instances_county_status ON public.workflow_instances (county_id, status);
CREATE INDEX idx_workflow_instances_template ON public.workflow_instances (template_id);
CREATE INDEX idx_workflow_instances_parcel ON public.workflow_instances (parcel_id) WHERE parcel_id IS NOT NULL;
