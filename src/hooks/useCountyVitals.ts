// TerraFusion OS — County Vitals Hook (Layer 1: Single Source of Truth)
// Query Key: ["county-vitals"] • Stale: 60s
// Uses get_county_vitals() RPC — ONE database call instead of 13 parallel queries.
// No component may duplicate these queries. See docs/DATA_CONSTITUTION.md.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DefensibilityVerdict = "strong" | "watch" | "at_risk";

export interface DefensibilityPillars {
  dataCompleteness: number;
  dataConsistency: number;
  marketSupport: number;
  modelStability: number;
}

export interface DefensibilityScore {
  overall: number;
  verdict: DefensibilityVerdict;
  pillars: DefensibilityPillars;
}

export interface DataQualityVitals {
  latestSnapshot: {
    quality_score: number | null;
    passed_all_gates: boolean | null;
    created_at: string;
  } | null;
  openIssues: number;
  hardBlockers: number;
}

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
  dataQuality: DataQualityVitals;
  defensibility: DefensibilityScore;
  /** ISO timestamp of when this snapshot was fetched */
  fetchedAt: string;
}

async function fetchCountyVitals(): Promise<CountyVitals> {
  const { data, error } = await supabase.rpc("get_county_vitals");
  if (error) throw error;

  const raw = data as Record<string, any>;

  const total = raw.parcels.total ?? 0;
  const coordsCount = raw.parcels.withCoords ?? 0;
  const classCount = raw.parcels.withClass ?? 0;
  const nbhdCount = raw.parcels.withNeighborhood ?? 0;

  const coordsPct = total > 0 ? Math.round((coordsCount / total) * 100) : 0;
  const classPct = total > 0 ? Math.round((classCount / total) * 100) : 0;
  const nbhdPct = total > 0 ? Math.round((nbhdCount / total) * 100) : 0;

  const assessTotal = raw.assessments.total ?? 0;
  const certCount = raw.assessments.certified ?? 0;

  // Compute calibrated neighborhoods + avg R² from RPC detail
  const calibDetail: Array<{ neighborhood_code: string; r_squared: number | null }> =
    raw.calibration.detail ?? [];
  const rSquaredValues = calibDetail
    .map((d) => d.r_squared ?? 0)
    .filter((v) => v > 0);

  const pendingAppeals = raw.workflows.pendingAppeals ?? 0;
  const openPermits = raw.workflows.openPermits ?? 0;
  const pendingExemptions = raw.workflows.pendingExemptions ?? 0;

  return {
    parcels: { total, withCoords: coordsCount, withClass: classCount, withNeighborhood: nbhdCount },
    sales: { total: raw.sales.total ?? 0 },
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
      runCount: raw.calibration.runCount ?? 0,
      calibratedNeighborhoods: calibDetail.length,
      avgRSquared:
        rSquaredValues.length > 0
          ? rSquaredValues.reduce((a, b) => a + b, 0) / rSquaredValues.length
          : null,
    },
    ingest: {
      recentJobs: (raw.ingest.recentJobs ?? []) as CountyVitals["ingest"]["recentJobs"],
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
