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

/**
 * get_appeal_risk_summary returns flagged-score counts by tier (critical/high/
 * medium/low, total_flagged). Critical and high are both "high risk" here.
 * Neighborhood rankings are not part of the RPC, so none are reported.
 */
export function toAppealRiskSummary(raw: unknown): AppealRiskSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const n = (k: string) => (typeof r[k] === "number" ? (r[k] as number) : 0);
  if (typeof r.total_flagged !== "number") return null;
  return {
    totalParcels: n("total_flagged"),
    highRiskCount: n("critical") + n("high"),
    mediumRiskCount: n("medium"),
    lowRiskCount: n("low"),
    avgScore: 0,
    topRiskNeighborhoods: [],
  };
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
      return toAppealRiskSummary(data);
    },
  });
}
