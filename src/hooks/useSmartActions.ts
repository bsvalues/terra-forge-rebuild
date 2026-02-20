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

      const priorityOrder = { critical: 0, high: 1, medium: 2, info: 3 };
      result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      return result.slice(0, 4);
    },
    staleTime: 120_000,
  });

  return actions || [];
}
