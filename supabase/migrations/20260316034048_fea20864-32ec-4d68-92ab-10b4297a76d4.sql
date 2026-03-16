
-- Phase 51: Data Validation Rules Engine
CREATE TABLE public.validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES public.counties(id) NOT NULL DEFAULT (auth.jwt() ->> 'county_id')::uuid,
  name TEXT NOT NULL,
  description TEXT,
  target_field TEXT NOT NULL,
  operator TEXT NOT NULL DEFAULT 'not_null',
  threshold_value TEXT,
  severity TEXT NOT NULL DEFAULT 'warning',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_pass_count INTEGER DEFAULT 0,
  last_run_fail_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validation rules" ON public.validation_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create validation rules" ON public.validation_rules
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own validation rules" ON public.validation_rules
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own validation rules" ON public.validation_rules
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE INDEX idx_validation_rules_active ON public.validation_rules(is_active, severity);
