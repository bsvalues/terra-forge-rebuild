
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE NOT NULL,
  county_id UUID REFERENCES public.counties(id) NOT NULL,
  notice_type TEXT NOT NULL DEFAULT 'assessment_change',
  recipient_name TEXT,
  recipient_address TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  ai_drafted BOOLEAN NOT NULL DEFAULT false,
  calibration_run_id UUID,
  metadata JSONB DEFAULT '{}',
  generated_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notices"
  ON public.notices FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert notices"
  ON public.notices FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update notices"
  ON public.notices FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_notices_parcel ON public.notices(parcel_id);
CREATE INDEX idx_notices_status ON public.notices(status);
CREATE INDEX idx_notices_county ON public.notices(county_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;
