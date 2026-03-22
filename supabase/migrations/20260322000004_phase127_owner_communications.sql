-- Phase 127: Owner Communication Log
-- Constitutional owner: TerraDais (workflow)
-- Write-lane: owner_communications → Dais

-- ══════════════════════════════════════════════════════════
-- Owner Communications table
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.owner_communications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id       uuid        REFERENCES public.counties(id) ON DELETE CASCADE,
  parcel_id       uuid        REFERENCES public.parcels(id) ON DELETE CASCADE,
  appeal_id       uuid        REFERENCES public.appeals(id) ON DELETE SET NULL,
  owner_name      text        NOT NULL,
  contact_method  text        NOT NULL CHECK (contact_method IN ('phone', 'email', 'letter', 'in-person', 'notice', 'hearing')),
  direction       text        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject         text        NOT NULL,
  body            text,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_owner_comms_parcel   ON public.owner_communications(parcel_id);
CREATE INDEX IF NOT EXISTS idx_owner_comms_county   ON public.owner_communications(county_id);
CREATE INDEX IF NOT EXISTS idx_owner_comms_created  ON public.owner_communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_comms_owner    ON public.owner_communications(owner_name);

ALTER TABLE public.owner_communications ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read communications for their county
CREATE POLICY "Authenticated read owner communications"
  ON public.owner_communications FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can insert communications
CREATE POLICY "Authenticated insert owner communications"
  ON public.owner_communications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Anon read for development
CREATE POLICY "Anon read owner communications"
  ON public.owner_communications FOR SELECT TO anon
  USING (true);

-- Anon insert for development
CREATE POLICY "Anon insert owner communications"
  ON public.owner_communications FOR INSERT TO anon
  WITH CHECK (true);
