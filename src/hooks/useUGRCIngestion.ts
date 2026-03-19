// TerraFusion OS — UGRC/SGID Ingestion Hook
// Manages the UGRC parcel fetch lifecycle: start, resume, pause, status.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UGRCJob {
  id: string;
  county_id: string;
  dataset: string;
  feature_server_url: string;
  status: "queued" | "running" | "paused" | "failed" | "complete";
  cursor_offset: number;
  total_fetched: number;
  total_upserted: number;
  pages_processed: number;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UGRCEvent {
  id: string;
  job_id: string;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
}

const QUERY_KEY = ["ugrc-ingest-jobs"];

async function invokeUGRC(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("ugrc-ingest", { body });
  if (error) throw error;
  return data;
}

export function useUGRCJobs() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<UGRCJob[]> => {
      const result = await invokeUGRC({ action: "status" });
      return (result?.jobs || []) as UGRCJob[];
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

export function useUGRCJobDetail(jobId: string | undefined) {
  return useQuery({
    queryKey: ["ugrc-ingest-detail", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const result = await invokeUGRC({ action: "status", jobId });
      return result as { job: UGRCJob; events: UGRCEvent[] };
    },
    enabled: !!jobId,
    refetchInterval: 5000,
  });
}

function useUGRCAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: invokeUGRC,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: any) => {
      toast.error("UGRC ingest action failed", { description: err.message });
    },
  });
}

export function useStartUGRC() {
  const action = useUGRCAction();
  return {
    ...action,
    start: (params?: { pageSize?: number; maxPages?: number }) =>
      action.mutateAsync({ action: "start", ...params }),
  };
}

export function useResumeUGRC() {
  const action = useUGRCAction();
  return {
    ...action,
    resume: (jobId: string, maxPages?: number) =>
      action.mutateAsync({ action: "resume", jobId, maxPages }),
  };
}

export function usePauseUGRC() {
  const action = useUGRCAction();
  return {
    ...action,
    pause: (jobId: string) => action.mutateAsync({ action: "pause", jobId }),
  };
}
