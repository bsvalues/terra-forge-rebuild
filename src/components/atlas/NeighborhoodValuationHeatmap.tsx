/**
 * TerraFusion OS — Phase 126: Neighborhood Valuation Heatmap Summary
 * Constitutional owner: TerraAtlas (spatial analysis)
 *
 * Displays a tabular heatmap of neighborhood valuation metrics
 * with color-coded cells for quick spatial pattern identification.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Thermometer,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface NeighborhoodMetric {
  code: string;
  parcelCount: number;
  avgValue: number;
  medianValue: number;
  totalValue: number;
  minValue: number;
  maxValue: number;
  valueIntensity: number; // 0-1 normalized for heatmap coloring
}

function useNeighborhoodValuationData() {
  return useQuery({
    queryKey: ["nbhd-valuation-heatmap"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select("neighborhood_code, assessed_value")
        .not("neighborhood_code", "is", null)
        .not("assessed_value", "is", null)
        .limit(1000);

      if (error) throw error;

      // Aggregate by neighborhood
      const map = new Map<string, number[]>();
      for (const p of data || []) {
        const code = p.neighborhood_code!;
        if (!map.has(code)) map.set(code, []);
        map.get(code)!.push(p.assessed_value ?? 0);
      }

      const metrics: NeighborhoodMetric[] = [];
      let globalMax = 0;

      for (const [code, values] of map.entries()) {
        values.sort((a, b) => a - b);
        const sum = values.reduce((s, v) => s + v, 0);
        const avg = sum / values.length;
        const median = values[Math.floor(values.length / 2)];
        if (avg > globalMax) globalMax = avg;

        metrics.push({
          code,
          parcelCount: values.length,
          avgValue: Math.round(avg),
          medianValue: median,
          totalValue: sum,
          minValue: values[0],
          maxValue: values[values.length - 1],
          valueIntensity: 0,
        });
      }

      // Normalize intensity
      for (const m of metrics) {
        m.valueIntensity = globalMax > 0 ? m.avgValue / globalMax : 0;
      }

      return metrics.sort((a, b) => b.avgValue - a.avgValue);
    },
    staleTime: 30_000,
  });
}

function getHeatColor(intensity: number): string {
  if (intensity > 0.8) return "bg-destructive/30 text-destructive";
  if (intensity > 0.6) return "bg-tf-amber/30 text-tf-amber";
  if (intensity > 0.4) return "bg-tf-gold/30 text-tf-gold";
  if (intensity > 0.2) return "bg-tf-green/30 text-tf-green";
  return "bg-tf-cyan/30 text-tf-cyan";
}

export function NeighborhoodValuationHeatmap() {
  const { data: metrics, isLoading } = useNeighborhoodValuationData();

  const summary = useMemo(() => {
    if (!metrics?.length) return null;
    const total = metrics.reduce((s, m) => s + m.totalValue, 0);
    const parcels = metrics.reduce((s, m) => s + m.parcelCount, 0);
    return { neighborhoods: metrics.length, totalParcels: parcels, totalValue: total };
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="material-bento border-border/50">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-medium text-foreground">{summary.neighborhoods}</div>
              <div className="text-[10px] text-muted-foreground">Neighborhoods</div>
            </CardContent>
          </Card>
          <Card className="material-bento border-border/50">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-medium text-foreground">{summary.totalParcels.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">Total Parcels</div>
            </CardContent>
          </Card>
          <Card className="material-bento border-border/50">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-medium text-foreground">${(summary.totalValue / 1_000_000).toFixed(1)}M</div>
              <div className="text-[10px] text-muted-foreground">Total Assessed</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Heatmap Legend */}
      <div className="flex items-center gap-2 px-1">
        <Thermometer className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Value Intensity:</span>
        <div className="flex gap-1">
          {["Low", "Med-Low", "Medium", "Med-High", "High"].map((label, i) => (
            <Badge
              key={label}
              variant="outline"
              className={cn(
                "text-[8px] px-1.5 py-0",
                getHeatColor((i + 1) * 0.2)
              )}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Heatmap Table */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-suite-atlas" />
            Neighborhood Valuation Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 text-muted-foreground font-medium">Neighborhood</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Parcels</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Avg Value</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Median</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Range</th>
                  <th className="text-center py-2 text-muted-foreground font-medium w-20">Heat</th>
                </tr>
              </thead>
              <tbody>
                {(metrics || []).map((m) => (
                  <tr key={m.code} className="border-b border-border/10 hover:bg-muted/20">
                    <td className="py-2 font-medium text-foreground">{m.code}</td>
                    <td className="py-2 text-right text-muted-foreground">{m.parcelCount}</td>
                    <td className="py-2 text-right text-foreground">${m.avgValue.toLocaleString()}</td>
                    <td className="py-2 text-right text-muted-foreground">${m.medianValue.toLocaleString()}</td>
                    <td className="py-2 text-right text-muted-foreground text-[10px]">
                      ${m.minValue.toLocaleString()}–${m.maxValue.toLocaleString()}
                    </td>
                    <td className="py-2 text-center">
                      <div
                        className={cn(
                          "inline-block w-14 h-5 rounded text-[9px] leading-5 font-medium",
                          getHeatColor(m.valueIntensity)
                        )}
                      >
                        {(m.valueIntensity * 100).toFixed(0)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!metrics || metrics.length === 0) && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No neighborhood data available
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
