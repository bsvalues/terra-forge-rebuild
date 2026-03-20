// TerraFusion OS — Certification Events Hook
// Queries and creates certification_events records

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateCertification } from "@/lib/queryInvalidation";

export interface CertificationEvent {
  id: string;
  county_id: string;
  event_type: string;
  tax_year: number;
  neighborhood_code: string | null;
  parcels_certified: number;
  parcels_created: number;
  total_parcels: number;
  readiness_score: number | null;
  blocker_snapshot: Record<string, unknown>;
  certified_by: string;
  certified_at: string;
  notes: string | null;
}

export function useCertificationEvents(taxYear?: number) {
  const year = taxYear || new Date().getFullYear();
  return useQuery({
    queryKey: ["certification-events", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certification_events")
        .select("*")
        .eq("tax_year", year)
        .order("certified_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CertificationEvent[];
    },
    staleTime: 30_000,
  });
}

export function useRecordCertificationEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      event_type: string;
      neighborhood_code?: string;
      parcels_certified: number;
      parcels_created: number;
      total_parcels: number;
      readiness_score?: number;
      blocker_snapshot?: Record<string, unknown>;
      notes?: string;
    }) => {
      const { data: profile } = await supabase.from("profiles").select("county_id").single();
      const { data, error } = await supabase
        .from("certification_events")
        .insert([{
          county_id: profile?.county_id ?? "",
          event_type: params.event_type,
          neighborhood_code: params.neighborhood_code || null,
          parcels_certified: params.parcels_certified,
          parcels_created: params.parcels_created,
          total_parcels: params.total_parcels,
          readiness_score: params.readiness_score || null,
          blocker_snapshot: params.blocker_snapshot || {},
          notes: params.notes || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateCertification(queryClient);
      queryClient.invalidateQueries({ queryKey: ["certification-events"] });
    },
  });
}
