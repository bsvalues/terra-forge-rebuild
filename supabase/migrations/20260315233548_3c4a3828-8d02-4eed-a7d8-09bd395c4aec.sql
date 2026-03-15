
-- Report templates: reusable report definitions
CREATE TABLE public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid REFERENCES public.counties(id),
  name text NOT NULL,
  description text,
  report_type text NOT NULL DEFAULT 'summary',
  template_config jsonb NOT NULL DEFAULT '{}',
  dataset text NOT NULL DEFAULT 'parcels',
  is_system boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT auth.uid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read report templates"
  ON public.report_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create report templates"
  ON public.report_templates FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can update own templates"
  ON public.report_templates FOR UPDATE TO authenticated
  USING (created_by = auth.uid()::text AND is_system = false);

CREATE POLICY "Users can delete own templates"
  ON public.report_templates FOR DELETE TO authenticated
  USING (created_by = auth.uid()::text AND is_system = false);

-- Report runs: execution history
CREATE TABLE public.report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.report_templates(id) ON DELETE SET NULL,
  county_id uuid REFERENCES public.counties(id),
  report_name text NOT NULL,
  report_type text NOT NULL DEFAULT 'summary',
  parameters jsonb NOT NULL DEFAULT '{}',
  result_summary jsonb,
  row_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  executed_by text NOT NULL DEFAULT auth.uid()::text,
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own report runs"
  ON public.report_runs FOR SELECT TO authenticated
  USING (executed_by = auth.uid()::text);

CREATE POLICY "Users can create report runs"
  ON public.report_runs FOR INSERT TO authenticated
  WITH CHECK (executed_by = auth.uid()::text);

-- Seed system report templates
INSERT INTO public.report_templates (name, description, report_type, dataset, template_config, is_system, created_by) VALUES
  ('Roll Summary', 'Total assessed values by property class with year-over-year change', 'roll_summary', 'assessments', '{"groupBy": "property_class", "metrics": ["total_value", "count", "avg_value"]}', true, '00000000-0000-0000-0000-000000000000'),
  ('Neighborhood Comparison', 'Compare key metrics across neighborhoods', 'neighborhood_comparison', 'parcels', '{"groupBy": "neighborhood_code", "metrics": ["count", "avg_value", "median_value"]}', true, '00000000-0000-0000-0000-000000000000'),
  ('Ratio Study Report', 'Assessment ratio analysis by value tier', 'ratio_study', 'assessment_ratios', '{"groupBy": "value_tier", "metrics": ["median_ratio", "cod", "prd"]}', true, '00000000-0000-0000-0000-000000000000'),
  ('Appeals Activity', 'Appeals filed, resolved, and pending by status', 'appeals_activity', 'appeals', '{"groupBy": "status", "metrics": ["count", "avg_original_value", "avg_final_value"]}', true, '00000000-0000-0000-0000-000000000000'),
  ('Exemption Summary', 'Active exemptions by type and dollar impact', 'exemption_summary', 'exemptions', '{"groupBy": "exemption_type", "metrics": ["count", "total_amount"]}', true, '00000000-0000-0000-0000-000000000000'),
  ('Sales Analysis', 'Recent sales volume and price trends', 'sales_analysis', 'sales', '{"groupBy": "property_class", "metrics": ["count", "avg_price", "median_price"]}', true, '00000000-0000-0000-0000-000000000000');
