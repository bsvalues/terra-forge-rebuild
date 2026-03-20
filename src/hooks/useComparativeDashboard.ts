// TerraFusion OS — Phase 78: Comparative Dashboard Hook
// Multi-cycle overlay data, snapshot generation, and YoY delta computation

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ComparisonSnapshot {
  id: string;
  county_id: string;
  snapshot_label: string;
  tax_year: number;
  neighborhood_code: string | null;
  property_class: string | null;
  total_parcels: number;
  avg_assessed_value: number;
  median_assessed_value: number;
  avg_land_value: number;
  avg_improvement_value: number;
  total_assessed_value: number;
  avg_sale_price: number | null;
  median_ratio: number | null;
  cod: number | null;
  prd: number | null;
  total_sales: number;
  qualified_sales: number;
  appeal_count: number;
  appeal_rate: number | null;
  exemption_count: number;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export interface YoYDelta {
  metric: string;
  label: string;
  prior: number;
  current: number;
  delta: number;
  deltaPct: number;
  direction: "up" | "down" | "flat";
}

/** Compute deltas between two snapshots */
export function computeDeltas(
  prior: ComparisonSnapshot,
  current: ComparisonSnapshot
): YoYDelta[] {
  const pairs: { metric: string; label: string; priorVal: number; currentVal: number }[] = [
    { metric: "avg_assessed_value", label: "Avg Assessed Value", priorVal: prior.avg_assessed_value, currentVal: current.avg_assessed_value },
    { metric: "median_assessed_value", label: "Median Assessed Value", priorVal: prior.median_assessed_value, currentVal: current.median_assessed_value },
    { metric: "avg_land_value", label: "Avg Land Value", priorVal: prior.avg_land_value, currentVal: current.avg_land_value },
    { metric: "avg_improvement_value", label: "Avg Improvement Value", priorVal: prior.avg_improvement_value, currentVal: current.avg_improvement_value },
    { metric: "total_assessed_value", label: "Total Assessed Value", priorVal: prior.total_assessed_value, currentVal: current.total_assessed_value },
    { metric: "total_parcels", label: "Total Parcels", priorVal: prior.total_parcels, currentVal: current.total_parcels },
    { metric: "total_sales", label: "Total Sales", priorVal: prior.total_sales ?? 0, currentVal: current.total_sales ?? 0 },
    { metric: "appeal_count", label: "Appeals Filed", priorVal: prior.appeal_count ?? 0, currentVal: current.appeal_count ?? 0 },
    { metric: "exemption_count", label: "Exemptions", priorVal: prior.exemption_count ?? 0, currentVal: current.exemption_count ?? 0 },
  ];

  return pairs.map(({ metric, label, priorVal, currentVal }) => {
    const delta = currentVal - priorVal;
    const deltaPct = priorVal !== 0 ? (delta / priorVal) * 100 : 0;
    return {
      metric,
      label,
      prior: priorVal,
      current: currentVal,
      delta,
      deltaPct: Math.round(deltaPct * 100) / 100,
      direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    };
  });
}

export function useComparisonSnapshots() {
  return useQuery({
    queryKey: ["comparison-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comparison_snapshots")
        .select("*")
        .order("tax_year", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ComparisonSnapshot[];
    },
    staleTime: 60_000,
  });
}

export function useGenerateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      countyId: string;
      taxYear: number;
      label?: string;
      neighborhoodCode?: string;
      propertyClass?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("generate-comparison-snapshot", {
        body: {
          county_id: params.countyId,
          tax_year: params.taxYear,
          label: params.label || null,
          neighborhood_code: params.neighborhoodCode || null,
          property_class: params.propertyClass || null,
        },
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comparison-snapshots"] });
      toast.success("Snapshot generated");
    },
    onError: (e: Error) => {
      toast.error("Snapshot failed", { description: e.message });
    },
  });
}

export function useDeleteSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("comparison_snapshots")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comparison-snapshots"] });
      toast.success("Snapshot deleted");
    },
  });
}
