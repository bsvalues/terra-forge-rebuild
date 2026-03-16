// TerraFusion OS — Phase 56: Model Registry Hook
// Unified query across all valuation model run tables

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModelRunRecord {
  id: string;
  approach: "regression" | "avm" | "cost" | "income";
  approachLabel: string;
  modelType: string;
  neighborhood: string;
  status: string;
  sampleSize: number | null;
  rSquared: number | null;
  rmse: number | null;
  cod: number | null;
  medianRatio: number | null;
  createdAt: string;
}

export interface ModelRegistryStats {
  totalRuns: number;
  byApproach: Record<string, number>;
  avgRSquared: number | null;
  avgCod: number | null;
}

async function fetchModelRegistry(): Promise<ModelRunRecord[]> {
  const [calibRes, avmRes, costRes, incomeRes] = await Promise.all([
    supabase.from("calibration_runs").select("id, model_type, neighborhood_code, status, sample_size, r_squared, rmse, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("avm_runs").select("id, model_type, model_name, status, sample_size, r_squared, rmse, cod, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("cost_approach_runs").select("id, neighborhood_code, status, parcels_processed, median_ratio, cod, mean_ratio, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("income_approach_runs").select("id, neighborhood_code, status, parcels_processed, median_ratio, cod, median_cap_rate, created_at").order("created_at", { ascending: false }).limit(200),
  ]);

  const runs: ModelRunRecord[] = [];

  (calibRes.data ?? []).forEach((r) =>
    runs.push({
      id: r.id, approach: "regression", approachLabel: "Regression",
      modelType: r.model_type, neighborhood: r.neighborhood_code,
      status: r.status, sampleSize: r.sample_size, rSquared: r.r_squared,
      rmse: r.rmse, cod: null, medianRatio: null, createdAt: r.created_at,
    })
  );

  (avmRes.data ?? []).forEach((r) =>
    runs.push({
      id: r.id, approach: "avm", approachLabel: "AVM",
      modelType: `${r.model_type} — ${r.model_name}`, neighborhood: "County-wide",
      status: r.status, sampleSize: r.sample_size, rSquared: r.r_squared,
      rmse: r.rmse, cod: r.cod, medianRatio: null, createdAt: r.created_at,
    })
  );

  (costRes.data ?? []).forEach((r) =>
    runs.push({
      id: r.id, approach: "cost", approachLabel: "Cost",
      modelType: "Cost Schedule", neighborhood: r.neighborhood_code,
      status: r.status, sampleSize: r.parcels_processed, rSquared: null,
      rmse: null, cod: r.cod, medianRatio: r.median_ratio, createdAt: r.created_at,
    })
  );

  (incomeRes.data ?? []).forEach((r) =>
    runs.push({
      id: r.id, approach: "income", approachLabel: "Income",
      modelType: "Income Capitalization", neighborhood: r.neighborhood_code,
      status: r.status, sampleSize: r.parcels_processed, rSquared: null,
      rmse: null, cod: r.cod, medianRatio: r.median_ratio, createdAt: r.created_at,
    })
  );

  runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return runs;
}

export function useModelRegistry() {
  return useQuery({
    queryKey: ["model-registry"],
    queryFn: fetchModelRegistry,
    staleTime: 30_000,
  });
}

export function computeModelStats(runs: ModelRunRecord[]): ModelRegistryStats {
  const byApproach: Record<string, number> = {};
  runs.forEach((r) => {
    byApproach[r.approachLabel] = (byApproach[r.approachLabel] || 0) + 1;
  });
  const r2Values = runs.map((r) => r.rSquared).filter((v): v is number => v !== null);
  const codValues = runs.map((r) => r.cod).filter((v): v is number => v !== null);
  return {
    totalRuns: runs.length,
    byApproach,
    avgRSquared: r2Values.length ? r2Values.reduce((s, v) => s + v, 0) / r2Values.length : null,
    avgCod: codValues.length ? codValues.reduce((s, v) => s + v, 0) / codValues.length : null,
  };
}
