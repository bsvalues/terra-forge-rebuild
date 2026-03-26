import { useState } from "react";
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
  variables_dropped?: string[];
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
  { id: "assessed_value", label: "Assessed Value ($)" },
] as const;

export function useCalibration(neighborhoodCode: string | null) {
  const queryClient = useQueryClient();
  const countyId = useActiveCountyId();
  const [selectedVars, setSelectedVars] = useState<string[]>(["building_area", "year_built"]);
  const [result, setResult] = useState<CalibrationResult | null>(null);

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!neighborhoodCode) throw new Error("Select a neighborhood first");
      if (!countyId) throw new Error("No county assigned to your profile");
      if (selectedVars.length === 0) throw new Error("Select at least one variable");

      const { data, error } = await supabase.functions.invoke("regression-calibrate", {
        body: { neighborhood_code: neighborhoodCode, county_id: countyId, variables: selectedVars },
      });

      if (error) throw error;
      if (data?.error) {
        const debug = data?.debug;
        const hint = debug?.hint || "";
        const salesCount = debug?.parcels_with_sales ?? 0;
        const _totalParcels = debug?.parcels_in_neighborhood ?? 0;
        const usableVars = debug?.usable_variables ?? [];

        if (salesCount === 0) {
          throw new Error(
            `No qualified sales found in neighborhood "${neighborhoodCode}". ` +
            `Calibration requires at least 3 parcels with sales data. ` +
            `Import sales data first via Home → Data Ops.`
          );
        }
        if (salesCount < 4) {
          throw new Error(
            `Neighborhood "${neighborhoodCode}" has only ${salesCount} parcel(s) with sales ` +
            `(need ≥ ${(usableVars.length || selectedVars.length) + 2}). ` +
            `Choose a larger neighborhood or generate more synthetic sales.`
          );
        }
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
      if (!countyId) throw new Error("No county assigned");

      const { error } = await supabase.from("calibration_runs").insert({
        county_id: countyId,
        neighborhood_code: neighborhoodCode,
        model_type: "ols",
        status: "completed",
        r_squared: result.r_squared,
        rmse: result.rmse,
        sample_size: result.sample_size,
        coefficients: JSON.parse(JSON.stringify(result.coefficients)),
        diagnostics: JSON.parse(JSON.stringify(result.diagnostics)),
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
