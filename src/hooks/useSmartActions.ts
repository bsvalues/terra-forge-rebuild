// TerraFusion OS — Smart Actions Hook (Constitutional: data access only in hooks)
// Extracts SmartQuickActions query logic out of the component per DATA_CONSTITUTION.md

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SmartAction {
  id: string;
  title: string;
  description: string;
  iconName: string;
  target: string;
  priority: "critical" | "high" | "medium" | "info";
  metric?: string;
}

export function useSmartActions(): SmartAction[] {
  const { data: actions } = useQuery({
    queryKey: ["smart-quick-actions"],
    queryFn: async (): Promise<SmartAction[]> => {
      const result: SmartAction[] = [];

      // ── Correction Mission 1: Improvement value = 0 but active permits ──
      const { data: zeroImpParcels } = await supabase
        .from("parcels")
        .select("id, parcel_number")
        .eq("improvement_value", 0)
        .limit(500);

      if (zeroImpParcels && zeroImpParcels.length > 0) {
        // Check which have active permits
        const parcelIds = zeroImpParcels.map(p => p.id);
        const { count: withPermits } = await supabase
          .from("permits")
          .select("*", { count: "exact", head: true })
          .in("parcel_id", parcelIds.slice(0, 100))
          .in("status", ["applied", "pending", "issued"]);

        if ((withPermits || 0) >= 5) {
          result.push({
            id: "zero-imp-permits",
            title: "Improvement = $0 with Active Permits",
            description: `${withPermits} parcels have $0 improvement value but active building permits — likely missing data`,
            iconName: "AlertTriangle",
            target: "home:quality",
            priority: (withPermits || 0) > 20 ? "critical" : "high",
            metric: `${withPermits}`,
          });
        }
      }

      // ── Correction Mission 2: Sale price outliers ──
      const { data: recentSales } = await supabase
        .from("sales")
        .select("sale_price")
        .eq("is_qualified", true)
        .gt("sale_price", 0)
        .order("sale_date", { ascending: false })
        .limit(500);

      if (recentSales && recentSales.length >= 10) {
        const prices = recentSales.map(s => s.sale_price).sort((a, b) => a - b);
        const q1 = prices[Math.floor(prices.length * 0.25)];
        const q3 = prices[Math.floor(prices.length * 0.75)];
        const iqr = q3 - q1;
        const lowerFence = q1 - 1.5 * iqr;
        const upperFence = q3 + 1.5 * iqr;
        const outliers = prices.filter(p => p < lowerFence || p > upperFence);

        if (outliers.length >= 3) {
          result.push({
            id: "sale-outliers",
            title: "Sale Price Outliers Detected",
            description: `${outliers.length} qualified sales fall outside IQR fences — review for disqualification`,
            iconName: "AlertTriangle",
            target: "factory:vei",
            priority: outliers.length > 15 ? "high" : "medium",
            metric: `${outliers.length}`,
          });
        }
      }

      // ── Correction Mission 3: Neighborhood code drift ──
      const { data: nbhdParcels } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null)
        .limit(5000);

      if (nbhdParcels && nbhdParcels.length > 0) {
        const nbhdCounts = new Map<string, number>();
        for (const p of nbhdParcels) {
          nbhdCounts.set(p.neighborhood_code!, (nbhdCounts.get(p.neighborhood_code!) || 0) + 1);
        }
        const tinyNbhds = [...nbhdCounts.entries()].filter(([, count]) => count <= 2);
        if (tinyNbhds.length >= 3) {
          result.push({
            id: "nbhd-drift",
            title: "Neighborhood Code Drift",
            description: `${tinyNbhds.length} neighborhood codes have ≤2 parcels — likely typos or legacy codes`,
            iconName: "Shield",
            target: "home:quality",
            priority: tinyNbhds.length > 10 ? "high" : "medium",
            metric: `${tinyNbhds.length}`,
          });
        }
      }

      // Uncalibrated neighborhoods
      const { data: parcels } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null)
        .limit(5000);

      const allNbhds = new Set((parcels || []).map((p) => p.neighborhood_code!));

      const { data: calibRuns } = await supabase
        .from("calibration_runs")
        .select("neighborhood_code")
        .limit(1000);

      const calibratedNbhds = new Set((calibRuns || []).map((r) => r.neighborhood_code));
      const uncalibrated = [...allNbhds].filter((n) => !calibratedNbhds.has(n));

      if (uncalibrated.length > 0) {
        result.push({
          id: "uncalibrated",
          title: "Uncalibrated Neighborhoods",
          description: `${uncalibrated.length} neighborhood${uncalibrated.length > 1 ? "s" : ""} need regression calibration`,
          iconName: "BarChart3",
          target: "factory:calibration",
          priority: "high",
          metric: `${uncalibrated.length}/${allNbhds.size}`,
        });
      }

      // Pending appeals
      const { count: appealCount } = await supabase
        .from("appeals")
        .select("*", { count: "exact", head: true })
        .in("status", ["filed", "pending"]);

      if ((appealCount || 0) > 0) {
        result.push({
          id: "appeals",
          title: "Pending Appeals",
          description: `${appealCount} appeal${(appealCount || 0) > 1 ? "s" : ""} awaiting review`,
          iconName: "Gavel",
          target: "workbench:dais:appeals",
          priority: (appealCount || 0) > 10 ? "critical" : "medium",
          metric: `${appealCount}`,
        });
      }

      // Missing coordinates
      const { count: totalParcels } = await supabase
        .from("parcels")
        .select("*", { count: "exact", head: true });

      const { count: noCoords } = await supabase
        .from("parcels")
        .select("*", { count: "exact", head: true })
        .is("latitude", null);

      const missingPct =
        (totalParcels || 0) > 0
          ? Math.round(((noCoords || 0) / (totalParcels || 1)) * 100)
          : 0;

      if (missingPct > 20) {
        result.push({
          id: "geocoding",
          title: "Missing Coordinates",
          description: `${missingPct}% of parcels lack geocoding — affects spatial analysis`,
          iconName: "Shield",
          target: "factory:geoequity",
          priority: missingPct > 50 ? "critical" : "high",
          metric: `${missingPct}%`,
        });
      }

      // Low sales volume
      const { count: salesCount } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true });

      if ((salesCount || 0) < 50) {
        result.push({
          id: "sales-data",
          title: "Low Sales Volume",
          description: "Import more sales data to improve ratio studies and calibration",
          iconName: "Upload",
          target: "home:ids",
          priority: "medium",
          metric: `${salesCount || 0}`,
        });
      }

      // Uncertified assessments
      const { count: uncertifiedCount } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("certified", false);

      if ((uncertifiedCount || 0) > 0) {
        result.push({
          id: "uncertified",
          title: "Uncertified Assessments",
          description: `${uncertifiedCount} assessment${(uncertifiedCount || 0) > 1 ? "s" : ""} pending certification`,
          iconName: "CheckCircle2",
          target: "home:readiness",
          priority: (uncertifiedCount || 0) > 100 ? "high" : "medium",
          metric: `${uncertifiedCount}`,
        });
      }

      // Low-confidence mapping rules — Learning SLA: only surface if ≥3 rules AND created in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data: lowConfRules } = await supabase
        .from("ingest_mapping_rules" as any)
        .select("*")
        .eq("confidence_override", "low")
        .gte("created_at", sevenDaysAgo)
        .limit(100);

      const lowConfCount = lowConfRules?.length ?? 0;
      if (lowConfCount >= 3) {
        result.push({
          id: "mapping-review",
          title: "Low-Confidence Mappings",
          description: `${lowConfCount} column mapping${lowConfCount > 1 ? "s" : ""} need review — fix once to train the system`,
          iconName: "Brain",
          target: "home:ids",
          priority: lowConfCount > 10 ? "high" : "medium",
          metric: `${lowConfCount}`,
        });
      }

      // Missing default mapping profiles — Learning SLA: only show if at least 1 profile exists
      const { data: allProfiles } = await supabase
        .from("ingest_mapping_profiles" as any)
        .select("dataset_type, is_default")
        .limit(100);

      const datasetTypes = ["parcels", "sales", "permits", "exemptions", "assessment_ratios"];
      const typesWithDefault = new Set(
        (allProfiles ?? []).filter((p: any) => p.is_default).map((p: any) => p.dataset_type)
      );
      const missingDefaults = datasetTypes.filter((t) => !typesWithDefault.has(t));
      if (missingDefaults.length > 0 && (allProfiles?.length ?? 0) > 0) {
        result.push({
          id: "set-default-profile",
          title: "Set Default Mapping Profile",
          description: `${missingDefaults.length} dataset type${missingDefaults.length > 1 ? "s" : ""} missing default profiles`,
          iconName: "Star",
          target: "home:ids",
          priority: "info",
          metric: `${missingDefaults.length}`,
        });
      }

      const priorityOrder = { critical: 0, high: 1, medium: 2, info: 3 };
      result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      return result.slice(0, 5);
    },
    staleTime: 120_000,
  });

  return actions || [];
}
