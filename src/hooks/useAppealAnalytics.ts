// TerraFusion OS — Phase 57: Appeal Analytics Hook
// Governed data access for county-wide appeal intelligence

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppealRecord {
  id: string;
  parcelId: string;
  parcelNumber: string;
  address: string;
  status: string;
  appealDate: string;
  originalValue: number;
  requestedValue: number | null;
  finalValue: number | null;
  resolutionType: string | null;
  resolutionDate: string | null;
  neighborhoodCode: string | null;
}

export interface AppealStats {
  total: number;
  pending: number;
  resolved: number;
  withdrawn: number;
  winRate: number; // % resolved in taxpayer's favor
  totalContested: number; // sum of original values under appeal
  totalReduction: number; // sum of (original - final) for resolved
  avgReduction: number;
  byStatus: Record<string, number>;
  byResolution: Record<string, number>;
  byMonth: { month: string; count: number }[];
  hotspots: { neighborhood: string; count: number; avgReduction: number }[];
}

function computeStats(records: AppealRecord[]): AppealStats {
  const byStatus: Record<string, number> = {};
  const byResolution: Record<string, number> = {};
  const monthMap: Record<string, number> = {};
  const hoodMap: Record<string, { count: number; totalReduction: number }> = {};

  let pending = 0;
  let resolved = 0;
  let withdrawn = 0;
  let taxpayerWins = 0;
  let totalContested = 0;
  let totalReduction = 0;
  let resolvedWithValues = 0;

  for (const r of records) {
    // Status counts
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.status === "pending" || r.status === "scheduled") pending++;
    else if (r.status === "withdrawn") withdrawn++;
    else resolved++;

    // Resolution type
    if (r.resolutionType) {
      byResolution[r.resolutionType] = (byResolution[r.resolutionType] || 0) + 1;
    }

    // Value analysis
    totalContested += r.originalValue;
    if (r.finalValue != null && r.finalValue < r.originalValue) {
      const reduction = r.originalValue - r.finalValue;
      totalReduction += reduction;
      taxpayerWins++;
      resolvedWithValues++;
    } else if (r.finalValue != null) {
      resolvedWithValues++;
    }

    // Monthly trend
    const month = r.appealDate.substring(0, 7); // YYYY-MM
    monthMap[month] = (monthMap[month] || 0) + 1;

    // Neighborhood hotspots
    const hood = r.neighborhoodCode || "Unknown";
    if (!hoodMap[hood]) hoodMap[hood] = { count: 0, totalReduction: 0 };
    hoodMap[hood].count++;
    if (r.finalValue != null && r.finalValue < r.originalValue) {
      hoodMap[hood].totalReduction += r.originalValue - r.finalValue;
    }
  }

  const byMonth = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const hotspots = Object.entries(hoodMap)
    .map(([neighborhood, data]) => ({
      neighborhood,
      count: data.count,
      avgReduction: data.count > 0 ? data.totalReduction / data.count : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: records.length,
    pending,
    resolved,
    withdrawn,
    winRate: resolvedWithValues > 0 ? (taxpayerWins / resolvedWithValues) * 100 : 0,
    totalContested,
    totalReduction,
    avgReduction: resolvedWithValues > 0 ? totalReduction / resolvedWithValues : 0,
    byStatus,
    byResolution,
    byMonth,
    hotspots,
  };
}

export function useAppealAnalytics() {
  return useQuery({
    queryKey: ["appeal-analytics"],
    queryFn: async (): Promise<{ records: AppealRecord[]; stats: AppealStats }> => {
      const { data, error } = await supabase
        .from("appeals")
        .select(`
          id, status, appeal_date, original_value, requested_value,
          final_value, resolution_type, resolution_date,
          parcels!inner(id, parcel_number, address, neighborhood_code)
        `)
        .order("appeal_date", { ascending: false })
        .limit(500);

      if (error) throw error;

      const records: AppealRecord[] = (data || []).map((row: any) => ({
        id: row.id,
        parcelId: row.parcels.id,
        parcelNumber: row.parcels.parcel_number,
        address: row.parcels.address,
        status: row.status,
        appealDate: row.appeal_date,
        originalValue: Number(row.original_value),
        requestedValue: row.requested_value ? Number(row.requested_value) : null,
        finalValue: row.final_value ? Number(row.final_value) : null,
        resolutionType: row.resolution_type,
        resolutionDate: row.resolution_date,
        neighborhoodCode: row.parcels.neighborhood_code,
      }));

      return { records, stats: computeStats(records) };
    },
    staleTime: 60_000,
  });
}
