// TerraFusion OS — Neighborhood Leaderboard Hook
// Data Constitution: extracts supabase queries from NeighborhoodLeaderboard component

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NeighborhoodScore {
  code: string;
  parcelCount: number;
  certifiedPct: number;
  calibrated: boolean;
  rSquared: number | null;
  pendingAppeals: number;
  openPermits: number;
  readinessScore: number;
}

export function useNeighborhoodLeaderboard() {
  return useQuery({
    queryKey: ["neighborhood-leaderboard"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      const { data: parcels } = await supabase
        .from("parcels")
        .select("id, neighborhood_code")
        .not("neighborhood_code", "is", null)
        .limit(5000);

      if (!parcels || parcels.length === 0) return [];

      const nbhdMap = new Map<string, string[]>();
      for (const p of parcels) {
        const code = p.neighborhood_code!;
        if (!nbhdMap.has(code)) nbhdMap.set(code, []);
        nbhdMap.get(code)!.push(p.id);
      }

      const { data: calibRuns } = await supabase
        .from("calibration_runs")
        .select("neighborhood_code, r_squared, created_at")
        .order("created_at", { ascending: false });

      const latestCalib = new Map<string, number>();
      for (const run of calibRuns || []) {
        if (!latestCalib.has(run.neighborhood_code)) {
          latestCalib.set(run.neighborhood_code, run.r_squared ?? 0);
        }
      }

      const { data: assessments } = await supabase
        .from("assessments")
        .select("parcel_id, certified")
        .eq("tax_year", currentYear);

      const certifiedSet = new Set<string>();
      for (const a of assessments || []) {
        if (a.certified) certifiedSet.add(a.parcel_id);
      }

      const { data: appeals } = await supabase
        .from("appeals")
        .select("parcel_id")
        .in("status", ["filed", "pending", "scheduled"]);

      const appealsByParcel = new Set((appeals || []).map(a => a.parcel_id));

      const { data: permits } = await supabase
        .from("permits")
        .select("parcel_id")
        .in("status", ["applied", "pending"]);

      const permitsByParcel = new Set(((permits as any[]) || []).map((p: any) => p.parcel_id));

      const scores: NeighborhoodScore[] = [];
      for (const [code, parcelIds] of nbhdMap) {
        const count = parcelIds.length;
        const certCount = parcelIds.filter(id => certifiedSet.has(id)).length;
        const certifiedPct = count > 0 ? Math.round((certCount / count) * 100) : 0;
        const calibrated = latestCalib.has(code);
        const rSquared = latestCalib.get(code) ?? null;
        const pendingAppeals = parcelIds.filter(id => appealsByParcel.has(id)).length;
        const openPermits = parcelIds.filter(id => permitsByParcel.has(id)).length;

        let score = 0;
        score += certifiedPct * 0.4;
        score += (calibrated ? 25 : 0);
        score += (rSquared && rSquared > 0.7 ? 15 : rSquared && rSquared > 0.5 ? 8 : 0);
        score -= Math.min(pendingAppeals * 2, 10);
        score -= Math.min(openPermits * 1, 5);
        score = Math.max(0, Math.min(100, Math.round(score)));

        scores.push({ code, parcelCount: count, certifiedPct, calibrated, rSquared, pendingAppeals, openPermits, readinessScore: score });
      }

      scores.sort((a, b) => b.readinessScore - a.readinessScore);
      return scores.slice(0, 10);
    },
    staleTime: 120_000,
  });
}
