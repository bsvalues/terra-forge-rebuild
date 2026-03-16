// TerraFusion OS — Value Adjustment Ledger Hook
// Governed read contract for the value_adjustments table with parcel joins

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ValueAdjustmentRow {
  id: string;
  parcel_id: string;
  parcel_number: string;
  parcel_address: string;
  adjustment_type: string;
  previous_value: number;
  new_value: number;
  adjustment_reason: string | null;
  applied_by: string;
  applied_at: string;
  calibration_run_id: string | null;
  rolled_back_at: string | null;
}

export interface LedgerFilters {
  adjustmentType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  showRolledBack?: boolean;
}

export interface LedgerStats {
  totalAdjustments: number;
  totalDelta: number;
  avgDelta: number;
  rolledBackCount: number;
  typeBreakdown: Record<string, number>;
}

export function useValueAdjustmentLedger(filters: LedgerFilters = {}) {
  return useQuery({
    queryKey: ["value-adjustment-ledger", filters],
    queryFn: async (): Promise<{ rows: ValueAdjustmentRow[]; stats: LedgerStats }> => {
      let query = supabase
        .from("value_adjustments")
        .select(`
          id,
          parcel_id,
          adjustment_type,
          previous_value,
          new_value,
          adjustment_reason,
          applied_by,
          applied_at,
          calibration_run_id,
          rolled_back_at,
          parcels!inner(parcel_number, address)
        `)
        .order("applied_at", { ascending: false });

      if (filters.adjustmentType && filters.adjustmentType !== "all") {
        query = query.eq("adjustment_type", filters.adjustmentType);
      }

      if (filters.dateFrom) {
        query = query.gte("applied_at", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("applied_at", filters.dateTo);
      }

      if (!filters.showRolledBack) {
        query = query.is("rolled_back_at", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows: ValueAdjustmentRow[] = (data ?? []).map((row: any) => ({
        id: row.id,
        parcel_id: row.parcel_id,
        parcel_number: row.parcels?.parcel_number ?? "Unknown",
        parcel_address: row.parcels?.address ?? "Unknown",
        adjustment_type: row.adjustment_type,
        previous_value: row.previous_value,
        new_value: row.new_value,
        adjustment_reason: row.adjustment_reason,
        applied_by: row.applied_by,
        applied_at: row.applied_at,
        calibration_run_id: row.calibration_run_id,
        rolled_back_at: row.rolled_back_at,
      }));

      // Apply client-side search filter
      const filtered = filters.search
        ? rows.filter(
            (r) =>
              r.parcel_number.toLowerCase().includes(filters.search!.toLowerCase()) ||
              r.parcel_address.toLowerCase().includes(filters.search!.toLowerCase()) ||
              (r.adjustment_reason ?? "").toLowerCase().includes(filters.search!.toLowerCase())
          )
        : rows;

      // Compute stats
      const typeBreakdown: Record<string, number> = {};
      let totalDelta = 0;
      let rolledBackCount = 0;

      for (const row of filtered) {
        totalDelta += row.new_value - row.previous_value;
        typeBreakdown[row.adjustment_type] = (typeBreakdown[row.adjustment_type] ?? 0) + 1;
        if (row.rolled_back_at) rolledBackCount++;
      }

      return {
        rows: filtered,
        stats: {
          totalAdjustments: filtered.length,
          totalDelta,
          avgDelta: filtered.length > 0 ? totalDelta / filtered.length : 0,
          rolledBackCount,
          typeBreakdown,
        },
      };
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
