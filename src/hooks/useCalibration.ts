import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateFactory } from "@/lib/queryInvalidation";
import { showChangeReceipt } from "@/lib/changeReceipt";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export interface CoefficientResult {
  variable: string;
  coefficient: number;
  std_error: number;
  t_stat: number;
  p_value: number;
}

export interface ScatterPoint {
  parcel_id: string;
  actual: number;
  predicted: number;
  residual: number;
}

export interface CalibrationResult {
  neighborhood_code: string;
  variables: string[];
  sample_size: number;
  r_squared: number;
  rmse: number;
  f_statistic: number;
  coefficients: CoefficientResult[];
  scatter: ScatterPoint[];
  diagnostics: {
    r_squared: number;
    adjusted_r_squared: number;
    rmse: number;
    f_statistic: number;
    sample_size: number;
    variables_count: number;
  };
}

const AVAILABLE_VARIABLES = [
  { id: "building_area", label: "Building Area (sqft)" },
  { id: "land_area", label: "Land Area (sqft)" },
  { id: "year_built", label: "Year Built" },
  { id: "bedrooms", label: "Bedrooms" },
  { id: "bathrooms", label: "Bathrooms" },
] as const;

export function useCalibration(neighborhoodCode: string | null) {
  const queryClient = useQueryClient();
  const [selectedVars, setSelectedVars] = useState<string[]>(["building_area", "year_built"]);
  const [result, setResult] = useState<CalibrationResult | null>(null);

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!neighborhoodCode) throw new Error("Select a neighborhood first");
      if (selectedVars.length === 0) throw new Error("Select at least one variable");

      const { data, error } = await supabase.functions.invoke("regression-calibrate", {
        body: { neighborhood_code: neighborhoodCode, variables: selectedVars },
      });

      if (error) throw error;
      if (data?.error) {
        const hint = data?.debug?.hint || "";
        throw new Error(`${data.error}${hint ? ` — ${hint}` : ""}`);
      }
      return data as CalibrationResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Calibration complete — R² = ${(data.r_squared * 100).toFixed(1)}%, n = ${data.sample_size}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!result || !neighborhoodCode) throw new Error("No calibration result to save");

      const { data: profile } = await supabase
        .from("profiles")
        .select("county_id")
        .single();

      const { error } = await supabase.from("calibration_runs").insert({
        county_id: profile?.county_id ?? (() => { throw new Error("No county assigned"); })(),
        neighborhood_code: neighborhoodCode,
        model_type: "ols",
        status: "completed",
        r_squared: result.r_squared,
        rmse: result.rmse,
        sample_size: result.sample_size,
        coefficients: result.coefficients as any,
        diagnostics: result.diagnostics as any,
        variables: result.variables,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      showChangeReceipt({
        entity: `Neighborhood ${neighborhoodCode}`,
        action: "Calibration run saved",
        impact: "neighborhood",
        reason: `R² = ${((result?.r_squared ?? 0) * 100).toFixed(1)}%, n = ${result?.sample_size ?? 0}`,
      });
      invalidateFactory(queryClient);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const history = useQuery({
    queryKey: ["calibration-history", neighborhoodCode],
    queryFn: async () => {
      if (!neighborhoodCode) return [];
      const { data } = await supabase
        .from("calibration_runs")
        .select("*")
        .eq("neighborhood_code", neighborhoodCode)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!neighborhoodCode,
  });

  return {
    availableVariables: AVAILABLE_VARIABLES,
    selectedVars,
    setSelectedVars,
    result,
    runCalibration: runMutation.mutate,
    isRunning: runMutation.isPending,
    saveRun: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    history: history.data || [],
  };
}
