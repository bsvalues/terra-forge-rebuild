// TerraFusion OS — Value Adjustment Ledger Hook
// Manages batch value adjustments from Factory → Parcels

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ValueAdjustment {
  id: string;
  county_id: string;
  parcel_id: string;
  adjustment_type: string;
  previous_value: number;
  new_value: number;
  adjustment_reason: string | null;
  calibration_run_id: string | null;
  applied_by: string;
  applied_at: string;
  rolled_back_at: string | null;
}

export interface BatchApplyResult {
  applied: number;
  skipped: number;
  errors: string[];
}

/**
 * Fetch value adjustment history for a specific parcel.
 */
export function useParcelAdjustments(parcelId: string | null) {
  return useQuery({
    queryKey: ["parcel-adjustments", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("value_adjustments")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("applied_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as ValueAdjustment[];
    },
    enabled: !!parcelId,
    staleTime: 30_000,
  });
}

/**
 * Fetch adjustment history for a calibration run (batch view).
 */
export function useCalibrationAdjustments(calibrationRunId: string | null) {
  return useQuery({
    queryKey: ["calibration-adjustments", calibrationRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("value_adjustments")
        .select("*")
        .eq("calibration_run_id", calibrationRunId!)
        .is("rolled_back_at", null)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ValueAdjustment[];
    },
    enabled: !!calibrationRunId,
    staleTime: 30_000,
  });
}

/**
 * Fetch recent batch adjustments across all runs.
 */
export function useRecentBatchAdjustments() {
  return useQuery({
    queryKey: ["recent-batch-adjustments"],
    queryFn: async () => {
      // Get unique calibration runs with adjustment counts
      const { data, error } = await supabase
        .from("value_adjustments")
        .select("calibration_run_id, adjustment_type, applied_at, applied_by, adjustment_reason")
        .not("calibration_run_id", "is", null)
        .is("rolled_back_at", null)
        .order("applied_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      // Group by calibration_run_id
      const batches = new Map<string, {
        calibration_run_id: string;
        count: number;
        applied_at: string;
        applied_by: string;
        adjustment_type: string;
        adjustment_reason: string | null;
      }>();

      for (const row of (data || [])) {
        const key = row.calibration_run_id!;
        if (!batches.has(key)) {
          batches.set(key, {
            calibration_run_id: key,
            count: 0,
            applied_at: row.applied_at,
            applied_by: row.applied_by,
            adjustment_type: row.adjustment_type,
            adjustment_reason: row.adjustment_reason,
          });
        }
        batches.get(key)!.count++;
      }

      return Array.from(batches.values());
    },
    staleTime: 30_000,
  });
}

/**
 * Rollback a batch of adjustments by calibration_run_id.
 */
export function useRollbackBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (calibrationRunId: string) => {
      // Get all active adjustments for this run
      const { data: adjustments, error: fetchError } = await supabase
        .from("value_adjustments")
        .select("id, parcel_id, previous_value")
        .eq("calibration_run_id", calibrationRunId)
        .is("rolled_back_at", null);

      if (fetchError) throw fetchError;
      if (!adjustments || adjustments.length === 0) throw new Error("No active adjustments to rollback");

      // Restore previous values on parcels
      for (const adj of adjustments) {
        await supabase
          .from("parcels")
          .update({ assessed_value: adj.previous_value })
          .eq("id", adj.parcel_id);
      }

      // Mark adjustments as rolled back
      const { error: rollbackError } = await supabase
        .from("value_adjustments")
        .update({ rolled_back_at: new Date().toISOString() })
        .eq("calibration_run_id", calibrationRunId)
        .is("rolled_back_at", null);

      if (rollbackError) throw rollbackError;

      return { rolledBack: adjustments.length };
    },
    onSuccess: (result) => {
      toast.success(`Rolled back ${result.rolledBack} adjustments`);
      queryClient.invalidateQueries({ queryKey: ["recent-batch-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["calibration-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["parcel-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["parcel-search"] });
    },
    onError: (err: Error) => {
      toast.error("Rollback failed", { description: err.message });
    },
  });
}
