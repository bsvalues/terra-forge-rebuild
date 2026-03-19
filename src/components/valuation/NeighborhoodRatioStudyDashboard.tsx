// TerraFusion OS — Phase 108: Neighborhood Ratio Study Dashboard
// Aggregated COD/PRD/median ratio metrics by neighborhood.

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2,
  Loader2, MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface NeighborhoodRatioStats {
  neighborhood_code: string;
  parcel_count: number;
  median_ratio: number | null;
  cod: number | null;
  prd: number | null;
  avg_assessed: number;
  qualified_sales: number;
}

export function NeighborhoodRatioStudyDashboard() {
  const { profile } = useAuthContext();
  const countyId = profile?.county_id;

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["neighborhood-ratio-dashboard", countyId],
    enabled: !!countyId,
    queryFn: async (): Promise<NeighborhoodRatioStats[]> => {
      // Pull latest comparison snapshots per neighborhood
      const { data, error } = await supabase
        .from("comparison_snapshots")
        .select("neighborhood_code, total_parcels, median_ratio, cod, prd, avg_assessed_value, qualified_sales, created_at")
        .eq("county_id", countyId!)
        .not("neighborhood_code", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Deduplicate: keep latest per neighborhood
      const seen = new Set<string>();
      const results: NeighborhoodRatioStats[] = [];
      for (const s of data || []) {
        if (!s.neighborhood_code || seen.has(s.neighborhood_code)) continue;
        seen.add(s.neighborhood_code);
        results.push({
          neighborhood_code: s.neighborhood_code,
          parcel_count: s.total_parcels,
          median_ratio: s.median_ratio,
          cod: s.cod,
          prd: s.prd,
          avg_assessed: s.avg_assessed_value,
          qualified_sales: s.qualified_sales ?? 0,
        });
      }
      return results.sort((a, b) => a.neighborhood_code.localeCompare(b.neighborhood_code));
    },
  });

  const codStatus = (cod: number | null) => {
    if (cod === null) return { label: "N/A", color: "text-muted-foreground" };
    if (cod <= 15) return { label: "Excellent", color: "text-chart-5" };
    if (cod <= 20) return { label: "Good", color: "text-chart-3" };
    if (cod <= 25) return { label: "Fair", color: "text-chart-4" };
    return { label: "Poor", color: "text-destructive" };
  };

  const prdStatus = (prd: number | null) => {
    if (prd === null) return { label: "N/A", color: "text-muted-foreground" };
    if (prd >= 0.98 && prd <= 1.03) return { label: "Equitable", color: "text-chart-5" };
    if (prd >= 0.95 && prd <= 1.05) return { label: "Acceptable", color: "text-chart-3" };
    return { label: "Regressive", color: "text-destructive" };
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="p-6">
        <Card className="border-border/30">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No ratio study data available</p>
            <p className="text-xs text-muted-foreground mt-1">Run a comparison snapshot to populate neighborhood metrics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Summary stats
  const avgCod = snapshots.filter(s => s.cod !== null).reduce((a, s) => a + (s.cod ?? 0), 0) / (snapshots.filter(s => s.cod !== null).length || 1);
  const totalParcels = snapshots.reduce((a, s) => a + s.parcel_count, 0);
  const totalSales = snapshots.reduce((a, s) => a + s.qualified_sales, 0);

  return (
    <div className="p-6 space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/30">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Neighborhoods</p>
            <p className="text-lg font-bold text-foreground">{snapshots.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Avg COD</p>
            <p className={cn("text-lg font-bold", codStatus(avgCod).color)}>{avgCod.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Total Sales</p>
            <p className="text-lg font-bold text-foreground">{totalSales.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Neighborhood List */}
      <div className="space-y-2">
        {snapshots.map((s, i) => {
          const cod = codStatus(s.cod);
          const prd = prdStatus(s.prd);
          const ratioDeviation = s.median_ratio ? Math.abs(s.median_ratio - 1) * 100 : 0;

          return (
            <motion.div
              key={s.neighborhood_code}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card className="border-border/30 hover:border-border/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 min-w-[80px]">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-mono font-medium text-foreground">{s.neighborhood_code}</span>
                    </div>

                    <div className="flex-1 grid grid-cols-5 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Parcels</span>
                        <p className="font-medium text-foreground">{s.parcel_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Median Ratio</span>
                        <p className={cn(
                          "font-medium",
                          ratioDeviation < 5 ? "text-chart-5" : ratioDeviation < 10 ? "text-chart-3" : "text-destructive"
                        )}>
                          {s.median_ratio?.toFixed(3) ?? "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">COD</span>
                        <p className={cn("font-medium", cod.color)}>
                          {s.cod?.toFixed(1) ?? "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">PRD</span>
                        <p className={cn("font-medium", prd.color)}>
                          {s.prd?.toFixed(3) ?? "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sales</span>
                        <p className="font-medium text-foreground">{s.qualified_sales}</p>
                      </div>
                    </div>

                    <Badge variant="outline" className={cn("text-[9px]", cod.color)}>
                      {cod.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
