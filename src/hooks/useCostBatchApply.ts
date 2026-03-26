// TerraFusion OS — Phase 27: Cost Approach Batch Apply Hook

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { computeCostApproach, type CostSchedule, type DepreciationRow } from "./useCostSchedule";

export interface CostApproachRunRow {
  id: string;
  county_id: string;
  neighborhood_code: string;
  schedule_id: string;
  parcels_processed: number;
  parcels_matched: number;
  median_ratio: number | null;
  cod: number | null;
  mean_ratio: number | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BatchCostResult {
  parcelId: string;
  parcelNumber: string;
  costValue: number;
  salePrice: number | null;
  ratio: number | null;
  rcnew: number;
  depreciatedValue: number;
  landValue: number;
  effectiveAge: number;
}

export function useCostApproachRuns(neighborhoodCode: string | null) {
  return useQuery({
    queryKey: ["cost-approach-runs", neighborhoodCode],
    enabled: !!neighborhoodCode,
    staleTime: 60_000,
    queryFn: async (): Promise<CostApproachRunRow[]> => {
      const { data, error } = await supabase
        .from("cost_approach_runs")
        .select("*")
        .eq("neighborhood_code", neighborhoodCode!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as CostApproachRunRow[];
    },
  });
}

export function useBatchCostApply() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      neighborhoodCode,
      schedules,
      depreciationRows,
    }: {
      neighborhoodCode: string;
      schedules: CostSchedule[];
      depreciationRows: DepreciationRow[];
    }): Promise<{ results: BatchCostResult[]; stats: { median: number | null; cod: number | null; mean: number | null; matched: number; processed: number } }> => {
      // 1. Fetch parcels in this neighborhood
      const { data: parcels, error: pErr } = await supabase
        .from("parcels")
        .select("id, parcel_number, building_area, year_built, property_class, land_value, assessed_value, neighborhood_code")
        .eq("neighborhood_code", neighborhoodCode)
        .gt("building_area", 0)
        .limit(1000);
      if (pErr) throw pErr;

      // 2. Fetch qualified sales for ratio comparison
      const parcelIds = (parcels ?? []).map((p) => p.id);
      const saleLookup = new Map<string, number>();
      if (parcelIds.length > 0) {
        const { data: sales } = await supabase
          .from("sales")
          .select("parcel_id, sale_price")
          .in("parcel_id", parcelIds.slice(0, 500))
          .eq("is_qualified", true)
          .gt("sale_price", 0);
        for (const s of sales ?? []) {
          saleLookup.set(s.parcel_id, s.sale_price);
        }
      }

      // 3. Run cost approach for each parcel
      const results: BatchCostResult[] = [];
      for (const p of parcels ?? []) {
        const calc = computeCostApproach(
          {
            buildingArea: p.building_area ?? 0,
            qualityGrade: "Average",
            propertyClass: p.property_class ?? "Residential",
            yearBuilt: p.year_built ?? 1980,
            condition: 1.0,
            landValue: p.land_value ?? 0,
          },
          schedules,
          depreciationRows
        );
        if (!calc) continue;

        const sp = saleLookup.get(p.id) ?? null;
        results.push({
          parcelId: p.id,
          parcelNumber: p.parcel_number ?? p.id,
          costValue: calc.totalValue,
          salePrice: sp,
          ratio: sp ? calc.totalValue / sp : null,
          rcnew: calc.rcnew,
          depreciatedValue: calc.depreciatedValue,
          landValue: calc.landValue,
          effectiveAge: calc.effectiveAge,
        });
      }

      // 4. Compute stats on ratios
      const ratios = results.map((r) => r.ratio).filter((r): r is number => r !== null);
      const sorted = [...ratios].sort((a, b) => a - b);
      const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : null;
      const mean = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;
      let cod: number | null = null;
      if (median && ratios.length > 1) {
        const avgAbsDev = ratios.reduce((sum, r) => sum + Math.abs(r - median), 0) / ratios.length;
        cod = (avgAbsDev / median) * 100;
      }

      return {
        results,
        stats: { median, cod, mean, matched: ratios.length, processed: results.length },
      };
    },
    onSuccess: () => {
      toast.success("Batch cost approach complete");
      qc.invalidateQueries({ queryKey: ["cost-approach-runs"] });
    },
    onError: (err: Error) => toast.error(`Batch cost failed: ${err.message}`),
  });
}

export function useSaveCostRun() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      neighborhoodCode,
      scheduleId,
      stats,
    }: {
      neighborhoodCode: string;
      scheduleId: string;
      stats: { median: number | null; cod: number | null; mean: number | null; matched: number; processed: number };
    }) => {
      const { data: profile } = await supabase.from("profiles").select("county_id").single();
      const { error } = await supabase.from("cost_approach_runs").insert({
        county_id: profile?.county_id ?? "",
        neighborhood_code: neighborhoodCode,
        schedule_id: scheduleId,
        parcels_processed: stats.processed,
        parcels_matched: stats.matched,
        median_ratio: stats.median,
        cod: stats.cod,
        mean_ratio: stats.mean,
        status: "complete",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cost run saved");
      qc.invalidateQueries({ queryKey: ["cost-approach-runs"] });
    },
    onError: (err: Error) => toast.error(`Save failed: ${err.message}`),
  });
}
