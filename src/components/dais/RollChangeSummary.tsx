/**
 * TerraFusion OS — Phase 130: Assessment Roll Change Summary
 * Constitutional owner: TerraDais (certification)
 *
 * Summarizes YoY assessment roll changes showing value shifts,
 * new parcels, removed parcels, and net change by property class.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileBarChart,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface RollChangeRow {
  category: string;
  priorTotal: number;
  currentTotal: number;
  priorCount: number;
  currentCount: number;
  netChange: number;
  pctChange: number;
}

function useRollChangeSummary() {
  return useQuery({
    queryKey: ["roll-change-summary"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const priorYear = currentYear - 1;

      const [{ data: current }, { data: prior }] = await Promise.all([
        supabase
          .from("assessments")
          .select("parcel_id, total_value, parcels!inner(property_class)")
          .eq("tax_year", currentYear)
          .limit(1000),
        supabase
          .from("assessments")
          .select("parcel_id, total_value, parcels!inner(property_class)")
          .eq("tax_year", priorYear)
          .limit(1000),
      ]);

      // Aggregate by property class
      const aggregate = (data: any[]) => {
        const map = new Map<string, { total: number; count: number }>();
        for (const a of data || []) {
          const cls = (a.parcels as any)?.property_class || "unknown";
          if (!map.has(cls)) map.set(cls, { total: 0, count: 0 });
          const entry = map.get(cls)!;
          entry.total += a.total_value ?? 0;
          entry.count++;
        }
        return map;
      };

      const currentMap = aggregate(current || []);
      const priorMap = aggregate(prior || []);

      const allClasses = new Set([...currentMap.keys(), ...priorMap.keys()]);
      const rows: RollChangeRow[] = [];

      for (const cls of allClasses) {
        const cur = currentMap.get(cls) || { total: 0, count: 0 };
        const pri = priorMap.get(cls) || { total: 0, count: 0 };
        const net = cur.total - pri.total;
        const pct = pri.total > 0 ? (net / pri.total) * 100 : cur.total > 0 ? 100 : 0;

        rows.push({
          category: cls,
          priorTotal: pri.total,
          currentTotal: cur.total,
          priorCount: pri.count,
          currentCount: cur.count,
          netChange: net,
          pctChange: parseFloat(pct.toFixed(1)),
        });
      }

      // Grand totals
      const grandPrior = rows.reduce((s, r) => s + r.priorTotal, 0);
      const grandCurrent = rows.reduce((s, r) => s + r.currentTotal, 0);
      const grandNet = grandCurrent - grandPrior;

      return {
        rows: rows.sort((a, b) => Math.abs(b.netChange) - Math.abs(a.netChange)),
        totals: {
          priorTotal: grandPrior,
          currentTotal: grandCurrent,
          netChange: grandNet,
          pctChange: grandPrior > 0 ? parseFloat(((grandNet / grandPrior) * 100).toFixed(1)) : 0,
          priorCount: rows.reduce((s, r) => s + r.priorCount, 0),
          currentCount: rows.reduce((s, r) => s + r.currentCount, 0),
        },
      };
    },
    staleTime: 60_000,
  });
}

export function RollChangeSummary() {
  const { data, isLoading } = useRollChangeSummary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const { rows, totals } = data;

  return (
    <div className="space-y-4">
      {/* Grand Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="material-bento border-border/50">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-medium text-foreground">
              ${(totals.priorTotal / 1_000_000).toFixed(1)}M
            </div>
            <div className="text-[10px] text-muted-foreground">Prior Roll</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-border/50">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-medium text-foreground">
              ${(totals.currentTotal / 1_000_000).toFixed(1)}M
            </div>
            <div className="text-[10px] text-muted-foreground">Current Roll</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-border/50">
          <CardContent className="p-3 text-center">
            <div className={cn("text-lg font-medium", totals.netChange >= 0 ? "text-tf-green" : "text-destructive")}>
              {totals.netChange >= 0 ? "+" : ""}${(totals.netChange / 1_000_000).toFixed(1)}M
            </div>
            <div className="text-[10px] text-muted-foreground">Net Change</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-border/50">
          <CardContent className="p-3 text-center">
            <div className={cn("text-lg font-medium flex items-center justify-center gap-1",
              totals.pctChange >= 0 ? "text-tf-green" : "text-destructive"
            )}>
              {totals.pctChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(totals.pctChange)}%
            </div>
            <div className="text-[10px] text-muted-foreground">YoY Change</div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Table */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-suite-dais" />
            Roll Change by Property Class
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 text-muted-foreground font-medium">Class</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Prior</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Current</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Net Change</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">%</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Parcels</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.category} className="border-b border-border/10 hover:bg-muted/20">
                    <td className="py-2 font-medium text-foreground capitalize">{r.category}</td>
                    <td className="py-2 text-right text-muted-foreground">${r.priorTotal.toLocaleString()}</td>
                    <td className="py-2 text-right text-foreground">${r.currentTotal.toLocaleString()}</td>
                    <td className={cn("py-2 text-right font-medium",
                      r.netChange > 0 ? "text-tf-green" : r.netChange < 0 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {r.netChange > 0 ? "+" : ""}${r.netChange.toLocaleString()}
                    </td>
                    <td className={cn("py-2 text-right",
                      r.pctChange > 0 ? "text-tf-green" : r.pctChange < 0 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {r.pctChange > 0 ? "+" : ""}{r.pctChange}%
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {r.priorCount} → {r.currentCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
