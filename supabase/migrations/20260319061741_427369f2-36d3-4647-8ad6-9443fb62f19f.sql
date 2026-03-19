
-- Phase 81: TerraTrace Hash-Chain Integrity Extension
-- Adds cryptographic hash-chain columns and verification functions

-- 1. Add hash-chain columns to trace_events
ALTER TABLE public.trace_events
  ADD COLUMN IF NOT EXISTS sequence_number bigint,
  ADD COLUMN IF NOT EXISTS event_hash text,
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS redacted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS redacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS agent_id text;

-- 2. Sequence for monotonic ordering
CREATE SEQUENCE IF NOT EXISTS trace_events_seq;

-- 3. Index on hash-chain columns
CREATE INDEX IF NOT EXISTS idx_trace_events_sequence ON public.trace_events (sequence_number);
CREATE INDEX IF NOT EXISTS idx_trace_events_hash ON public.trace_events (event_hash) WHERE event_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trace_events_agent ON public.trace_events (agent_id) WHERE agent_id IS NOT NULL;

-- 4. Trigger function: auto-compute hash chain on INSERT
CREATE OR REPLACE FUNCTION public.trace_events_hash_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_hash text;
  v_seq bigint;
  v_payload text;
BEGIN
  -- Get next sequence number
  v_seq := nextval('trace_events_seq');
  NEW.sequence_number := v_seq;

  -- Get previous event hash (within same county for partition locality)
  SELECT event_hash INTO v_prev_hash
  FROM trace_events
  WHERE county_id = NEW.county_id
  ORDER BY sequence_number DESC
  LIMIT 1;

  NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS');

  -- Build deterministic payload for hashing
  v_payload := v_seq::text || '|' ||
    NEW.county_id || '|' ||
    NEW.source_module || '|' ||
    NEW.event_type || '|' ||
    COALESCE(NEW.parcel_id, '') || '|' ||
    COALESCE(NEW.event_data::text, '{}') || '|' ||
    COALESCE(NEW.prev_hash, 'GENESIS');

  NEW.event_hash := encode(sha256(v_payload::bytea), 'hex');

  RETURN NEW;
END;
$$;

-- 5. Attach trigger (BEFORE INSERT)
DROP TRIGGER IF EXISTS trg_trace_hash_chain ON public.trace_events;
CREATE TRIGGER trg_trace_hash_chain
  BEFORE INSERT ON public.trace_events
  FOR EACH ROW
  EXECUTE FUNCTION trace_events_hash_chain();

-- 6. Block UPDATE and DELETE on trace_events (append-only immutability)
CREATE OR REPLACE FUNCTION public.trace_events_immutable_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow redaction updates only (setting redacted = true, clearing event_data)
  IF TG_OP = 'UPDATE' THEN
    IF NEW.redacted = true AND OLD.redacted = false THEN
      -- Redaction: preserve shell, clear PII
      NEW.event_data := '{"REDACTED": true}'::jsonb;
      NEW.redacted_at := now();
      -- Preserve all hash-chain fields unchanged
      NEW.event_hash := OLD.event_hash;
      NEW.prev_hash := OLD.prev_hash;
      NEW.sequence_number := OLD.sequence_number;
      NEW.created_at := OLD.created_at;
      NEW.county_id := OLD.county_id;
      NEW.source_module := OLD.source_module;
      NEW.event_type := OLD.event_type;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'trace_events is append-only. Only redaction updates are permitted.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'trace_events is append-only. DELETE is forbidden.';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_trace_immutable ON public.trace_events;
CREATE TRIGGER trg_trace_immutable
  BEFORE UPDATE OR DELETE ON public.trace_events
  FOR EACH ROW
  EXECUTE FUNCTION trace_events_immutable_guard();

-- 7. Chain verification function (RPC-callable)
CREATE OR REPLACE FUNCTION public.verify_trace_chain(
  p_county_id uuid,
  p_limit int DEFAULT 100
)
RETURNS TABLE(
  total_checked int,
  chain_valid boolean,
  first_broken_sequence bigint,
  first_broken_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_expected_prev text := 'GENESIS';
  v_checked int := 0;
  v_valid boolean := true;
  v_broken_seq bigint := NULL;
  v_broken_id uuid := NULL;
BEGIN
  FOR v_row IN
    SELECT te.id, te.sequence_number, te.event_hash, te.prev_hash
    FROM trace_events te
    WHERE te.county_id = p_county_id
      AND te.event_hash IS NOT NULL
    ORDER BY te.sequence_number ASC
    LIMIT p_limit
  LOOP
    v_checked := v_checked + 1;
    IF v_row.prev_hash IS DISTINCT FROM v_expected_prev THEN
      v_valid := false;
      v_broken_seq := v_row.sequence_number;
      v_broken_id := v_row.id;
      EXIT;
    END IF;
    v_expected_prev := v_row.event_hash;
  END LOOP;

  RETURN QUERY SELECT v_checked, v_valid, v_broken_seq, v_broken_id;
END;
$$;

-- 8. Redaction function (admin-only via RPC)
CREATE OR REPLACE FUNCTION public.redact_trace_event(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can redact trace events';
  END IF;

  UPDATE trace_events
  SET redacted = true
  WHERE id = p_event_id AND redacted = false;

  RETURN FOUND;
END;
$$;
