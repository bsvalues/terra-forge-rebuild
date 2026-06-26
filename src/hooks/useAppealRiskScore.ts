// TerraFusion OS — Appeal Risk Score Hook
// Fetches the latest appeal risk score for a parcel from appeal_risk_scores.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppealRiskScore {
  id: string;
  riskScore: number;
  riskTier: string;
  riskFactors: unknown;
  aiDefenseStrategy: string | null;
  aiRiskSummary: string | null;
  defenseStatus: string | null;
  taxYear: number;
  createdAt: string;
}

export function useAppealRiskScore(parcelId: string | null) {
  return useQuery<AppealRiskScore | null>({
    queryKey: ["appeal-risk-score", parcelId],
    enabled: !!parcelId,
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appeal_risk_scores")
        .select(
          "id, risk_score, risk_tier, risk_factors, ai_defense_strategy, ai_risk_summary, defense_status, tax_year, created_at"
        )
        .eq("parcel_id", parcelId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return {
        id: data.id,
        riskScore: data.risk_score,
        riskTier: data.risk_tier,
        riskFactors: data.risk_factors,
        aiDefenseStrategy: data.ai_defense_strategy,
        aiRiskSummary: data.ai_risk_summary,
        defenseStatus: data.defense_status,
        taxYear: data.tax_year,
        createdAt: data.created_at,
      };
    },
  });
}
