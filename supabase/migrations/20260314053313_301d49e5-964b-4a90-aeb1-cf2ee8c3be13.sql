
-- Certification Events: immutable log of certification actions
CREATE TABLE public.certification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id),
  event_type TEXT NOT NULL DEFAULT 'neighborhood_certified',
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  neighborhood_code TEXT,
  parcels_certified INTEGER NOT NULL DEFAULT 0,
  parcels_created INTEGER NOT NULL DEFAULT 0,
  total_parcels INTEGER NOT NULL DEFAULT 0,
  readiness_score INTEGER,
  blocker_snapshot JSONB DEFAULT '{}'::jsonb,
  certified_by UUID NOT NULL DEFAULT auth.uid(),
  certified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Indexes
CREATE INDEX idx_cert_events_county ON public.certification_events(county_id);
CREATE INDEX idx_cert_events_type ON public.certification_events(event_type);
CREATE INDEX idx_cert_events_year ON public.certification_events(tax_year);

-- RLS
ALTER TABLE public.certification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read certification events"
  ON public.certification_events FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert certification events"
  ON public.certification_events FOR INSERT TO authenticated
  WITH CHECK (true);

-- Value lock trigger: prevent updates to certified assessments
CREATE OR REPLACE FUNCTION public.prevent_certified_assessment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.certified = true AND NEW.certified = true THEN
    -- Allow only if explicitly unlocking (certified -> false)
    IF NEW.land_value IS DISTINCT FROM OLD.land_value
       OR NEW.improvement_value IS DISTINCT FROM OLD.improvement_value
       OR NEW.total_value IS DISTINCT FROM OLD.total_value THEN
      RAISE EXCEPTION 'Cannot modify values on a certified assessment. Unlock (uncertify) first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assessment_value_lock
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_certified_assessment_update();
