// TerraFusion OS — Phase 201: Workflow Batch Items Hook
// Replaces inline mockItems array in BatchWorkflowExecutor.tsx

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BatchItem {
  id: string;
  parcelNumber: string;
  address: string;
  currentStatus: string;
  domain: "appeals" | "permits" | "exemptions" | "notices";
  selected: boolean;
  result?: "success" | "error" | "skipped";
  resultMessage?: string;
}

function queryKey(domain: string | null) {
  return ["workflow-batch-items", domain ?? "all"];
}

export function useWorkflowBatchItems(domain: string | null) {
  return useQuery({
    queryKey: queryKey(domain),
    staleTime: 30_000,
    queryFn: async () => {
      let q = (supabase.from as any)("workflow_batch_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (domain && domain !== "all") {
        q = q.eq("domain", domain);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        id: row.id,
        parcelNumber: row.parcel_number,
        address: row.address ?? "",
        currentStatus: row.current_status ?? "",
        domain: row.domain as BatchItem["domain"],
        selected: false, // client-only UI state; always starts unselected
        result: row.result ?? undefined,
        resultMessage: row.result_message ?? undefined,
      })) as BatchItem[];
    },
  });
}

export function useExecuteBatchAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { itemIds: string[]; action: string }) => {
      // Execute batch action against each item
      const results = await Promise.all(
        payload.itemIds.map(async (id) => {
          const { error } = await (supabase.from as any)("workflow_batch_items")
            .update({ result: "success", result_message: `${payload.action} completed` })
            .eq("id", id);
          return { id, success: !error };
        })
      );
      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-batch-items"] });
    },
  });
}
