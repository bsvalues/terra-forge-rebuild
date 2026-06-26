// TerraFusion OS — Phase 218: Appeal Risk Summary RPC Hook
// Constitutional read contract for get_appeal_risk_summary() RPC
// Provides county-scoped appeal risk aggregation for dashboard display

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export interface AppealRiskSummary {
  totalParcels: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  avgScore: number;
  topRiskNeighborhoods: { code: string; avgScore: number; count: number }[];
}

export function useAppealRiskSummary() {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["appeal-risk-summary-rpc", countyId],
    enabled: !!countyId,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<AppealRiskSummary | null> => {
      if (!countyId) return null;
      const { data, error } = await (supabase.rpc as Function)(
        "get_appeal_risk_summary",
        { p_county_id: countyId }
      );
      if (error) throw new Error(error.message);
      return data as AppealRiskSummary | null;
    },
  });
}
