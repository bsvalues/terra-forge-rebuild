// TerraFusion OS — Phase 201: Property Inspection Hook
// Replaces inline useMockInspections in PropertyInspectionScheduler.tsx

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InspectionType = "exterior" | "interior" | "new-construction" | "appeal" | "permit" | "recheck";
export type InspectionStatus = "scheduled" | "completed" | "missed" | "cancelled";
export type InspectionPriority = "high" | "normal" | "low";

export interface Inspection {
  id: string;
  type: InspectionType;
  scheduledDate: Date;
  status: InspectionStatus;
  priority: InspectionPriority;
  notes: string;
  inspector: string;
}

function queryKey(parcelId: string | null) {
  return ["property-inspections", parcelId];
}

export function usePropertyInspections(parcelId: string | null) {
  return useQuery({
    queryKey: queryKey(parcelId),
    enabled: !!parcelId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("property_inspections")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("scheduled_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        id: row.id,
        type: row.type as InspectionType,
        scheduledDate: new Date(row.scheduled_date),
        status: row.status as InspectionStatus,
        priority: (row.priority ?? "normal") as InspectionPriority,
        notes: row.notes ?? "",
        inspector: row.inspector ?? "",
      })) as Inspection[];
    },
  });
}

export function useScheduleInspection(parcelId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      type: InspectionType;
      scheduled_date: string;
      notes: string;
      priority: InspectionPriority;
    }) => {
      const { data, error } = await (supabase.from as any)("property_inspections")
        .insert({
          parcel_id: parcelId,
          type: payload.type,
          scheduled_date: payload.scheduled_date,
          notes: payload.notes,
          priority: payload.priority,
          status: "scheduled",
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(parcelId) });
    },
  });
}
