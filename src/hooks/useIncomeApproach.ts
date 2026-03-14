// TerraFusion OS — Phase 28: Income Approach Hook

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IncomePropertyRow {
  id: string;
  county_id: string;
  parcel_id: string;
  gross_rental_income: number;
  vacancy_rate: number;
  operating_expenses: number;
  net_operating_income: number;
  cap_rate: number | null;
  grm: number | null;
  property_type: string;
  income_year: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeApproachRunRow {
  id: string;
  county_id: string;
  neighborhood_code: string;
  parcels_processed: number;
  parcels_with_income: number;
  median_cap_rate: number | null;
  median_grm: number | null;
  median_ratio: number | null;
  cod: number | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeCalcResult {
  noi: number;
  capRateValue: number | null;  // NOI / cap_rate
  grmValue: number | null;      // gross_income * GRM
  reconciled: number | null;    // average of available methods
}

// ── Read hooks ──────────────────────────────────────────────────

export function useIncomeProperties(neighborhoodCode: string | null) {
  return useQuery({
    queryKey: ["income-properties", neighborhoodCode],
    enabled: !!neighborhoodCode,
    staleTime: 60_000,
    queryFn: async (): Promise<IncomePropertyRow[]> => {
      // Get parcel IDs in this neighborhood first
      const { data: parcels } = await supabase
        .from("parcels")
        .select("id")
        .eq("neighborhood_code", neighborhoodCode!)
        .limit(1000);

      const parcelIds = (parcels ?? []).map((p) => p.id);
      if (parcelIds.length === 0) return [];

      const { data, error } = await supabase
        .from("income_properties" as any)
        .select("*")
        .in("parcel_id", parcelIds.slice(0, 500))
        .order("income_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as IncomePropertyRow[];
    },
  });
}

export function useIncomeApproachRuns(neighborhoodCode: string | null) {
  return useQuery({
    queryKey: ["income-approach-runs", neighborhoodCode],
    enabled: !!neighborhoodCode,
    staleTime: 60_000,
    queryFn: async (): Promise<IncomeApproachRunRow[]> => {
      const { data, error } = await supabase
        .from("income_approach_runs" as any)
        .select("*")
        .eq("neighborhood_code", neighborhoodCode!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as IncomeApproachRunRow[];
    },
  });
}

// ── Mutations ───────────────────────────────────────────────────

export function useUpsertIncomeProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      parcel_id: string;
      gross_rental_income: number;
      vacancy_rate: number;
      operating_expenses: number;
      cap_rate: number | null;
      grm: number | null;
      property_type: string;
      income_year: number;
      notes?: string;
    }) => {
      const { data: profile } = await supabase.from("profiles").select("county_id").single();
      const { error } = await supabase.from("income_properties" as any).upsert(
        {
          county_id: profile?.county_id ?? "",
          parcel_id: input.parcel_id,
          gross_rental_income: input.gross_rental_income,
          vacancy_rate: input.vacancy_rate,
          operating_expenses: input.operating_expenses,
          cap_rate: input.cap_rate,
          grm: input.grm,
          property_type: input.property_type,
          income_year: input.income_year,
          notes: input.notes ?? null,
        },
        { onConflict: "parcel_id,income_year" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Income data saved");
      qc.invalidateQueries({ queryKey: ["income-properties"] });
    },
    onError: (err: Error) => toast.error(`Save failed: ${err.message}`),
  });
}

export function useDeleteIncomeProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("income_properties" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Income record deleted");
      qc.invalidateQueries({ queryKey: ["income-properties"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Batch Income Apply ──────────────────────────────────────────

export interface BatchIncomeResult {
  parcelId: string;
  parcelNumber: string;
  noi: number;
  capRate: number | null;
  grm: number | null;
  capRateValue: number | null;
  grmValue: number | null;
  reconciledValue: number | null;
  salePrice: number | null;
  ratio: number | null;
}

export function useBatchIncomeApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      neighborhoodCode,
      defaultCapRate,
      defaultGrm,
    }: {
      neighborhoodCode: string;
      defaultCapRate: number;
      defaultGrm: number;
    }): Promise<{
      results: BatchIncomeResult[];
      stats: {
        processed: number;
        withIncome: number;
        medianCapRate: number | null;
        medianGrm: number | null;
        medianRatio: number | null;
        cod: number | null;
      };
    }> => {
      // 1. Get parcels in neighborhood
      const { data: parcels } = await supabase
        .from("parcels")
        .select("id, parcel_number, assessed_value, neighborhood_code")
        .eq("neighborhood_code", neighborhoodCode)
        .limit(1000);

      const parcelIds = (parcels ?? []).map((p) => p.id);
      if (parcelIds.length === 0) return { results: [], stats: { processed: 0, withIncome: 0, medianCapRate: null, medianGrm: null, medianRatio: null, cod: null } };

      // 2. Get income data
      const { data: incomeData } = await supabase
        .from("income_properties" as any)
        .select("*")
        .in("parcel_id", parcelIds.slice(0, 500));
      const incomeMap = new Map<string, IncomePropertyRow>();
      for (const inc of (incomeData ?? []) as unknown as IncomePropertyRow[]) {
        incomeMap.set(inc.parcel_id, inc);
      }

      // 3. Get sales
      const { data: sales } = await supabase
        .from("sales")
        .select("parcel_id, sale_price")
        .in("parcel_id", parcelIds.slice(0, 500))
        .eq("is_qualified", true)
        .gt("sale_price", 0);
      const saleLookup = new Map<string, number>();
      for (const s of sales ?? []) saleLookup.set(s.parcel_id, s.sale_price);

      // 4. Compute income approach for each
      const results: BatchIncomeResult[] = [];
      for (const p of parcels ?? []) {
        const inc = incomeMap.get(p.id);
        if (!inc) continue;

        const noi = inc.net_operating_income;
        const cr = inc.cap_rate ?? defaultCapRate;
        const grm = inc.grm ?? defaultGrm;

        const capRateValue = cr > 0 ? noi / cr : null;
        const grmValue = grm > 0 ? inc.gross_rental_income * grm : null;

        let reconciledValue: number | null = null;
        if (capRateValue && grmValue) reconciledValue = (capRateValue + grmValue) / 2;
        else reconciledValue = capRateValue ?? grmValue;

        const sp = saleLookup.get(p.id) ?? null;

        results.push({
          parcelId: p.id,
          parcelNumber: p.parcel_number ?? p.id,
          noi,
          capRate: cr,
          grm,
          capRateValue,
          grmValue,
          reconciledValue,
          salePrice: sp,
          ratio: sp && reconciledValue ? reconciledValue / sp : null,
        });
      }

      // 5. Stats
      const capRates = results.map((r) => r.capRate).filter((v): v is number => v !== null);
      const grms = results.map((r) => r.grm).filter((v): v is number => v !== null);
      const ratios = results.map((r) => r.ratio).filter((v): v is number => v !== null);

      const median = (arr: number[]) => {
        if (arr.length === 0) return null;
        const s = [...arr].sort((a, b) => a - b);
        return s[Math.floor(s.length / 2)];
      };

      const medianRatio = median(ratios);
      let cod: number | null = null;
      if (medianRatio && ratios.length > 1) {
        const avgAbsDev = ratios.reduce((sum, r) => sum + Math.abs(r - medianRatio), 0) / ratios.length;
        cod = (avgAbsDev / medianRatio) * 100;
      }

      return {
        results,
        stats: {
          processed: results.length,
          withIncome: results.length,
          medianCapRate: median(capRates),
          medianGrm: median(grms),
          medianRatio,
          cod,
        },
      };
    },
    onSuccess: () => {
      toast.success("Batch income approach complete");
      qc.invalidateQueries({ queryKey: ["income-approach-runs"] });
    },
    onError: (err: Error) => toast.error(`Batch failed: ${err.message}`),
  });
}

