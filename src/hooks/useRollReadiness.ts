// TerraFusion OS — Roll Readiness Hook
// The flexbox told me a secret: "You're not ready." But we built it anyway.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export interface ReadinessCheck {
  id: string;
  label: string;
  description: string;
  status: "pass" | "fail" | "warn";
  metric: string;
  detail?: string;
  weight: number;
}

export interface NeighborhoodReadiness {
  code: string;
  parcelCount: number;
  certifiedCount: number;
  certRate: number;
  hasCalibration: boolean;
  rSquared: number | null;
  pendingAppeals: number;
  score: number;
}

export interface RollReadinessData {
  overallScore: number;
  verdict: "GO" | "CAUTION" | "NO_GO";
  checks: ReadinessCheck[];
  neighborhoods: NeighborhoodReadiness[];
  summary: {
    totalParcels: number;
    certifiedParcels: number;
    certRate: number;
    calibratedNeighborhoods: number;
    totalNeighborhoods: number;
    pendingAppeals: number;
    openPermits: number;
    pendingExemptions: number;
    missingAssessments: number;
    avgDataQuality: number;
  };
}

export function useRollReadiness() {
  const countyId = useActiveCountyId();

  return useQuery<RollReadinessData>({
    queryKey: ["roll-readiness-command", countyId],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      // ── Parallel data fetch (all county-scoped) ──
      const [
        { count: totalParcels },
        { data: assessments },
        { data: parcelsWithNbhd },
        { data: calibrations },
        { count: pendingAppeals },
        { count: openPermits },
        { count: pendingExemptions },
        { count: withCoords },
        { count: withClass },
        { count: withNbhd },
        { count: withValue },
      ] = await Promise.all([
        supabase.from("parcels").select("*", { count: "exact", head: true }).eq("county_id", countyId!),
        supabase.from("assessments").select("parcel_id, certified").eq("county_id", countyId!).eq("tax_year", currentYear),
        supabase.from("parcels").select("id, neighborhood_code, assessed_value, latitude, property_class").eq("county_id", countyId!),
        supabase.from("calibration_runs").select("neighborhood_code, r_squared, status").eq("county_id", countyId!).eq("status", "applied"),
        supabase.from("appeals").select("*", { count: "exact", head: true }).eq("county_id", countyId!).in("status", ["filed", "pending", "scheduled"]),
        supabase.from("permits").select("*", { count: "exact", head: true }).in("status", ["applied", "pending"]),
        supabase.from("exemptions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("parcels").select("*", { count: "exact", head: true }).eq("county_id", countyId!).not("latitude", "is", null),
        supabase.from("parcels").select("*", { count: "exact", head: true }).eq("county_id", countyId!).not("property_class", "is", null),
        supabase.from("parcels").select("*", { count: "exact", head: true }).eq("county_id", countyId!).not("neighborhood_code", "is", null),
        supabase.from("parcels").select("*", { count: "exact", head: true }).eq("county_id", countyId!).gt("assessed_value", 0),
      ]);

      const total = totalParcels || 0;
      const certifiedIds = new Set((assessments || []).filter(a => a.certified).map(a => a.parcel_id));
      const certifiedCount = certifiedIds.size;
      const certRate = total > 0 ? Math.round((certifiedCount / total) * 100) : 0;
      const missingAssessments = total - (assessments || []).length;

      // Data quality
      const dqFields = [withCoords || 0, withClass || 0, withNbhd || 0, withValue || 0];
      const avgDataQuality = total > 0
        ? Math.round(dqFields.reduce((s, c) => s + (c / total) * 100, 0) / dqFields.length)
        : 0;

      // Calibration map
      const calibMap = new Map<string, number>();
      for (const cal of calibrations || []) {
        const existing = calibMap.get(cal.neighborhood_code);
        if (!existing || (cal.r_squared || 0) > existing) {
          calibMap.set(cal.neighborhood_code, cal.r_squared || 0);
        }
      }

      // Neighborhood aggregation
      const nbhdAgg = new Map<string, { parcels: string[]; certified: number }>();
      for (const p of parcelsWithNbhd || []) {
        const code = p.neighborhood_code || "UNASSIGNED";
        if (!nbhdAgg.has(code)) nbhdAgg.set(code, { parcels: [], certified: 0 });
        const entry = nbhdAgg.get(code)!;
        entry.parcels.push(p.id);
        if (certifiedIds.has(p.id)) entry.certified++;
      }

      // Appeal counts per neighborhood — simplified (global for now)
      const appealsCount = pendingAppeals || 0;

      const totalNeighborhoods = nbhdAgg.size;
      const calibratedNeighborhoods = Array.from(nbhdAgg.keys()).filter(k => calibMap.has(k)).length;

      const neighborhoods: NeighborhoodReadiness[] = Array.from(nbhdAgg.entries())
        .map(([code, data]) => {
          const pCount = data.parcels.length;
          const cRate = pCount > 0 ? Math.round((data.certified / pCount) * 100) : 0;
          const hasCal = calibMap.has(code);
          const rSq = calibMap.get(code) ?? null;
          // Weighted score: 50% cert, 30% calibration, 20% r²
          let score = cRate * 0.5;
          score += hasCal ? 30 : 0;
          score += rSq ? Math.min(rSq * 100, 100) * 0.2 : 0;
          return {
            code,
            parcelCount: pCount,
            certifiedCount: data.certified,
            certRate: cRate,
            hasCalibration: hasCal,
            rSquared: rSq,
            pendingAppeals: 0, // would need per-nbhd join
            score: Math.round(score),
          };
        })
        .sort((a, b) => a.score - b.score);

      // ── Checklist ──
      const checks: ReadinessCheck[] = [
        {
          id: "certification",
          label: "Assessment Certification",
          description: "All parcels must have certified assessments for the current tax year",
          status: certRate === 100 ? "pass" : certRate >= 80 ? "warn" : "fail",
          metric: `${certRate}%`,
          detail: `${certifiedCount.toLocaleString()} of ${total.toLocaleString()} parcels certified`,
          weight: 30,
        },
        {
          id: "calibration",
          label: "Model Calibration Coverage",
          description: "All neighborhoods should have applied calibration models",
          status: calibratedNeighborhoods === totalNeighborhoods && totalNeighborhoods > 0 ? "pass"
            : calibratedNeighborhoods >= totalNeighborhoods * 0.7 ? "warn" : "fail",
          metric: `${calibratedNeighborhoods}/${totalNeighborhoods}`,
          detail: `${calibratedNeighborhoods} neighborhoods calibrated`,
          weight: 25,
        },
        {
          id: "appeals",
          label: "Pending Appeals Resolved",
          description: "No unresolved appeals should block certification",
          status: appealsCount === 0 ? "pass" : appealsCount <= 5 ? "warn" : "fail",
          metric: appealsCount.toString(),
          detail: appealsCount === 0 ? "All appeals resolved" : `${appealsCount} appeals pending`,
          weight: 20,
        },
        {
          id: "data-quality",
          label: "Data Completeness",
          description: "Parcel records should have coordinates, class, neighborhood, and values",
          status: avgDataQuality >= 90 ? "pass" : avgDataQuality >= 70 ? "warn" : "fail",
          metric: `${avgDataQuality}%`,
          detail: `Average field completeness across ${total.toLocaleString()} parcels`,
          weight: 15,
        },
        {
          id: "missing-assessments",
          label: "Assessment Coverage",
          description: "All parcels should have current-year assessments",
          status: missingAssessments === 0 ? "pass" : missingAssessments <= total * 0.05 ? "warn" : "fail",
          metric: missingAssessments === 0 ? "100%" : `${Math.max(0, missingAssessments).toLocaleString()} missing`,
          detail: missingAssessments === 0 ? "All parcels assessed" : `${missingAssessments} parcels lack current-year assessments`,
          weight: 10,
        },
      ];

      // Overall score — weighted pass/fail/warn
      let overallScore = 0;
      for (const check of checks) {
        if (check.status === "pass") overallScore += check.weight;
        else if (check.status === "warn") overallScore += check.weight * 0.5;
      }

      const verdict: "GO" | "CAUTION" | "NO_GO" =
        overallScore >= 90 ? "GO" :
        overallScore >= 60 ? "CAUTION" : "NO_GO";

      return {
        overallScore: Math.round(overallScore),
        verdict,
        checks,
        neighborhoods,
        summary: {
          totalParcels: total,
          certifiedParcels: certifiedCount,
          certRate,
          calibratedNeighborhoods,
          totalNeighborhoods,
          pendingAppeals: appealsCount,
          openPermits: openPermits || 0,
          pendingExemptions: pendingExemptions || 0,
          missingAssessments: Math.max(0, missingAssessments),
          avgDataQuality,
        },
      };
    },
    enabled: !!countyId,
    staleTime: 60_000,
  });
}
