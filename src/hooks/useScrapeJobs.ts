// TerraFusion OS — Scrape Jobs Hook (Constitutional: DB access only in hooks)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScrapeJob {
  id: string;
  job_type: string;
  status: string;
  counties: unknown;
  current_county: string | null;
  counties_completed: number;
  counties_total: number;
  parcels_enriched: number;
  sales_added: number;
  errors: unknown;
  started_at: string | null;
  completed_at: string | null;
  estimated_completion: string | null;
  created_at: string;
  updated_at: string;
}

export function useScrapeJobsList() {
  return useQuery({
    queryKey: ["admin-scrape-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scrape_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ScrapeJob[];
    },
    refetchInterval: 3000,
  });
}

export function useStartScrapeJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { jobType: string; counties?: string[]; regions?: string[] }) => {
      const { data, error } = await supabase.functions.invoke("statewide-scrape", {
        body: { action: "start", ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.queued) {
        toast.info("Job added to queue", { description: "Will start automatically when current job completes" });
      } else {
        toast.success("Scrape job started successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-scrape-jobs"] });
    },
    onError: (error) => toast.error(`Failed to start job: ${error.message}`),
  });
}

export function useCancelScrapeJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("statewide-scrape", {
        body: { action: "cancel", jobId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.info("Job cancelled");
      queryClient.invalidateQueries({ queryKey: ["admin-scrape-jobs"] });
    },
    onError: (error) => toast.error(`Failed to cancel job: ${error.message}`),
  });
}

export function useRetryScrapeJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("statewide-scrape", {
        body: { action: "retry", jobId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Retrying failed counties");
      queryClient.invalidateQueries({ queryKey: ["admin-scrape-jobs"] });
    },
    onError: (error) => toast.error(`Failed to retry: ${error.message}`),
  });
}
