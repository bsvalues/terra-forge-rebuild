// TerraFusion OS — Roll Readiness Data Hook
// Extracts direct supabase queries from RollReadinessPanel (Data Constitution)

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RollReadinessData {
  totalParcels: number;
  certifiedParcels: number;
  rate: number;
  uncertifiedParcelIds: string[];
  blockers: {
    appeals: number;
    permits: number;
    exemptions: number;
  };
}

export function useRollReadinessData(neighborhoodCode: string | null) {
  return useQuery<RollReadinessData>({
    queryKey: ["roll-readiness", neighborhoodCode],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      // Count total parcels in neighborhood
      const parcelQuery = supabase
        .from("parcels")
        .select("id", { count: "exact", head: true });
      if (neighborhoodCode) parcelQuery.eq("neighborhood_code", neighborhoodCode);
      const { count: totalParcels } = await parcelQuery;

      // Get certified assessments
      const { data: assessments } = await supabase
        .from("assessments")
        .select("parcel_id, certified")
        .eq("tax_year", currentYear);

      // Get parcel IDs in this neighborhood
      let parcelIds: string[] | null = null;
      if (neighborhoodCode) {
        const { data: nbhdParcels } = await supabase
          .from("parcels")
          .select("id")
          .eq("neighborhood_code", neighborhoodCode);
        parcelIds = (nbhdParcels || []).map(p => p.id);
      }

      const relevantAssessments = parcelIds
        ? (assessments || []).filter(a => parcelIds!.includes(a.parcel_id))
        : assessments || [];

      const certifiedCount = relevantAssessments.filter(a => a.certified).length;
      const certifiedParcelIds = new Set(relevantAssessments.filter(a => a.certified).map(a => a.parcel_id));
      const allParcelIds = parcelIds || relevantAssessments.map(a => a.parcel_id);
      const uncertifiedParcelIds = allParcelIds.filter(id => !certifiedParcelIds.has(id));
      const total = totalParcels || 0;

      // Blockers
      const [appeals, permits, exemptions] = await Promise.all([
        supabase.from("appeals").select("parcel_id", { count: "exact", head: true }).in("status", ["filed", "pending", "scheduled"]),
        supabase.from("permits").select("parcel_id", { count: "exact", head: true }).in("status", ["applied", "pending"]),
        supabase.from("exemptions").select("parcel_id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      return {
        totalParcels: total,
        certifiedParcels: certifiedCount,
        rate: total > 0 ? Math.round((certifiedCount / total) * 100) : 0,
        uncertifiedParcelIds: uncertifiedParcelIds.slice(0, 500),
        blockers: {
          appeals: appeals.count || 0,
          permits: permits.count || 0,
          exemptions: exemptions.count || 0,
        },
      };
    },
    staleTime: 60_000,
  });
}
