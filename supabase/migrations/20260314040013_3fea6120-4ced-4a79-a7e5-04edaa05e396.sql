
-- Phase 28: Income Approach Engine

-- Income property data (rental income, expenses, etc.)
CREATE TABLE public.income_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id),
  parcel_id UUID NOT NULL REFERENCES public.parcels(id),
  gross_rental_income NUMERIC NOT NULL DEFAULT 0,
  vacancy_rate NUMERIC NOT NULL DEFAULT 0.05,
  operating_expenses NUMERIC NOT NULL DEFAULT 0,
  net_operating_income NUMERIC GENERATED ALWAYS AS (
    gross_rental_income * (1 - vacancy_rate) - operating_expenses
  ) STORED,
  cap_rate NUMERIC,
  grm NUMERIC,
  property_type TEXT NOT NULL DEFAULT 'commercial',
  income_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INT,
  notes TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parcel_id, income_year)
);

ALTER TABLE public.income_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own county income properties"
  ON public.income_properties FOR SELECT TO authenticated
  USING (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own county income properties"
  ON public.income_properties FOR INSERT TO authenticated
  WITH CHECK (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own county income properties"
  ON public.income_properties FOR UPDATE TO authenticated
  USING (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own county income properties"
  ON public.income_properties FOR DELETE TO authenticated
  USING (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

-- Batch income approach runs
CREATE TABLE public.income_approach_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id),
  neighborhood_code TEXT NOT NULL,
  parcels_processed INT NOT NULL DEFAULT 0,
  parcels_with_income INT NOT NULL DEFAULT 0,
  median_cap_rate NUMERIC,
  median_grm NUMERIC,
  median_ratio NUMERIC,
  cod NUMERIC,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.income_approach_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own county income runs"
  ON public.income_approach_runs FOR SELECT TO authenticated
  USING (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own county income runs"
  ON public.income_approach_runs FOR INSERT TO authenticated
  WITH CHECK (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own county income runs"
  ON public.income_approach_runs FOR UPDATE TO authenticated
  USING (county_id IN (SELECT county_id FROM public.profiles WHERE id = auth.uid()));
