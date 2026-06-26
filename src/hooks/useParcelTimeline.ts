// TerraFusion OS — Phase 201: Parcel History Timeline Hook
// Replaces inline mockTimeline array in ParcelHistoryTimeline.tsx

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  category: "assessment" | "permit" | "appeal" | "notice" | "exemption" | "certification" | "document" | "sale";
  valueImpact?: number; // positive = increase, negative = decrease
  suite: string;
}

export function useParcelTimeline(parcelId: string | null) {
  return useQuery({
    queryKey: ["parcel-timeline", parcelId],
    enabled: !!parcelId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("parcel_history_events")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("event_date", { ascending: false });
      if (error) throw new Error(error.message);
      // Map DB snake_case → component camelCase
      return (data ?? []).map((row: any) => ({
        id: row.id,
        date: row.event_date,
        title: row.title,
        description: row.description,
        category: row.category,
        valueImpact: row.value_impact ?? null,
        suite: row.suite ?? "forge",
      })) as TimelineEvent[];
    },
  });
}
