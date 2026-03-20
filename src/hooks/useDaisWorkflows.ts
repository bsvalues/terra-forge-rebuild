// TerraFusion OS — Dais Workflow Hooks
// Data Constitution: extracts supabase queries from AppealsWorkflow, PermitsWorkflow, CertificationDashboard

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAppealsWorkflowQuery(statusFilter: string) {
  return useQuery({
    queryKey: ["appeals-workflow", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("appeals")
        .select(`
          id, parcel_id, county_id, study_period_id, appeal_date, hearing_date,
          resolution_date, original_value, requested_value, final_value, tax_year,
          status, resolution_type, notes, created_at, updated_at,
          parcel:parcels!appeals_parcel_id_fkey(id, parcel_number, address, city),
          study_period:study_periods!appeals_study_period_id_fkey(id, name)
        `)
        .order("appeal_date", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function usePermitsWorkflowQuery(statusFilter: string) {
  return useQuery({
    queryKey: ["permits-workflow", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("permits")
        .select(`
          *,
          parcel:parcels!permits_parcel_id_fkey(id, parcel_number, address, city)
        `)
        .order("application_date", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useNeighborhoodCertification() {
  return useQuery({
    queryKey: ["certification-neighborhood-breakdown"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      const [{ data: parcelsWithNbhd }, { data: assessments }] = await Promise.all([
        supabase.from("parcels").select("id, neighborhood_code").not("neighborhood_code", "is", null),
        supabase.from("assessments").select("parcel_id, certified").eq("tax_year", currentYear).eq("certified", true),
      ]);

      const certifiedIds = new Set((assessments || []).map(a => a.parcel_id));
      const nbhdMap = new Map<string, { total: number; certified: number }>();

      for (const p of parcelsWithNbhd || []) {
        const code = p.neighborhood_code || "Unknown";
        if (!nbhdMap.has(code)) nbhdMap.set(code, { total: 0, certified: 0 });
        const entry = nbhdMap.get(code)!;
        entry.total++;
        if (certifiedIds.has(p.id)) entry.certified++;
      }

      return Array.from(nbhdMap.entries())
        .map(([code, stats]) => ({
          code,
          total: stats.total,
          certified: stats.certified,
          rate: stats.total > 0 ? Math.round((stats.certified / stats.total) * 100) : 0,
        }))
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 15);
    },
    staleTime: 60_000,
  });
}
