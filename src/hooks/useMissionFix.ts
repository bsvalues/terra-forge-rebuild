// TerraFusion OS — Mission Fix Pack Hook
// Constitutional: server-side fix via apply_mission_fix() RPC

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FixPackResult {
  dry_run: boolean;
  mission_id: string;
  strategy: string;
  affected: number;
  description: string;
  warnings: string[];
  receipt_id?: string;
  error?: string;
}

export function useMissionFix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      missionId: string;
      strategy: string;
      dryRun: boolean;
      extraParams?: Record<string, any>;
    }): Promise<FixPackResult> => {
      const { data, error } = await supabase.rpc("apply_mission_fix", {
        p_mission_id: params.missionId,
        p_strategy: params.strategy,
        p_params: params.extraParams ?? {},
        p_dry_run: params.dryRun,
      });
      if (error) throw error;
      return data as unknown as FixPackResult;
    },
    onSuccess: (result) => {
      if (!result.dry_run) {
        // Invalidate mission-related queries after commit
        queryClient.invalidateQueries({ queryKey: ["smart-quick-actions"] });
        queryClient.invalidateQueries({ queryKey: ["mission-preview"] });
        queryClient.invalidateQueries({ queryKey: ["county-vitals"] });
      }
    },
  });
}
