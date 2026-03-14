
-- Phase 26: Segment Definitions table for persistent market segments
CREATE TABLE public.segment_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id),
  name TEXT NOT NULL,
  description TEXT,
  factor TEXT NOT NULL, -- e.g. 'building_area', 'neighborhood_code', 'year_built'
  ranges JSONB NOT NULL DEFAULT '[]', -- array of {label, min, max}
  importance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'manual', -- 'manual', 'cluster', 'suggestion'
  cluster_id INTEGER, -- reference to clustering result if from auto-segment
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_segment_definitions_county ON public.segment_definitions(county_id);
CREATE INDEX idx_segment_definitions_factor ON public.segment_definitions(factor);

-- RLS
ALTER TABLE public.segment_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view segment definitions for their county"
  ON public.segment_definitions FOR SELECT TO authenticated
  USING (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert segment definitions for their county"
  ON public.segment_definitions FOR INSERT TO authenticated
  WITH CHECK (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their county segment definitions"
  ON public.segment_definitions FOR UPDATE TO authenticated
  USING (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their county segment definitions"
  ON public.segment_definitions FOR DELETE TO authenticated
  USING (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

-- Segment calibration runs: links a calibration run to a specific segment
CREATE TABLE public.segment_calibration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES public.segment_definitions(id) ON DELETE CASCADE,
  calibration_run_id UUID REFERENCES public.calibration_runs(id),
  county_id UUID NOT NULL REFERENCES public.counties(id),
  r_squared NUMERIC,
  cod NUMERIC,
  prd NUMERIC,
  median_ratio NUMERIC,
  sample_size INTEGER DEFAULT 0,
  parcel_ids UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.segment_calibration_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view segment calibration runs"
  ON public.segment_calibration_runs FOR SELECT TO authenticated
  USING (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert segment calibration runs"
  ON public.segment_calibration_runs FOR INSERT TO authenticated
  WITH CHECK (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));
