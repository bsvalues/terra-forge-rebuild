
-- Phase 4: Model Receipts table
CREATE TABLE public.model_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID REFERENCES public.parcels(id),
  study_period_id UUID REFERENCES public.study_periods(id),
  operator_id UUID NOT NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'ratio_study',
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.model_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view model receipts"
  ON public.model_receipts FOR SELECT USING (true);

CREATE POLICY "Admins can insert model receipts"
  ON public.model_receipts FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can delete model receipts"
  ON public.model_receipts FOR DELETE USING (is_admin());

CREATE INDEX idx_model_receipts_parcel ON public.model_receipts(parcel_id);
CREATE INDEX idx_model_receipts_study_period ON public.model_receipts(study_period_id);

-- Appeals: add owner_email column
ALTER TABLE public.appeals ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- Appeal status change audit log
CREATE TABLE public.appeal_status_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appeal_id UUID NOT NULL REFERENCES public.appeals(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.appeal_status_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view appeal status changes"
  ON public.appeal_status_changes FOR SELECT USING (true);

CREATE POLICY "Admins can insert appeal status changes"
  ON public.appeal_status_changes FOR INSERT WITH CHECK (is_admin());

CREATE INDEX idx_appeal_status_changes_appeal ON public.appeal_status_changes(appeal_id);
CREATE INDEX idx_appeal_status_changes_date ON public.appeal_status_changes(created_at);
