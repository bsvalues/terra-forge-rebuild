import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UnifiedPermit {
  id: string;
  permitNumber: string | null;
  permitType: string | null;
  status: string | null;
  issuedDate: string | null;
  estimatedValue: number | null;
  description: string | null;
  source: "canonical" | "pacs";
}

export function useParcelPermits(parcelId: string | null) {
  return useQuery({
    queryKey: ["parcel-permits", parcelId],
    enabled: !!parcelId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<UnifiedPermit[]> => {
      if (!parcelId) return [];
      const results: UnifiedPermit[] = [];

      // 1. Canonical permits table (issue_date is the actual column name)
      const { data: canonical, error: e1 } = await supabase
        .from("permits")
        .select("id, permit_number, permit_type, status, issue_date, estimated_value, description")
        .eq("parcel_id", parcelId)
        .order("issue_date", { ascending: false });

      if (e1) throw new Error(e1.message);
      for (const p of canonical ?? []) {
        results.push({
          id: p.id,
          permitNumber: p.permit_number,
          permitType: p.permit_type,
          status: p.status,
          issuedDate: p.issue_date,
          estimatedValue: p.estimated_value,
          description: p.description,
          source: "canonical",
        });
      }

      // 2. PACS permits (untyped)
      try {
        const { data: pacs } = await (supabase.from as any)("pacs_permits")
          .select("id, permit_number, permit_type, status, issue_date, estimated_value, description")
          .eq("source_parcel_id", parcelId)
          .order("issue_date", { ascending: false });

        for (const p of pacs ?? []) {
          // Dedup by permit_number
          if (p.permit_number && results.some((r: UnifiedPermit) => r.permitNumber === p.permit_number)) continue;
          results.push({
            id: `pacs-${p.id}`,
            permitNumber: p.permit_number,
            permitType: p.permit_type,
            status: p.status,
            issuedDate: p.issue_date,
            estimatedValue: p.estimated_value,
            description: p.description,
            source: "pacs",
          });
        }
      } catch {
        // PACS table may not exist — silent fallback
      }

      return results;
    },
  });
}
