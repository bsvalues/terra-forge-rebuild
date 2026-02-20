
-- ============================================================
-- Pipeline Ledger: ingest → quality → readiness observability
-- ============================================================

-- 1. pipeline_events table
CREATE TABLE IF NOT EXISTS public.pipeline_events (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id         uuid        NOT NULL DEFAULT get_user_county_id(),
  ingest_job_id     uuid        REFERENCES public.ingest_jobs(id) ON DELETE SET NULL,
  stage             text        NOT NULL,            -- ingest_received | ingest_parsed | ingest_loaded | quality_scored | models_rerun | readiness_updated
  status            text        NOT NULL DEFAULT 'running',  -- running | success | warning | failed
  started_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz,
  rows_affected     integer,
  artifact_ref      text,                            -- e.g., file name, run id, score key
  error_id          text,                            -- sanitised errorId (no raw messages)
  details           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS pipeline_events_county_stage_idx
  ON public.pipeline_events (county_id, stage, started_at DESC);

CREATE INDEX IF NOT EXISTS pipeline_events_ingest_job_idx
  ON public.pipeline_events (ingest_job_id)
  WHERE ingest_job_id IS NOT NULL;

-- RLS
ALTER TABLE public.pipeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert pipeline events for their county"
  ON public.pipeline_events FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can view pipeline events for their county"
  ON public.pipeline_events FOR SELECT
  USING (county_id = get_user_county_id());

-- Append-only: no UPDATE or DELETE

-- 2. get_pipeline_status() RPC
-- Returns latest status per stage + aggregate health for the county
CREATE OR REPLACE FUNCTION public.get_pipeline_status(p_county_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_county_id uuid;
  v_stages    text[] := ARRAY[
    'ingest_received',
    'ingest_parsed',
    'ingest_loaded',
    'quality_scored',
    'models_rerun',
    'readiness_updated'
  ];
  v_stage     text;
  v_result    jsonb := '[]'::jsonb;
  v_row       jsonb;
  v_overall   text := 'healthy';
  v_last_run  timestamptz;
  v_total_rows bigint := 0;
BEGIN
  -- Resolve county
  v_county_id := COALESCE(p_county_id, get_user_county_id());

  FOREACH v_stage IN ARRAY v_stages LOOP
    SELECT row_to_json(sub)::jsonb INTO v_row
    FROM (
      SELECT
        pe.stage,
        pe.status,
        pe.started_at,
        pe.finished_at,
        pe.rows_affected,
        pe.artifact_ref,
        pe.error_id,
        EXTRACT(EPOCH FROM (pe.finished_at - pe.started_at))::int AS duration_seconds,
        pe.details
      FROM pipeline_events pe
      WHERE pe.county_id = v_county_id
        AND pe.stage = v_stage
      ORDER BY pe.started_at DESC
      LIMIT 1
    ) sub;

    IF v_row IS NULL THEN
      v_row := jsonb_build_object(
        'stage',            v_stage,
        'status',           'never_run',
        'started_at',       NULL,
        'finished_at',      NULL,
        'rows_affected',    NULL,
        'artifact_ref',     NULL,
        'error_id',         NULL,
        'duration_seconds', NULL,
        'details',          '{}'::jsonb
      );
    ELSE
      -- Track overall health
      IF (v_row->>'status') = 'failed' AND v_overall <> 'failed' THEN
        v_overall := 'failed';
      ELSIF (v_row->>'status') = 'warning' AND v_overall = 'healthy' THEN
        v_overall := 'warning';
      END IF;

      -- Track last successful run time
      IF (v_row->>'status') = 'success' THEN
        IF v_last_run IS NULL OR (v_row->>'started_at')::timestamptz > v_last_run THEN
          v_last_run := (v_row->>'started_at')::timestamptz;
        END IF;
        v_total_rows := v_total_rows + COALESCE((v_row->>'rows_affected')::bigint, 0);
      END IF;
    END IF;

    v_result := v_result || jsonb_build_array(v_row);
  END LOOP;

  RETURN jsonb_build_object(
    'stages',        v_result,
    'overall',       v_overall,
    'last_success',  v_last_run,
    'total_rows',    v_total_rows,
    'as_of',         now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_pipeline_status(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_pipeline_status(uuid) TO authenticated;
