
-- ============================================================
-- County Twin Timeline: get_county_timeline() RPC
-- Unions pipeline_events, mission_events, trace_events,
-- calibration_runs, and model_receipts into a single
-- paginated, filterable timeline.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_county_timeline(
  p_from timestamptz DEFAULT now() - interval '7 days',
  p_to   timestamptz DEFAULT now(),
  p_types text[]     DEFAULT NULL,
  p_search text      DEFAULT NULL,
  p_limit  int       DEFAULT 100,
  p_offset int       DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_county_id uuid;
  v_rows jsonb;
  v_total bigint;
BEGIN
  v_county_id := get_user_county_id();

  WITH unified AS (
    -- Pipeline events → ingest
    SELECT
      pe.id,
      pe.started_at AS event_time,
      'ingest'::text AS event_type,
      pe.stage AS subtype,
      CASE pe.stage
        WHEN 'ingest_received' THEN 'File received: ' || COALESCE((pe.details->>'file_name')::text, 'unknown')
        WHEN 'ingest_parsed'   THEN 'File parsed'
        WHEN 'ingest_loaded'   THEN 'Data loaded'
        WHEN 'quality_scored'  THEN 'Quality scored'
        WHEN 'models_rerun'    THEN 'Models re-run'
        WHEN 'readiness_updated' THEN 'Readiness updated'
        ELSE initcap(replace(pe.stage, '_', ' '))
      END AS title,
      CASE
        WHEN pe.rows_affected IS NOT NULL THEN pe.rows_affected || ' rows • ' || pe.status
        ELSE pe.status
      END AS summary,
      'System'::text AS actor,
      jsonb_build_object('ingest_job_id', pe.ingest_job_id, 'artifact_ref', pe.artifact_ref) AS links,
      ARRAY['pipeline']::text[] AS sources,
      NULL::text AS confidence,
      NULL::text AS confidence_reason,
      pe.details AS metadata,
      CASE pe.status WHEN 'failed' THEN 'critical' WHEN 'warning' THEN 'warn' ELSE 'info' END AS severity
    FROM pipeline_events pe
    WHERE pe.county_id = v_county_id
      AND pe.started_at BETWEEN p_from AND p_to

    UNION ALL

    -- Mission events → mission / fix
    SELECT
      me.id,
      me.created_at AS event_time,
      CASE me.event_type
        WHEN 'fix_applied' THEN 'fix'
        ELSE 'mission'
      END AS event_type,
      me.event_type AS subtype,
      CASE me.event_type
        WHEN 'fix_applied' THEN 'Fix applied: ' || replace(me.mission_id, '-', ' ')
        WHEN 'detected'    THEN 'Mission detected: ' || replace(me.mission_id, '-', ' ')
        ELSE initcap(replace(me.event_type, '_', ' ')) || ': ' || replace(me.mission_id, '-', ' ')
      END AS title,
      CASE
        WHEN me.affected_count IS NOT NULL THEN me.affected_count || ' parcels affected'
        ELSE me.strategy
      END AS summary,
      COALESCE(me.actor_id::text, 'System') AS actor,
      jsonb_build_object('mission_id', me.mission_id, 'receipt_id', me.receipt_id) AS links,
      ARRAY['missions']::text[] AS sources,
      NULL::text AS confidence,
      NULL::text AS confidence_reason,
      me.params AS metadata,
      'info'::text AS severity
    FROM mission_events me
    WHERE me.county_id = v_county_id
      AND me.created_at BETWEEN p_from AND p_to

    UNION ALL

    -- Trace events → workflow / system
    SELECT
      te.id,
      te.created_at AS event_time,
      'workflow'::text AS event_type,
      te.event_type AS subtype,
      initcap(replace(te.event_type, '_', ' ')) AS title,
      CASE
        WHEN te.event_data ? 'reason' THEN (te.event_data->>'reason')
        WHEN te.event_data ? 'newStatus' THEN 'Status → ' || (te.event_data->>'newStatus')
        ELSE te.source_module || ' action'
      END AS summary,
      COALESCE(te.actor_id::text, 'System') AS actor,
      jsonb_build_object('trace_id', te.id, 'parcel_id', te.parcel_id, 'artifact_id', te.artifact_id) AS links,
      ARRAY[te.source_module]::text[] AS sources,
      NULL::text AS confidence,
      NULL::text AS confidence_reason,
      te.event_data AS metadata,
      'info'::text AS severity
    FROM trace_events te
    WHERE te.county_id = v_county_id
      AND te.created_at BETWEEN p_from AND p_to
      -- Exclude mission-fix trace events (already in mission_events)
      AND te.event_type != 'mission_fix_applied'

    UNION ALL

    -- Calibration runs → model
    SELECT
      cr.id,
      cr.created_at AS event_time,
      'model'::text AS event_type,
      'calibration_run' AS subtype,
      'Calibration: ' || cr.neighborhood_code || ' (' || cr.model_type || ')' AS title,
      'R²=' || COALESCE(round(cr.r_squared::numeric, 4)::text, '—') ||
        ' • RMSE=' || COALESCE(round(cr.rmse::numeric, 0)::text, '—') ||
        ' • n=' || COALESCE(cr.sample_size::text, '—') AS summary,
      COALESCE(cr.created_by::text, 'System') AS actor,
      jsonb_build_object('run_id', cr.id, 'neighborhood', cr.neighborhood_code) AS links,
      ARRAY['calibration']::text[] AS sources,
      NULL::text AS confidence,
      NULL::text AS confidence_reason,
      jsonb_build_object('status', cr.status, 'variables', cr.variables) AS metadata,
      CASE cr.status WHEN 'failed' THEN 'critical' WHEN 'draft' THEN 'warn' ELSE 'info' END AS severity
    FROM calibration_runs cr
    WHERE cr.county_id = v_county_id
      AND cr.created_at BETWEEN p_from AND p_to

    UNION ALL

    -- Model receipts → model
    SELECT
      mr.id,
      mr.created_at AS event_time,
      'model'::text AS event_type,
      'model_receipt' AS subtype,
      'Model run: ' || mr.model_type || ' v' || mr.model_version AS title,
      CASE
        WHEN mr.parcel_id IS NOT NULL THEN 'Parcel-level run'
        ELSE 'Study-level run'
      END AS summary,
      COALESCE(mr.operator_id::text, 'System') AS actor,
      jsonb_build_object('receipt_id', mr.id, 'parcel_id', mr.parcel_id) AS links,
      ARRAY['models']::text[] AS sources,
      NULL::text AS confidence,
      NULL::text AS confidence_reason,
      jsonb_build_object('inputs_keys', (SELECT jsonb_agg(k) FROM jsonb_object_keys(mr.inputs) k), 'outputs_keys', (SELECT jsonb_agg(k) FROM jsonb_object_keys(mr.outputs) k)) AS metadata,
      'info'::text AS severity
    FROM model_receipts mr
    WHERE mr.created_at BETWEEN p_from AND p_to
      AND (mr.operator_id = auth.uid() OR mr.parcel_id IS NOT NULL)
  ),
  filtered AS (
    SELECT * FROM unified u
    WHERE (p_types IS NULL OR u.event_type = ANY(p_types))
      AND (p_search IS NULL OR p_search = '' OR
           u.title ILIKE '%' || p_search || '%' OR
           u.summary ILIKE '%' || p_search || '%' OR
           u.subtype ILIKE '%' || p_search || '%')
  ),
  counted AS (
    SELECT count(*) AS total FROM filtered
  )
  SELECT
    jsonb_build_object(
      'total', (SELECT total FROM counted),
      'from', p_from,
      'to', p_to,
      'limit', p_limit,
      'offset', p_offset,
      'rows', COALESCE((
        SELECT jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.event_time DESC)
        FROM (
          SELECT * FROM filtered
          ORDER BY event_time DESC
          LIMIT p_limit OFFSET p_offset
        ) sub
      ), '[]'::jsonb)
    )
  INTO v_rows;

  RETURN v_rows;
END;
$function$;
