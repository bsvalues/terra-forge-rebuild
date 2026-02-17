// TerraFusion OS — County Vitals Hook (Layer 1: Single Source of Truth)
// Query Key: ["county-vitals"] • Stale: 60s
// This is the ONLY hook that provides county-wide counts and health metrics.
// No component may duplicate these queries. See docs/DATA_CONSTITUTION.md.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CountyVitals {
  parcels: {
    total: number;
    withCoords: number;
    withClass: number;
    withNeighborhood: number;
  };
  sales: { total: number };
  assessments: {
    total: number;
    certified: number;
    certRate: number;
  };
  workflows: {
    pendingAppeals: number;
    openPermits: number;
    pendingExemptions: number;
    total: number;
  };
  quality: {
    coords: number;
    propertyClass: number;
    neighborhood: number;
    overall: number;
  };
  calibration: {
    runCount: number;
    calibratedNeighborhoods: number;
    avgRSquared: number | null;
  };
  ingest: {
    recentJobs: Array<{
      id: string;
      file_name: string;
      target_table: string;
      status: string;
      row_count: number | null;
      rows_imported: number | null;
      created_at: string;
    }>;
  };
  /** ISO timestamp of when this snapshot was fetched */
  fetchedAt: string;
}

async function fetchCountyVitals(): Promise<CountyVitals> {
  const currentYear = new Date().getFullYear();

  const [
    parcelsTotal,
    parcelsCoords,
    parcelsClass,
    parcelsNbhd,
    salesTotal,
    assessmentsTotal,
    assessmentsCertified,
    appealsCount,
    permitsCount,
    exemptionsCount,
    calibRunsCount,
    calibDetail,
    recentJobs,
  ] = await Promise.all([
    supabase.from("parcels").select("*", { count: "exact", head: true }),
    supabase.from("parcels").select("*", { count: "exact", head: true }).not("latitude", "is", null),
    supabase.from("parcels").select("*", { count: "exact", head: true }).not("property_class", "is", null),
    supabase.from("parcels").select("*", { count: "exact", head: true }).not("neighborhood_code", "is", null),
    supabase.from("sales").select("*", { count: "exact", head: true }),
    supabase.from("assessments").select("*", { count: "exact", head: true }),
    supabase.from("assessments").select("*", { count: "exact", head: true }).eq("certified", true),
    supabase.from("appeals").select("*", { count: "exact", head: true }).in("status", ["filed", "pending", "scheduled"]),
    supabase.from("permits").select("*", { count: "exact", head: true }).in("status", ["applied", "pending", "issued"]),
    supabase.from("exemptions").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("calibration_runs").select("*", { count: "exact", head: true }),
    supabase.from("calibration_runs").select("neighborhood_code, r_squared, created_at").order("created_at", { ascending: false }),
    supabase.from("ingest_jobs")
      .select("id, file_name, target_table, status, row_count, rows_imported, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const total = parcelsTotal.count || 0;
  const coordsCount = parcelsCoords.count || 0;
  const classCount = parcelsClass.count || 0;
  const nbhdCount = parcelsNbhd.count || 0;

  const coordsPct = total > 0 ? Math.round((coordsCount / total) * 100) : 0;
  const classPct = total > 0 ? Math.round((classCount / total) * 100) : 0;
  const nbhdPct = total > 0 ? Math.round((nbhdCount / total) * 100) : 0;

  const assessTotal = assessmentsTotal.count || 0;
  const certCount = assessmentsCertified.count || 0;

  // Compute calibrated neighborhoods + avg R²
  const latestCalib = new Map<string, number>();
  for (const run of calibDetail.data || []) {
    if (!latestCalib.has(run.neighborhood_code)) {
      latestCalib.set(run.neighborhood_code, run.r_squared ?? 0);
    }
  }
  const rSquaredValues = Array.from(latestCalib.values()).filter(v => v > 0);

  const pendingAppeals = appealsCount.count || 0;
  const openPermits = permitsCount.count || 0;
  const pendingExemptions = exemptionsCount.count || 0;

  return {
    parcels: {
      total,
      withCoords: coordsCount,
      withClass: classCount,
      withNeighborhood: nbhdCount,
    },
    sales: { total: salesTotal.count || 0 },
    assessments: {
      total: assessTotal,
      certified: certCount,
      certRate: assessTotal > 0 ? Math.round((certCount / assessTotal) * 100) : 0,
    },
    workflows: {
      pendingAppeals,
      openPermits,
      pendingExemptions,
      total: pendingAppeals + openPermits + pendingExemptions,
    },
    quality: {
      coords: coordsPct,
      propertyClass: classPct,
      neighborhood: nbhdPct,
      overall: Math.round((coordsPct + classPct + nbhdPct) / 3),
    },
    calibration: {
      runCount: calibRunsCount.count || 0,
      calibratedNeighborhoods: latestCalib.size,
      avgRSquared: rSquaredValues.length > 0
        ? rSquaredValues.reduce((a, b) => a + b, 0) / rSquaredValues.length
        : null,
    },
    ingest: {
      recentJobs: (recentJobs.data || []) as CountyVitals["ingest"]["recentJobs"],
    },
    fetchedAt: new Date().toISOString(),
  };
}

export function useCountyVitals() {
  return useQuery<CountyVitals>({
    queryKey: ["county-vitals"],
    queryFn: fetchCountyVitals,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
