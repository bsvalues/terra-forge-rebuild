// TerraFusion OS — Redfin Sales CSV Ingest Hook
// Handles dry-run preview + commit for Redfin CSV uploads.

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RedfIngestResult {
  ok: boolean;
  dryRun?: boolean;
  totalRows: number;
  matched: number;
  inserted?: number;
  duplicates?: number;
  unmatched: number;
  skipped: number;
  matchRate: number;
  parcelsIndexed: number;
  sampleMatched?: any[];
  sampleUnmatched?: { address: string; zip: string; price: string }[];
  sampleSkipped?: { reason: string; address: string }[];
}

async function invokeRedfin(csvText: string, dryRun: boolean): Promise<RedfIngestResult> {
  const { data, error } = await supabase.functions.invoke("redfin-sales-ingest", {
    body: { csvText, dryRun },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as RedfIngestResult;
}

export function useRedfinPreview() {
  return useMutation({
    mutationFn: (csvText: string) => invokeRedfin(csvText, true),
    onError: (err: any) => {
      toast.error("Preview failed", { description: err.message });
    },
  });
}

export function useRedfinCommit() {
  return useMutation({
    mutationFn: (csvText: string) => invokeRedfin(csvText, false),
    onSuccess: (data) => {
      toast.success(`Imported ${data.inserted} sales`, {
        description: `${data.duplicates} duplicates skipped, ${data.unmatched} unmatched`,
      });
    },
    onError: (err: any) => {
      toast.error("Import failed", { description: err.message });
    },
  });
}
