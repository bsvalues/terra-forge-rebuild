// TerraFusion OS — Smart Actions Hook (Constitutional: data access only in hooks)
// Uses server-side get_mission_counts() RPC for characteristics missions.
// Client-side detection only for missions requiring cross-table joins not in RPC.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export interface SmartAction {
  id: string;
  title: string;
  description: string;
  iconName: string;
  target: string;
  priority: "critical" | "high" | "medium" | "info";
  metric?: string;
  /** Provenance from RPC — real as_of, sources, confidence */
  provenance?: {
    as_of: string;
    sources: string[];
    confidence: "high" | "medium" | "low";
    confidence_reason?: string;
    scope_n?: number;
    min_class_n?: number;
  };
}

/** Extract provenance from RPC mission block */
function extractProvenance(block: Record<string, any> | undefined): SmartAction["provenance"] {
  if (!block?.as_of) return undefined;
  return {
    as_of: block.as_of,
    sources: Array.isArray(block.sources) ? block.sources : [],
    confidence: block.confidence ?? "medium",
    confidence_reason: block.confidence_reason,
    scope_n: block.scope_n ?? undefined,
    min_class_n: block.min_class_n ?? undefined,
  };
}

export function useSmartActions(): SmartAction[] {
  const countyId = useActiveCountyId();

  const { data: actions } = useQuery({
    queryKey: ["smart-quick-actions", countyId],
    queryFn: async (): Promise<SmartAction[]> => {
      const result: SmartAction[] = [];

      // ── Server-side mission counts (single RPC call) ──
      const { data: missionCounts } = await supabase.rpc("get_mission_counts");
      const mc = (missionCounts ?? {}) as Record<string, any>;

      // ── Zero improvement with active permits ──
      const zeroImpCount = mc["zero-imp-permits"]?.total ?? 0;
      if (zeroImpCount >= 5) {
        result.push({
          id: "zero-imp-permits",
          title: "Improvement = $0 with Active Permits",
          description: `${zeroImpCount} parcels have $0 improvement value but active building permits — likely missing data`,
          iconName: "AlertTriangle",
          target: "home:quality",
          priority: zeroImpCount > 20 ? "critical" : "high",
          metric: `${zeroImpCount}`,
          provenance: extractProvenance(mc["zero-imp-permits"]),
        });
      }

      // ── Sale price outliers (requires client-side IQR — small dataset) ──
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

      // ── Neighborhood code drift (requires client-side grouping) ──
      const { data: nbhdParcels } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .eq("county_id", countyId!)
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

      // ── Uncalibrated neighborhoods (requires cross-table) ──
      const { data: parcels } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .eq("county_id", countyId!)
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

      // ── Pending appeals (from RPC) ──
      const appealCount = mc["appeals"]?.total ?? 0;
      if (appealCount > 0) {
        result.push({
          id: "appeals",
          title: "Pending Appeals",
          description: `${appealCount} appeal${appealCount > 1 ? "s" : ""} awaiting review`,
          iconName: "Gavel",
          target: "workbench:dais:appeals",
          priority: appealCount > 10 ? "critical" : "medium",
          metric: `${appealCount}`,
          provenance: extractProvenance(mc["appeals"]),
        });
      }

      // ── Missing coordinates (from RPC) ──
      const geocoding = mc["geocoding"] ?? {};
      const missingPct = geocoding.pct ?? 0;
      if (missingPct > 20) {
        result.push({
          id: "geocoding",
          title: "Missing Coordinates",
          description: `${missingPct}% of parcels lack geocoding — affects spatial analysis`,
          iconName: "Shield",
          target: "factory:geoequity",
          priority: missingPct > 50 ? "critical" : "high",
          metric: `${missingPct}%`,
          provenance: extractProvenance(mc["geocoding"]),
        });
      }

      // ── Low sales volume (from RPC) ──
      const salesTotal = mc["sales-data"]?.total ?? 0;
      if (salesTotal < 50) {
        result.push({
          id: "sales-data",
          title: "Low Sales Volume",
          description: "Import more sales data to improve ratio studies and calibration",
          iconName: "Upload",
          target: "home:ids",
          priority: "medium",
          metric: `${salesTotal}`,
          provenance: extractProvenance(mc["sales-data"]),
        });
      }

      // ── Uncertified assessments (from RPC) ──
      const uncertifiedCount = mc["uncertified"]?.total ?? 0;
      if (uncertifiedCount > 0) {
        result.push({
          id: "uncertified",
          title: "Uncertified Assessments",
          description: `${uncertifiedCount} assessment${uncertifiedCount > 1 ? "s" : ""} pending certification`,
          iconName: "CheckCircle2",
          target: "home:readiness",
          priority: uncertifiedCount > 100 ? "high" : "medium",
          metric: `${uncertifiedCount}`,
          provenance: extractProvenance(mc["uncertified"]),
        });
      }

      // ── Low-confidence mapping rules (Learning SLA) ──
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

      // ── Missing default mapping profiles ──
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

      // ── Characteristics: Impossible Year Built (from RPC) ──
      const yearData = mc["impossible-year-built"] ?? {};
      const impossibleYearTotal = yearData.total ?? 0;
      if (impossibleYearTotal >= 3) {
        const parts: string[] = [];
        if ((yearData.pre1700 ?? 0) > 0) parts.push(`${yearData.pre1700} pre-1700`);
        if ((yearData.future ?? 0) > 0) parts.push(`${yearData.future} future`);
        if ((yearData.missing ?? 0) > 0) parts.push(`${yearData.missing} missing`);
        result.push({
          id: "impossible-year-built",
          title: "Impossible Year Built",
          description: `${impossibleYearTotal} parcels have nonsensical year_built (${parts.join(", ")}) — wrecks depreciation modeling`,
          iconName: "CalendarX2",
          target: "home:quality",
          priority: impossibleYearTotal > 15 ? "critical" : "high",
          metric: `${impossibleYearTotal}`,
          provenance: extractProvenance(yearData),
        });
      }

      // ── Characteristics: Missing Building Areas (from RPC) ──
      const missingAreaCount = mc["missing-building-area"]?.total ?? 0;
      if (missingAreaCount >= 10) {
        result.push({
          id: "missing-building-area",
          title: "Missing Building Areas",
          description: `${missingAreaCount} parcels have improvement value but no building area — not defensible without measurement data`,
          iconName: "SquareDashed",
          target: "home:quality",
          priority: missingAreaCount > 50 ? "critical" : "high",
          metric: `${missingAreaCount}`,
          provenance: extractProvenance(mc["missing-building-area"]),
        });
      }

      // ── Characteristics: Building Area Outliers (from RPC, per-class IQR) ──
      const areaOutlierCount = mc["building-area-outliers"]?.total ?? 0;
      if (areaOutlierCount >= 5) {
        result.push({
          id: "building-area-outliers",
          title: "Building Area Outliers",
          description: `${areaOutlierCount} parcels have building area outside 1.5×IQR for their property class — likely data entry errors`,
          iconName: "Ruler",
          target: "home:quality",
          priority: areaOutlierCount > 25 ? "critical" : "high",
          metric: `${areaOutlierCount}`,
          provenance: extractProvenance(mc["building-area-outliers"]),
        });
      }

      const priorityOrder = { critical: 0, high: 1, medium: 2, info: 3 };
      result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      return result.slice(0, 7);
    },
    staleTime: 120_000,
  });

  return actions || [];
}
