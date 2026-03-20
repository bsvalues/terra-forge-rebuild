// TerraFusion OS — DAIS Domain Query Hooks
// Data Constitution: centralized queries for Appeals, Exemptions, Notices

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ---- Appeal Timeline ----

interface StatusChange {
  id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

export function useAppealTimeline(appealId: string) {
  return useQuery({
    queryKey: ["appeal-timeline", appealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appeal_status_changes")
        .select("*")
        .eq("appeal_id", appealId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StatusChange[];
    },
  });
}

// ---- Appeal Audit Log ----

export function useAppealAuditLog(statusFilter: string, dateRange: "7d" | "30d" | "90d" | "all") {
  return useQuery({
    queryKey: ["appeal-audit-log", statusFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("appeal_status_changes")
        .select(`
          *,
          appeal:appeals!appeal_status_changes_appeal_id_fkey(
            id,
            parcel:parcels!appeals_parcel_id_fkey(parcel_number, address)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("new_status", statusFilter);
      }

      if (dateRange !== "all") {
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte("created_at", since.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

// ---- Exemptions Workflow ----

export interface Exemption {
  id: string;
  exemption_type: string;
  exemption_amount: number | null;
  exemption_percentage: number | null;
  status: string;
  application_date: string;
  approval_date: string | null;
  expiration_date: string | null;
  tax_year: number;
  applicant_name: string | null;
  notes: string | null;
  parcel: {
    id: string;
    parcel_number: string;
    address: string;
    city: string | null;
    assessed_value: number;
  };
}

export function useExemptionsWorkflow(statusFilter: string) {
  return useQuery({
    queryKey: ["exemptions-workflow", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("exemptions")
        .select(`
          *,
          parcel:parcels!exemptions_parcel_id_fkey(id, parcel_number, address, city, assessed_value)
        `)
        .order("application_date", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Exemption[];
    },
  });
}

// ---- Parcel Search (for dialogs) ----

export function useParcelSearch(searchTerm: string) {
  return useQuery({
    queryKey: ["parcels-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const { data: profile } = await supabase.from("profiles").select("county_id").single();
      let q = supabase
        .from("parcels")
        .select("id, parcel_number, address, city")
        .or(`parcel_number.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
        .limit(10);
      if (profile?.county_id) q = q.eq("county_id", profile.county_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 2,
  });
}

// ---- Batch Notice Adjustments ----

export function useBatchNoticeAdjustments(calibrationRunId: string | null) {
  return useQuery({
    queryKey: ["batch-notice-adjustments", calibrationRunId],
    queryFn: async () => {
      if (!calibrationRunId) return { adjustments: [], parcels: new Map() };

      const { data: adjustments, error } = await supabase
        .from("value_adjustments")
        .select("parcel_id, previous_value, new_value")
        .eq("calibration_run_id", calibrationRunId)
        .is("rolled_back_at", null);

      if (error) throw error;
      if (!adjustments || adjustments.length === 0) return { adjustments: [], parcels: new Map() };

      const parcelIds = adjustments.map(a => a.parcel_id);
      const { data: parcels } = await supabase
        .from("parcels")
        .select("id, parcel_number, address")
        .in("id", parcelIds.slice(0, 500));

      const parcelMap = new Map(
        (parcels || []).map(p => [p.id, { parcelNumber: p.parcel_number, address: p.address }])
      );

      return { adjustments, parcels: parcelMap };
    },
    enabled: !!calibrationRunId,
    staleTime: 30_000,
  });
}

// ---- Defense Packet Queries ----

export function useModelReceipts(parcelId: string | null) {
  return useQuery({
    queryKey: ["model-receipts", parcelId],
    queryFn: async () => {
      if (!parcelId) return [];
      const { data, error } = await supabase
        .from("model_receipts")
        .select("*")
        .eq("parcel_id", parcelId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
  });
}

export function useDefenseTraceEvents(parcelId: string | null) {
  return useQuery({
    queryKey: ["defense-trace-events", parcelId],
    queryFn: async () => {
      if (!parcelId) return [];
      const { data, error } = await supabase
        .from("trace_events")
        .select("*")
        .eq("parcel_id", parcelId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
  });
}

export function useDefenseAppeals(parcelId: string | null) {
  return useQuery({
    queryKey: ["defense-appeals", parcelId],
    queryFn: async () => {
      if (!parcelId) return [];
      const { data, error } = await supabase
        .from("appeals")
        .select("id, parcel_id, county_id, appeal_date, hearing_date, resolution_date, original_value, requested_value, final_value, tax_year, status, resolution_type, notes, created_at, updated_at")
        .eq("parcel_id", parcelId)
        .order("appeal_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
  });
}
