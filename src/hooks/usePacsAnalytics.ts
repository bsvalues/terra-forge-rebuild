import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Table Stats ───────────────────────────────────────────────────
export interface PacsTableStat {
  table_name: string;
  row_count: number;
  unique_props: number;
  total_value: number | null;
  avg_value: number | null;
}

export function usePacsTableStats() {
  return useQuery({
    queryKey: ["pacs-table-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vw_pacs_table_stats")
        .select("*");
      if (error) throw error;
      return (data ?? []) as PacsTableStat[];
    },
    staleTime: 300000,
  });
}

// ── Value by Neighborhood ─────────────────────────────────────────
export interface PacsNeighborhoodValue {
  neighborhood: string;
  property_count: number;
  total_appraised: number;
  avg_appraised: number;
  min_appraised: number;
  max_appraised: number;
  total_taxable: number;
  use_code_count: number;
}

export function usePacsValueByNeighborhood() {
  return useQuery({
    queryKey: ["pacs-value-by-neighborhood"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vw_pacs_value_by_neighborhood")
        .select("*")
        .limit(100);
      if (error) throw error;
      return (data ?? []) as PacsNeighborhoodValue[];
    },
    staleTime: 300000,
  });
}

// ── Sales by Year ─────────────────────────────────────────────────
export interface PacsSalesByYear {
  sale_year: number;
  sale_count: number;
  total_volume: number;
  avg_price: number;
  max_price: number;
  valid_price_count: number;
  avg_ratio: number | null;
}

export function usePacsSalesByYear() {
  return useQuery({
    queryKey: ["pacs-sales-by-year"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_pacs_sales_by_year")
        .select("*");
      if (error) throw error;
      return (data ?? []) as PacsSalesByYear[];
    },
    staleTime: 300000,
  });
}

// ── Bridge Coverage ───────────────────────────────────────────────
export interface PacsBridgeCoverage {
  total_parcels: number;
  linked_parcels: number;
  pacs_owner_props: number;
  pacs_assessed_props: number;
  pacs_sales_props: number;
  pacs_profile_props: number;
  link_coverage_pct: number;
}

export function usePacsBridgeCoverage() {
  return useQuery({
    queryKey: ["pacs-bridge-coverage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_pacs_bridge_coverage")
        .select("*")
        .single();
      if (error) throw error;
      return data as PacsBridgeCoverage;
    },
    staleTime: 300000,
  });
}
