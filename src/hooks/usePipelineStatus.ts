// TerraFusion OS — Pipeline Status Hook
// Constitutional read contract for get_pipeline_status() RPC
// One canonical surface for ingest → quality → readiness observability

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export type PipelineStage =
  | "ingest_received"
  | "ingest_parsed"
  | "ingest_loaded"
  | "quality_scored"
  | "models_rerun"
  | "readiness_updated";

export type PipelineStatus = "running" | "success" | "warning" | "failed" | "never_run";

export interface PipelineStageRow {
  stage: PipelineStage;
  status: PipelineStatus;
  started_at: string | null;
  finished_at: string | null;
  rows_affected: number | null;
  artifact_ref: string | null;
  error_id: string | null;
  duration_seconds: number | null;
  details: Record<string, unknown>;
}

export interface PipelineStatusResult {
  stages: PipelineStageRow[];
  overall: "healthy" | "warning" | "failed";
  last_success: string | null;
  total_rows: number;
  as_of: string;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  ingest_received:    "File Received",
  ingest_parsed:      "Parsed & Mapped",
  ingest_loaded:      "Loaded to DB",
  quality_scored:     "Quality Scored",
  models_rerun:       "Models Rerun",
  readiness_updated:  "Readiness Updated",
};

const STAGE_DESCRIPTIONS: Record<PipelineStage, string> = {
  ingest_received:    "Upload received, SHA-256 fingerprinted",
  ingest_parsed:      "Headers mapped, rows validated",
  ingest_loaded:      "Records upserted into parcel spine",
  quality_scored:     "Completeness & consistency scored",
  models_rerun:       "Affected neighborhood models recalibrated",
  readiness_updated:  "Certification checklist refreshed",
};

export const STAGE_ORDER: PipelineStage[] = [
  "ingest_received",
  "ingest_parsed",
  "ingest_loaded",
  "quality_scored",
  "models_rerun",
  "readiness_updated",
];

export { STAGE_LABELS, STAGE_DESCRIPTIONS };

export function usePipelineStatus() {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["pipeline-status", countyId],
    queryFn: async (): Promise<PipelineStatusResult> => {
      const { data, error } = await supabase.rpc("get_pipeline_status" as any, {
        p_county_id: countyId,
      });
      if (error) throw error;
      return data as PipelineStatusResult;
    },
    enabled: !!countyId,
    staleTime: 30_000,
    gcTime: 60_000,
    refetchInterval: 60_000,
  });
}

// Helper to emit a pipeline event from the ingest flow
export async function emitPipelineEvent(params: {
  countyId: string;
  stage: PipelineStage;
  status: PipelineStatus;
  ingestJobId?: string | null;
  rowsAffected?: number | null;
  artifactRef?: string | null;
  errorId?: string | null;
  details?: Record<string, unknown>;
  startedAt?: string;
  finishedAt?: string;
}) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("pipeline_events").insert({
    county_id: params.countyId,
    stage: params.stage,
    status: params.status,
    ingest_job_id: params.ingestJobId ?? null,
    rows_affected: params.rowsAffected ?? null,
    artifact_ref: params.artifactRef ?? null,
    error_id: params.errorId ?? null,
    details: params.details ?? {},
    started_at: params.startedAt ?? now,
    finished_at: params.finishedAt ?? (params.status !== "running" ? now : undefined),
  });
  if (error) {
    // Never throw — pipeline events are observability, not critical path
    console.warn("[pipeline_events] emit failed:", error.message);
  }
}
