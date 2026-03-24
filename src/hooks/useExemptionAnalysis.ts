import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COUNTY_ID = "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d";

// ── Interfaces ────────────────────────────────────────────────────

export interface ExemptionCountySummary {
  tax_year: number;
  county_id: string | null;
  total_count: number | null;
  approved_count: number | null;
  pending_count: number | null;
  denied_count: number | null;
  parcel_count: number | null;
  total_exemption_value: number | null;
  avg_exemption_amount: number | null;
  avg_exemption_pct: number | null;
  distinct_types: number | null;
  total_assessed_roll: number | null;
  pct_of_assessed_roll: number | null;
}

export interface ExemptionByType {
  tax_year: number | null;
  county_id: string | null;
  exemption_type: string | null;
  total_count: number | null;
  approved_count: number | null;
  pending_count: number | null;
  denied_count: number | null;
  parcel_count: number | null;
  total_exemption_value: number | null;
  avg_exemption_amount: number | null;
  min_exemption_amount: number | null;
  max_exemption_amount: number | null;
  avg_exemption_pct: number | null;
  total_assessed_in_type: number | null;
}

export interface ExemptionDetailRow {
  exemption_id: string;
  parcel_id: string | null;
  parcel_number: string | null;
  address: string | null;
  neighborhood_code: string | null;
  county_id: string | null;
  assessed_value: number | null;
  property_class: string | null;
  exemption_type: string | null;
  exemption_amount: number | null;
  exemption_percentage: number | null;
  status: string | null;
  tax_year: number | null;
  application_date: string | null;
  approval_date: string | null;
  expiration_date: string | null;
  applicant_name: string | null;
  notes: string | null;
  computed_pct_of_assessed: number | null;
}

// ── Hooks ─────────────────────────────────────────────────────────

/** County-level exemption summary by year */
export function useExemptionCountySummary() {
  return useQuery<ExemptionCountySummary[]>({
    queryKey: ["exemption-county-summary", COUNTY_ID],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("vw_exemption_county_summary")
        .select("*")
        .eq("county_id", COUNTY_ID)
        .order("tax_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExemptionCountySummary[];
    },
    staleTime: 300000,
  });
}

/** Exemption breakdown by type for a given tax year */
export function useExemptionByType(taxYear: number | null) {
  return useQuery<ExemptionByType[]>({
    queryKey: ["exemption-by-type", COUNTY_ID, taxYear],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("vw_exemption_by_type")
        .select("*")
        .eq("county_id", COUNTY_ID)
        .eq("tax_year", taxYear!)
        .order("total_exemption_value", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExemptionByType[];
    },
    enabled: !!taxYear,
    staleTime: 300000,
  });
}

/** Parcel-level exemption detail, optionally filtered by year/type/status */
export function useExemptionDetail(
  taxYear: number | null,
  exemptionType: string | null = null,
  status: string | null = null,
  limit = 150
) {
  return useQuery<ExemptionDetailRow[]>({
    queryKey: ["exemption-detail", COUNTY_ID, taxYear, exemptionType, status, limit],
    queryFn: async () => {
      let q = (supabase.from as any)("vw_exemption_detail")
        .select("*")
        .eq("county_id", COUNTY_ID)
        .eq("tax_year", taxYear!)
        .limit(limit);
      if (exemptionType) q = q.eq("exemption_type", exemptionType);
      if (status) q = q.eq("status", status);
      const { data, error } = await q.order("exemption_amount", { ascending: false });
      const { data, error } = await q.order("exemption_amount", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExemptionDetailRow[];
    },
    enabled: !!taxYear,
    staleTime: 300000,
  });
}
