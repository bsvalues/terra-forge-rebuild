
-- Saved Filters & Smart Views table
CREATE TABLE public.saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  county_id UUID REFERENCES public.counties(id) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  description TEXT,
  target_dataset TEXT NOT NULL DEFAULT 'parcels',
  filter_config JSONB NOT NULL DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,
  result_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved filters
CREATE POLICY "Users can view own saved filters"
  ON public.saved_filters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own saved filters"
  ON public.saved_filters FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own saved filters"
  ON public.saved_filters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saved filters"
  ON public.saved_filters FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for fast user lookup
CREATE INDEX idx_saved_filters_user ON public.saved_filters(user_id, is_pinned DESC, updated_at DESC);
