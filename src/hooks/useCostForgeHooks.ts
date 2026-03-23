// TerraFusion OS — CostForge Data Hooks
// Bridges costforgeConnector.ts into React Query for component use.
// All tables use (supabase as any) cast — new tables not yet in generated types.

import { useQuery } from "@tanstack/react-query";
import {
  lookupResidentialCost,
  lookupCommercialCost,
  lookupDepreciation,
  getDepreciationTable,
  getCostMultipliers,
  getHvacRefinements,
  resolveTypeCode,
  getAllTypeCodes,
  getCalcTrace,
  getCalcTraceByLrsn,
  getCoverage,
  getCalcInputs,
  calcRCNLD,
  BENTON_COSTFORGE_CONFIG,
  type ResidentialScheduleRow,
  type CommercialScheduleRow,
  type DepreciationRow,
  type CostMultiplierRow,
  type RefinementRow,
  type ImprvTypeCode,
  type CalcTraceRow,
  type CostForgeCoverage,
  type CostForgeCalcInput,
  type CostForgeResult,
  type QualityGrade,
  type PropertyType,
} from "@/services/costforgeConnector";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback } from "react";

// ── Re-export types for consumers ────────────────────────────────────────────

export type {
  ResidentialScheduleRow,
  CommercialScheduleRow,
  DepreciationRow,
  CostMultiplierRow,
  RefinementRow,
  ImprvTypeCode,
  CalcTraceRow,
  CostForgeCoverage,
  CostForgeCalcInput,
  CostForgeResult,
  QualityGrade,
  PropertyType,
};

const COUNTY_ID = BENTON_COSTFORGE_CONFIG.defaultCountyId;
const STALE_SCHEDULE = 10 * 60 * 1000; // schedules rarely change

// ── Schedule hooks ────────────────────────────────────────────────────────────

/**
 * All residential schedule rows for the county.
 * Returns flat list; component groups by quality_grade.
 */
export function useResidentialSchedules(countyId = COUNTY_ID) {
  return useQuery<ResidentialScheduleRow[]>({
    queryKey: ["costforge-residential-schedules", countyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("costforge_residential_schedules")
        .select("*")
        .eq("county_id", countyId)
        .order("quality_grade")
        .order("min_area");
      if (error) throw new Error(error.message);
      return (data ?? []) as ResidentialScheduleRow[];
    },
    staleTime: STALE_SCHEDULE,
  });
}

/**
 * Commercial schedule rows, optionally filtered by sectionId.
 */
export function useCommercialSchedules(sectionId?: number | null, countyId = COUNTY_ID) {
  return useQuery<CommercialScheduleRow[]>({
    queryKey: ["costforge-commercial-schedules", countyId, sectionId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("costforge_commercial_schedules")
        .select("*")
        .eq("county_id", countyId)
        .order("section_id")
        .order("occupancy_code")
        .order("construction_class");
      if (sectionId != null) q = q.eq("section_id", sectionId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as CommercialScheduleRow[];
    },
    staleTime: STALE_SCHEDULE,
  });
}

/**
 * Full depreciation table for a property type.
 */
export function useDepreciationTable(propertyType: PropertyType = "residential", countyId = COUNTY_ID) {
  return useQuery<DepreciationRow[]>({
    queryKey: ["costforge-depreciation", countyId, propertyType],
    queryFn: () => getDepreciationTable(propertyType, countyId),
    staleTime: STALE_SCHEDULE,
  });
}

/**
 * All cost multipliers (local + current) for the county.
 */
export function useCostMultipliers(countyId = COUNTY_ID) {
  return useQuery<CostMultiplierRow[]>({
    queryKey: ["costforge-multipliers", countyId],
    queryFn: () => getCostMultipliers(countyId),
    staleTime: STALE_SCHEDULE,
  });
}

/**
 * CostForge schedule coverage summary.
 */
export function useCostForgeCoverage(countyId = COUNTY_ID) {
  return useQuery<CostForgeCoverage | null>({
    queryKey: ["costforge-coverage", countyId],
    queryFn: () => getCoverage(countyId),
    staleTime: STALE_SCHEDULE,
  });
}

/**
 * Calc trace rows for a parcel.
 */
export function useCalcTraceForParcel(parcelId: string | null, countyId = COUNTY_ID) {
  return useQuery<CalcTraceRow[]>({
    queryKey: ["costforge-calc-trace", parcelId, countyId],
    queryFn: () => getCalcTrace(parcelId!, countyId),
    enabled: !!parcelId,
    staleTime: 60_000,
  });
}

/**
 * All active improvement type codes.
 */
export function useImprvTypeCodes(countyId = COUNTY_ID) {
  return useQuery<ImprvTypeCode[]>({
    queryKey: ["costforge-type-codes", countyId],
    queryFn: () => getAllTypeCodes(countyId, true),
    staleTime: STALE_SCHEDULE,
  });
}

// ── RCNLD calculation hook ────────────────────────────────────────────────────

interface UseCalcRCNLDState {
  result: CostForgeResult | null;
  isLoading: boolean;
  error: string | null;
  calculate: (
    input: CostForgeCalcInput,
    qualityGrade?: QualityGrade,
    extWallType?: string,
    effectiveLifeYears?: number
  ) => Promise<void>;
  reset: () => void;
}

/**
 * Imperative hook for RCNLD calculation.
 * Component calls `calculate(input, ...)` → result populates.
 */
export function useCalcRCNLD(): UseCalcRCNLDState {
  const [result, setResult] = useState<CostForgeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (
    input: CostForgeCalcInput,
    qualityGrade: QualityGrade = "Average",
    extWallType = "Metal or Vinyl Siding",
    effectiveLifeYears = 45
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await calcRCNLD(input, qualityGrade, extWallType, effectiveLifeYears);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, calculate, reset };
}
