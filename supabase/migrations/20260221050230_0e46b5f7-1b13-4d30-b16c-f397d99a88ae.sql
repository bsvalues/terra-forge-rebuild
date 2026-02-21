
-- Mission events table: records mission detections, completions, and fix packs
CREATE TABLE public.mission_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id uuid NOT NULL REFERENCES counties(id),
  mission_id text NOT NULL,
  event_type text NOT NULL DEFAULT 'detected',
  strategy text,
  affected_count integer DEFAULT 0,
  params jsonb DEFAULT '{}'::jsonb,
  receipt_id uuid,
  actor_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mission_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mission events in their county"
  ON public.mission_events FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert mission events in their county"
  ON public.mission_events FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE INDEX idx_mission_events_county_time ON public.mission_events (county_id, created_at DESC);

-- Fix Pack RPC: dry_run preview + commit for missions
CREATE OR REPLACE FUNCTION public.apply_mission_fix(
  p_mission_id text,
  p_strategy text,
  p_params jsonb DEFAULT '{}'::jsonb,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_county_id uuid;
  v_affected bigint := 0;
  v_current_year int := EXTRACT(year FROM CURRENT_DATE)::int;
  v_result jsonb;
  v_receipt_id uuid;
  v_warnings text[] := '{}';
BEGIN
  v_county_id := get_user_county_id();

  -- ── Impossible Year Built ──
  IF p_mission_id = 'impossible-year-built' THEN
    IF p_strategy = 'set_null_and_flag' THEN
      -- Count affected
      SELECT count(*) INTO v_affected
      FROM parcels WHERE county_id = v_county_id
        AND (
          (year_built IS NOT NULL AND year_built < 1700)
          OR (year_built IS NOT NULL AND year_built > v_current_year + 1)
        );

      IF NOT p_dry_run THEN
        UPDATE parcels SET year_built = NULL, updated_at = now()
        WHERE county_id = v_county_id
          AND (
            (year_built IS NOT NULL AND year_built < 1700)
            OR (year_built IS NOT NULL AND year_built > v_current_year + 1)
          );

        -- Emit trace event
        INSERT INTO trace_events (county_id, source_module, event_type, event_data)
        VALUES (v_county_id, 'mission-fix', 'mission_fix_applied', jsonb_build_object(
          'mission_id', p_mission_id, 'strategy', p_strategy, 'affected', v_affected
        )) RETURNING id INTO v_receipt_id;

        -- Emit mission event
        INSERT INTO mission_events (county_id, mission_id, event_type, strategy, affected_count, receipt_id)
        VALUES (v_county_id, p_mission_id, 'fix_applied', p_strategy, v_affected, v_receipt_id);
      END IF;

      v_result := jsonb_build_object(
        'dry_run', p_dry_run,
        'mission_id', p_mission_id,
        'strategy', p_strategy,
        'affected', v_affected,
        'description', 'Set ' || v_affected || ' impossible year_built values to NULL for manual review',
        'warnings', to_jsonb(v_warnings),
        'receipt_id', v_receipt_id
      );

    ELSIF p_strategy = 'clamp_with_reason' THEN
      SELECT count(*) INTO v_affected
      FROM parcels WHERE county_id = v_county_id
        AND year_built IS NOT NULL AND (year_built < 1700 OR year_built > v_current_year + 1);

      IF NOT p_dry_run THEN
        UPDATE parcels SET
          year_built = CASE
            WHEN year_built < 1700 THEN NULL
            WHEN year_built > v_current_year + 1 THEN v_current_year
            ELSE year_built
          END,
          updated_at = now()
        WHERE county_id = v_county_id
          AND year_built IS NOT NULL AND (year_built < 1700 OR year_built > v_current_year + 1);

        INSERT INTO trace_events (county_id, source_module, event_type, event_data)
        VALUES (v_county_id, 'mission-fix', 'mission_fix_applied', jsonb_build_object(
          'mission_id', p_mission_id, 'strategy', p_strategy, 'affected', v_affected
        )) RETURNING id INTO v_receipt_id;

        INSERT INTO mission_events (county_id, mission_id, event_type, strategy, affected_count, receipt_id)
        VALUES (v_county_id, p_mission_id, 'fix_applied', p_strategy, v_affected, v_receipt_id);
      END IF;

      v_warnings := ARRAY['Future years clamped to current year; pre-1700 set to NULL'];
      v_result := jsonb_build_object(
        'dry_run', p_dry_run,
        'mission_id', p_mission_id,
        'strategy', p_strategy,
        'affected', v_affected,
        'description', 'Clamped ' || v_affected || ' year_built values (future→current year, pre-1700→NULL)',
        'warnings', to_jsonb(v_warnings),
        'receipt_id', v_receipt_id
      );
    ELSE
      RETURN jsonb_build_object('error', 'Unknown strategy: ' || p_strategy);
    END IF;

  -- ── Missing Building Area ──
  ELSIF p_mission_id = 'missing-building-area' THEN
    IF p_strategy = 'create_measurement_tasks' THEN
      SELECT count(*) INTO v_affected
      FROM parcels WHERE county_id = v_county_id
        AND COALESCE(improvement_value, 0) > 0
        AND (building_area IS NULL OR building_area = 0);

      IF NOT p_dry_run THEN
        -- Create workflow tasks for each affected parcel
        INSERT INTO workflow_tasks (county_id, parcel_id, title, description, task_type, priority, workflow_type)
        SELECT v_county_id, p.id,
          'Measure building area — ' || p.parcel_number,
          'Parcel has $' || p.improvement_value::text || ' improvement value but no building area recorded.',
          'field_measurement', 'high', 'mission_fix'
        FROM parcels p
        WHERE p.county_id = v_county_id
          AND COALESCE(p.improvement_value, 0) > 0
          AND (p.building_area IS NULL OR p.building_area = 0)
        ON CONFLICT DO NOTHING;

        INSERT INTO trace_events (county_id, source_module, event_type, event_data)
        VALUES (v_county_id, 'mission-fix', 'mission_fix_applied', jsonb_build_object(
          'mission_id', p_mission_id, 'strategy', p_strategy, 'affected', v_affected,
          'tasks_created', v_affected
        )) RETURNING id INTO v_receipt_id;

        INSERT INTO mission_events (county_id, mission_id, event_type, strategy, affected_count, receipt_id)
        VALUES (v_county_id, p_mission_id, 'fix_applied', p_strategy, v_affected, v_receipt_id);
      END IF;

      v_result := jsonb_build_object(
        'dry_run', p_dry_run,
        'mission_id', p_mission_id,
        'strategy', p_strategy,
        'affected', v_affected,
        'description', 'Create ' || v_affected || ' field measurement tasks for parcels missing building area',
        'warnings', to_jsonb(v_warnings),
        'receipt_id', v_receipt_id
      );
    ELSE
      RETURN jsonb_build_object('error', 'Unknown strategy: ' || p_strategy);
    END IF;

  ELSE
    RETURN jsonb_build_object('error', 'Fix packs not available for mission: ' || p_mission_id);
  END IF;

  RETURN v_result;
END;
$function$;
