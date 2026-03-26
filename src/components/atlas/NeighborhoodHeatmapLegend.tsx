// TerraFusion OS — Phase 109: Neighborhood Equity Heatmap Legend
// Color-coded COD/PRD breakdown by neighborhood for Atlas tab.

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface NeighborhoodMetric {
  neighborhood_code: string;
  cod: number | null;
  prd: number | null;
  median_ratio: number | null;
  total_parcels: number;
  qualified_sales: number | null;
}

type MetricMode = "cod" | "prd" | "ratio";

function getEquityColor(mode: MetricMode, value: number | null): string {
  if (value === null) return "bg-muted";
  if (mode === "cod") {
    if (value <= 10) return "bg-tf-green";
    if (value <= 15) return "bg-chart-3";
    if (value <= 20) return "bg-chart-4";
    return "bg-destructive";
  }
  if (mode === "prd") {
    if (value >= 0.98 && value <= 1.03) return "bg-tf-green";
    if (value < 0.98) return "bg-chart-4";
    return "bg-destructive";
  }
  // ratio
  if (value >= 0.90 && value <= 1.10) return "bg-tf-green";
  if (value >= 0.85 && value <= 1.15) return "bg-chart-3";
  return "bg-chart-4";
}

function getEquityLabel(mode: MetricMode, value: number | null): string {
  if (value === null) return "No data";
  if (mode === "cod") {
    if (value <= 10) return "Excellent";
    if (value <= 15) return "Good";
    if (value <= 20) return "Marginal";
    return "Poor";
  }
  if (mode === "prd") {
    if (value >= 0.98 && value <= 1.03) return "Equitable";
    if (value < 0.98) return "Regressive";
    return "Progressive";
  }
  if (value >= 0.90 && value <= 1.10) return "On Target";
  if (value >= 0.85 && value <= 1.15) return "Near Target";
  return "Off Target";
}

function useNeighborhoodEquityMetrics() {
  return useQuery({
    queryKey: ["atlas-neighborhood-equity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comparison_snapshots")
        .select("neighborhood_code, cod, prd, median_ratio, total_parcels, qualified_sales")
        .not("neighborhood_code", "is", null)
        .order("neighborhood_code", { ascending: true });
      if (error) throw error;
      return (data ?? []) as NeighborhoodMetric[];
    },
    staleTime: 60_000,
  });
}

export function NeighborhoodHeatmapLegend() {
  const { data: metrics = [], isLoading } = useNeighborhoodEquityMetrics();
  const [mode, setMode] = useState<MetricMode>("cod");

  const sorted = useMemo(() => {
    return [...metrics].sort((a, b) => {
      const aVal = mode === "cod" ? a.cod : mode === "prd" ? a.prd : a.median_ratio;
      const bVal = mode === "cod" ? b.cod : mode === "prd" ? b.prd : b.median_ratio;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return mode === "cod" ? aVal - bVal : bVal - aVal;
    });
  }, [metrics, mode]);

  const summary = useMemo(() => {
    const withData = metrics.filter(m => (mode === "cod" ? m.cod : mode === "prd" ? m.prd : m.median_ratio) !== null);
    const good = withData.filter(m => {
      const v = mode === "cod" ? m.cod : mode === "prd" ? m.prd : m.median_ratio;
      if (v === null) return false;
      if (mode === "cod") return v <= 15;
      if (mode === "prd") return v >= 0.98 && v <= 1.03;
      return v >= 0.90 && v <= 1.10;
    });
    return { total: metrics.length, withData: withData.length, passing: good.length };
  }, [metrics, mode]);

  if (isLoading) {
    return (
      <Card className="material-bento border-border/50">
        <CardContent className="p-6 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading equity metrics…</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-suite-atlas" />
            Neighborhood Equity Heatmap
          </CardTitle>
          <div className="flex gap-1">
            {(["cod", "prd", "ratio"] as MetricMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-medium uppercase transition-colors",
                  mode === m
                    ? "bg-suite-atlas/20 text-suite-atlas"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        {/* Summary bar */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{summary.total} neighborhoods</span>
          <span>·</span>
          <span className="text-tf-green flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {summary.passing} passing
          </span>
          {summary.withData - summary.passing > 0 && (
            <>
              <span>·</span>
              <span className="text-chart-4 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {summary.withData - summary.passing} flagged
              </span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[280px]">
          <div className="space-y-1">
            {sorted.map((m, i) => {
              const value = mode === "cod" ? m.cod : mode === "prd" ? m.prd : m.median_ratio;
              const color = getEquityColor(mode, value);
              const label = getEquityLabel(mode, value);
              return (
                <motion.div
                  key={m.neighborhood_code}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 transition-colors"
                >
                  <div className={cn("w-2.5 h-2.5 rounded-sm shrink-0", color)} />
                  <span className="text-xs font-mono font-medium text-foreground w-16">
                    {m.neighborhood_code}
                  </span>
                  <span className="text-xs text-muted-foreground flex-1">
                    {m.total_parcels} parcels
                  </span>
                  <span className="text-xs font-medium text-foreground w-14 text-right">
                    {value !== null ? (mode === "cod" ? value.toFixed(1) : value.toFixed(3)) : "—"}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 border-0",
                      color === "bg-tf-green" && "bg-tf-green/15 text-tf-green",
                      color === "bg-chart-3" && "bg-chart-3/15 text-chart-3",
                      color === "bg-chart-4" && "bg-chart-4/15 text-chart-4",
                      color === "bg-destructive" && "bg-destructive/15 text-destructive",
                      color === "bg-muted" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {label}
                  </Badge>
                </motion.div>
              );
            })}
            {sorted.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No neighborhood data available
              </div>
            )}
          </div>
        </ScrollArea>

        {/* IAAO Legend with threshold values */}
        <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-tf-green" /> IAAO Compliant</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-chart-3" /> Marginal</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-chart-4" /> Needs Review</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-destructive" /> Non-Compliant</span>
          </div>
          <div className="text-[9px] text-muted-foreground/70">
            {mode === "cod" && "Thresholds: ≤10 Excellent · ≤15 Good · ≤20 Marginal · >20 Poor"}
            {mode === "prd" && "Thresholds: 0.98–1.03 Equitable · <0.98 Regressive · >1.03 Progressive"}
            {mode === "ratio" && "Thresholds: 0.90–1.10 On Target · 0.85–1.15 Near · Outside Off Target"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
