CREATE OR REPLACE FUNCTION public.trace_events_hash_chain()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_prev_hash text; v_seq bigint; v_payload text;
BEGIN
  v_seq := nextval('trace_events_seq');
  NEW.sequence_number := v_seq;
  SELECT event_hash INTO v_prev_hash FROM trace_events
  WHERE county_id = NEW.county_id ORDER BY sequence_number DESC LIMIT 1;
  NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS');
  -- parcel_id is text-cast so county-level events (no parcel) can be chained;
  -- identical output to the prior payload for events that carry a parcel.
  v_payload := v_seq::text || '|' || NEW.county_id::text || '|' || NEW.source_module || '|' ||
    NEW.event_type || '|' || COALESCE(NEW.parcel_id::text, '') || '|' ||
    COALESCE(NEW.event_data::text, '{}') || '|' || NEW.prev_hash;
  NEW.event_hash := encode(sha256(v_payload::bytea), 'hex');
  RETURN NEW;
END;
$function$;