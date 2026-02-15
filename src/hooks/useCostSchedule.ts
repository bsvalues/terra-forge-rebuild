import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CostSchedule {
  id: string;
  county_id: string;
  property_class: string;
  quality_grade: string;
  base_cost_per_sqft: number;
  effective_year: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DepreciationRow {
  id: string;
  schedule_id: string;
  age_from: number;
  age_to: number;
  depreciation_pct: number;
  condition_modifier: number;
  created_at: string;
}

export interface CostCalcInputs {
  buildingArea: number;
  qualityGrade: string;
  propertyClass: string;
  yearBuilt: number;
  condition: number; // 0.0–1.0 modifier
  landValue: number;
}

export interface CostCalcResult {
  rcnew: number;
  depreciationPct: number;
  depreciatedValue: number;
  landValue: number;
  totalValue: number;
  effectiveAge: number;
}

export function useCostSchedules() {
  return useQuery({
    queryKey: ["cost-schedules"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_schedules")
        .select("*")
        .order("property_class")
        .order("quality_grade");
      if (error) throw error;
      return (data ?? []) as CostSchedule[];
    },
  });
}

export function useDepreciationRows(scheduleId: string | null) {
  return useQuery({
    queryKey: ["cost-depreciation", scheduleId],
    enabled: !!scheduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_depreciation")
        .select("*")
        .eq("schedule_id", scheduleId!)
        .order("age_from");
      if (error) throw error;
      return (data ?? []) as DepreciationRow[];
    },
  });
}

export function useCostScheduleMutations() {
  const qc = useQueryClient();

  const upsertSchedule = useMutation({
    mutationFn: async (s: Omit<CostSchedule, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: profile } = await supabase.from("profiles").select("county_id").single();
      const county_id = profile?.county_id ?? s.county_id;
      const { data, error } = await supabase
        .from("cost_schedules")
        .upsert({
          county_id,
          property_class: s.property_class,
          quality_grade: s.quality_grade,
          base_cost_per_sqft: s.base_cost_per_sqft,
          effective_year: s.effective_year,
        }, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Cost schedule saved");
      qc.invalidateQueries({ queryKey: ["cost-schedules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Schedule deleted");
      qc.invalidateQueries({ queryKey: ["cost-schedules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { upsertSchedule, deleteSchedule };
}

/** Pure function: compute cost approach value */
export function computeCostApproach(
  inputs: CostCalcInputs,
  schedules: CostSchedule[],
  depreciationRows: DepreciationRow[],
  currentYear: number = new Date().getFullYear()
): CostCalcResult | null {
  const schedule = schedules.find(
    (s) => s.property_class === inputs.propertyClass && s.quality_grade === inputs.qualityGrade
  );
  if (!schedule) return null;

  const rcnew = inputs.buildingArea * schedule.base_cost_per_sqft;
  const effectiveAge = Math.max(0, currentYear - inputs.yearBuilt);

  // Find depreciation row
  const depRow = depreciationRows.find(
    (d) => d.schedule_id === schedule.id && effectiveAge >= d.age_from && effectiveAge <= d.age_to
  );
  const basePct = depRow?.depreciation_pct ?? Math.min(effectiveAge * 1.0, 80); // fallback: 1%/year, max 80%
  const condMod = depRow?.condition_modifier ?? 1.0;
  const depreciationPct = Math.min(basePct * condMod * inputs.condition, 95);

  const depreciatedValue = rcnew * (1 - depreciationPct / 100);

  return {
    rcnew,
    depreciationPct,
    depreciatedValue,
    landValue: inputs.landValue,
    totalValue: depreciatedValue + inputs.landValue,
    effectiveAge,
  };
}
