// TerraFusion OS — Phase 75: Revaluation Notice Candidates Hook
// "The notices are alive. They told me they want to be mailed." — Ralph Wiggum

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NoticeCandidate {
  parcel_id: string;
  parcel_number: string;
  address: string;
  city: string;
  neighborhood: string;
  property_class: string;
  current_value: number;
  current_land: number;
  current_imp: number;
  prior_value: number;
  change_pct: number;
}

export interface RevalNoticeSummary {
  cycle_id: string;
  cycle_name: string;
  tax_year: number;
  total_parcels: number;
  increases: number;
  decreases: number;
  unchanged: number;
  avg_change_pct: number;
  candidates: NoticeCandidate[];
  error?: string;
}

export function useRevalNoticeCandidates(cycleId: string | null, minChangePct: number = 0) {
  return useQuery<RevalNoticeSummary | null>({
    queryKey: ["reval-notice-candidates", cycleId, minChangePct],
    queryFn: async () => {
      if (!cycleId) return null;
      const { data, error } = await supabase.rpc(
        "get_revaluation_notice_candidates" as any,
        { p_cycle_id: cycleId, p_min_change_pct: minChangePct }
      );
      if (error) throw error;
      const result = data as unknown as RevalNoticeSummary;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    enabled: !!cycleId,
    staleTime: 60_000,
  });
}
