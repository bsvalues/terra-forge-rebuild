
-- Create the trace_events table (TerraTrace Event Spine)
CREATE TABLE public.trace_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  parcel_id uuid REFERENCES public.parcels(id),
  actor_id uuid NOT NULL DEFAULT auth.uid(),
  source_module text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid,
  causation_id uuid,
  artifact_type text,
  artifact_id uuid
);

-- Indexes for query patterns
CREATE INDEX idx_trace_events_parcel_time ON public.trace_events (parcel_id, created_at DESC);
CREATE INDEX idx_trace_events_county_time ON public.trace_events (county_id, created_at DESC);
CREATE INDEX idx_trace_events_correlation ON public.trace_events (correlation_id) WHERE correlation_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.trace_events ENABLE ROW LEVEL SECURITY;

-- Append-only: users can INSERT events for their county
CREATE POLICY "Users can insert trace events for their county"
  ON public.trace_events
  FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

-- Users can SELECT only their county's events
CREATE POLICY "Users can view trace events for their county"
  ON public.trace_events
  FOR SELECT
  USING (county_id = get_user_county_id());

-- No UPDATE or DELETE policies (append-only by design)

-- Enable realtime for live activity feeds
ALTER PUBLICATION supabase_realtime ADD TABLE public.trace_events;
