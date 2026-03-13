// TerraFusion OS — Neighborhood Deep-Dive Data Hook
// Extracts direct supabase queries from NeighborhoodDeepDiveDialog (Data Constitution)

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NeighborhoodDeepDiveStats {
  parcelCount: number;
  medianValue: number;
  avgValue: number;
  coordsPct: number;
  classDistribution: Array<{ cls: string; count: number; pct: number }>;
  certifiedCount: number;
  certPct: number;
  assessmentCount: number;
  qualifiedSalesCount: number;
  totalSalesCount: number;
  recentSales: Array<{ parcel_id: string; sale_price: number; sale_date: string; is_qualified: boolean }>;
  pendingAppeals: number;
  openPermits: number;
  pendingExemptions: number;
  calibration: {
    rSquared: number | null;
    rmse: number | null;
    sampleSize: number | null;
    date: string | null;
    variables: string[] | null;
  } | null;
}

export function useNeighborhoodDeepDive(code: string | null, enabled: boolean = true) {
  return useQuery<NeighborhoodDeepDiveStats | null>({
    queryKey: ["nbhd-deep-dive", code],
    queryFn: async () => {
      if (!code) return null;
      const currentYear = new Date().getFullYear();

      const [parcelsRes, assessmentsRes, salesRes, appealsRes, permitsRes, exemptionsRes, calibRes] = await Promise.all([
        supabase.from("parcels").select("id, assessed_value, property_class, year_built, building_area, latitude").eq("neighborhood_code", code).limit(2000),
        supabase.from("assessments").select("parcel_id, land_value, improvement_value, total_value, certified, tax_year").eq("tax_year", currentYear).limit(5000),
        supabase.from("sales").select("parcel_id, sale_price, sale_date, is_qualified").limit(5000),
        supabase.from("appeals").select("parcel_id, status").in("status", ["filed", "pending", "scheduled"]),
        supabase.from("permits").select("parcel_id, status, permit_type").in("status", ["applied", "pending", "issued"]),
        supabase.from("exemptions").select("parcel_id, status, exemption_type").eq("status", "pending"),
        supabase.from("calibration_runs").select("r_squared, rmse, sample_size, created_at, variables").eq("neighborhood_code", code).order("created_at", { ascending: false }).limit(1),
      ]);

      const parcels = parcelsRes.data || [];
      const parcelIds = new Set(parcels.map(p => p.id));

      const nbhdAssessments = (assessmentsRes.data || []).filter(a => parcelIds.has(a.parcel_id));
      const nbhdSales = (salesRes.data || []).filter(s => parcelIds.has(s.parcel_id));
      const nbhdAppeals = (appealsRes.data || []).filter(a => parcelIds.has(a.parcel_id));
      const nbhdPermits = (permitsRes.data || []).filter(p => parcelIds.has(p.parcel_id));
      const nbhdExemptions = (exemptionsRes.data || []).filter(e => parcelIds.has(e.parcel_id));

      const values = parcels.map(p => p.assessed_value).filter(Boolean).sort((a: number, b: number) => a - b);
      const medianValue = values.length > 0 ? values[Math.floor(values.length / 2)] : 0;
      const avgValue = values.length > 0 ? Math.round(values.reduce((s: number, v: number) => s + v, 0) / values.length) : 0;
      const withCoords = parcels.filter(p => p.latitude != null).length;
      const coordsPct = parcels.length > 0 ? Math.round((withCoords / parcels.length) * 100) : 0;

      const classCounts = new Map<string, number>();
      for (const p of parcels) {
        const cls = p.property_class || "Unknown";
        classCounts.set(cls, (classCounts.get(cls) || 0) + 1);
      }
      const classDistribution = Array.from(classCounts.entries())
        .map(([cls, count]) => ({ cls, count, pct: Math.round((count / parcels.length) * 100) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const certifiedCount = nbhdAssessments.filter(a => a.certified).length;
      const certPct = nbhdAssessments.length > 0 ? Math.round((certifiedCount / nbhdAssessments.length) * 100) : 0;

      const qualifiedSales = nbhdSales.filter(s => s.is_qualified);

      const calibration = calibRes.data?.[0] || null;

      return {
        parcelCount: parcels.length,
        medianValue,
        avgValue,
        coordsPct,
        classDistribution,
        certifiedCount,
        certPct,
        assessmentCount: nbhdAssessments.length,
        qualifiedSalesCount: qualifiedSales.length,
        totalSalesCount: nbhdSales.length,
        recentSales: nbhdSales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()).slice(0, 5),
        pendingAppeals: nbhdAppeals.length,
        openPermits: nbhdPermits.length,
        pendingExemptions: nbhdExemptions.length,
        calibration: calibration ? {
          rSquared: calibration.r_squared,
          rmse: calibration.rmse,
          sampleSize: calibration.sample_size,
          date: calibration.created_at,
          variables: calibration.variables,
        } : null,
      };
    },
    enabled: !!code && enabled,
    staleTime: 60_000,
  });
}