export function useSaveIncomeRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      neighborhoodCode,
      stats,
    }: {
      neighborhoodCode: string;
      stats: { processed: number; withIncome: number; medianCapRate: number | null; medianGrm: number | null; medianRatio: number | null; cod: number | null };
    }) => {
      const { data: profile } = await supabase.from("profiles").select("county_id").single();
      const { error } = await supabase.from("income_approach_runs" as any).insert({
        county_id: profile?.county_id ?? "",
        neighborhood_code: neighborhoodCode,
        parcels_processed: stats.processed,
        parcels_with_income: stats.withIncome,
        median_cap_rate: stats.medianCapRate,
        median_grm: stats.medianGrm,
        median_ratio: stats.medianRatio,
        cod: stats.cod,
        status: "complete",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Income run saved");
      qc.invalidateQueries({ queryKey: ["income-approach-runs"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Pure calculation helpers ────────────────────────────────────

export function computeIncomeApproach(
  grossIncome: number,
  vacancyRate: number,
  expenses: number,
  capRate: number,
  grm: number
): IncomeCalcResult {
  const effectiveGross = grossIncome * (1 - vacancyRate);
  const noi = effectiveGross - expenses;

  const capRateValue = capRate > 0 ? noi / capRate : null;
  const grmValue = grm > 0 ? grossIncome * grm : null;

  let reconciled: number | null = null;
  if (capRateValue && grmValue) reconciled = (capRateValue + grmValue) / 2;
  else reconciled = capRateValue ?? grmValue;

  return { noi, capRateValue, grmValue, reconciled };
}
