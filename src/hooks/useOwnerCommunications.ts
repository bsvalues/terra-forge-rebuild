// TerraFusion OS — Phase 127: Owner Communications Hook
// Constitutional owner: TerraDais (workflow)
// Write-lane: owner_communications → Dais

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────
export type ContactMethod = "phone" | "email" | "letter" | "in-person" | "notice" | "hearing";
export type CommDirection = "inbound" | "outbound";

export interface OwnerCommunication {
  id: string;
  county_id: string | null;
  parcel_id: string | null;
  appeal_id: string | null;
  owner_name: string;
  contact_method: ContactMethod;
  direction: CommDirection;
  subject: string;
  body: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateCommInput {
  county_id?: string;
  parcel_id: string;
  appeal_id?: string;
  owner_name: string;
  contact_method: ContactMethod;
  direction: CommDirection;
  subject: string;
  body?: string;
  created_by?: string;
}

export interface CommFilters {
  ownerSearch?: string;
  contactMethod?: ContactMethod | "all";
  direction?: CommDirection | "all";
  dateFrom?: string;
  dateTo?: string;
}

// ── Query Keys ───────────────────────────────────────────────────────
const COMMS_KEY = "owner-communications";

// ── Read: List communications for a parcel ───────────────────────────
export function useOwnerCommunications(
  parcelId: string | null,
  filters?: CommFilters,
) {
  return useQuery({
    queryKey: [COMMS_KEY, parcelId, filters],
    enabled: !!parcelId,
    queryFn: async () => {
      let query = supabase
        .from("owner_communications" as "parcels")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("created_at", { ascending: false });

      if (filters?.contactMethod && filters.contactMethod !== "all") {
        query = query.eq("contact_method", filters.contactMethod);
      }
      if (filters?.direction && filters.direction !== "all") {
        query = query.eq("direction", filters.direction);
      }
      if (filters?.ownerSearch) {
        query = query.ilike("owner_name", `%${filters.ownerSearch}%`);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as OwnerCommunication[];
    },
    staleTime: 10_000,
  });
}

// ── Write: Add a communication entry ─────────────────────────────────
export function useAddCommunication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCommInput) => {
      const { data, error } = await supabase
        .from("owner_communications" as "parcels")
        .insert(input as Record<string, unknown>)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as OwnerCommunication;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY, variables.parcel_id] });
    },
  });
}
