// TerraFusion OS — Polygon Ingest Job Hook (Resumable, Realtime)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export interface IngestJob {
  id: string;
  county_id: string;
  dataset: string;
  feature_server_url: string;
  parcel_id_field: string;
  page_size: number;
  status: "queued" | "running" | "paused" | "failed" | "complete";
  cursor_offset: number;
  total_fetched: number;
  total_upserted: number;
  total_matched: number;
  pages_processed: number;
  last_error: string | null;
  layer_id: string | null;
  created_by: string;
  started_at: string | null;
  updated_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface IngestEvent {
  id: string;
  job_id: string;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
}

const QUERY_KEY = ["polygon-ingest-jobs"];

export function useIngestJobs() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<IngestJob[]> => {
      const { data, error } = await supabase
        .from("gis_ingest_jobs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as IngestJob[];
    },
    staleTime: 10_000,
  });

  // Realtime subscription for live progress
  useEffect(() => {
    const channel = supabase
      .channel("ingest-jobs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gis_ingest_jobs" },
        () => {
          qc.invalidateQueries({ queryKey: QUERY_KEY });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
}

export function useIngestJobEvents(jobId: string | undefined) {
  return useQuery({
    queryKey: ["polygon-ingest-events", jobId],
    queryFn: async (): Promise<IngestEvent[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("gis_ingest_job_events" as any)
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as IngestEvent[];
    },
    enabled: !!jobId,
    refetchInterval: 5000,
  });
}

function useIngestAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("arcgis-polygon-ingest", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: any) => {
      toast.error("Ingest action failed", { description: err.message });
    },
  });
}

export function useStartIngest() {
  const action = useIngestAction();
  return {
    ...action,
    start: (params: {
      featureServerUrl: string;
      dataset: string;
      parcelIdField?: string;
      pageSize?: number;
      maxPages?: number;
    }) => action.mutateAsync({ action: "start", ...params }),
  };
}

export function useResumeIngest() {
  const action = useIngestAction();
  return {
    ...action,
    resume: (jobId: string, maxPages?: number) =>
      action.mutateAsync({ action: "resume", jobId, maxPages }),
  };
}

export function usePauseIngest() {
  const action = useIngestAction();
  return {
    ...action,
    pause: (jobId: string) => action.mutateAsync({ action: "pause", jobId }),
  };
}
