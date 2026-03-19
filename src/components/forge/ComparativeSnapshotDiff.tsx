/**
 * TerraFusion OS — Phase 122: Comparative Snapshot Diff Viewer
 * Constitutional owner: TerraForge (valuation analysis)
 *
 * Side-by-side comparison of two comparison_snapshots, showing
 * metric deltas for COD, PRD, median ratio, parcel counts, and values.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

function useSnapshots() {
  return useQuery({
    queryKey: ["comparison-snapshots-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comparison_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

interface MetricRow {
  label: string;
  left: number | null;
  right: number | null;
  format: "number" | "currency" | "pct";
  lowerIsBetter?: boolean;
}

function formatMetric(val: number | null, fmt: string): string {
  if (val === null || val === undefined) return "—";
  if (fmt === "currency") return `$${val.toLocaleString()}`;
  if (fmt === "pct") return `${(val * 100).toFixed(1)}%`;
  return val.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function DeltaIndicator({ left, right, lowerIsBetter }: { left: number | null; right: number | null; lowerIsBetter?: boolean }) {
  if (left === null || right === null) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  const delta = right - left;
  if (Math.abs(delta) < 0.001) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  return improved ? (
    <TrendingUp className="w-3.5 h-3.5 text-tf-green" />
  ) : (
    <TrendingDown className="w-3.5 h-3.5 text-destructive" />
  );
}

export function ComparativeSnapshotDiff() {
  const { data: snapshots, isLoading } = useSnapshots();
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

  const left = useMemo(() => snapshots?.find((s) => s.id === leftId), [snapshots, leftId]);
  const right = useMemo(() => snapshots?.find((s) => s.id === rightId), [snapshots, rightId]);

  const metrics: MetricRow[] = useMemo(() => {
    if (!left || !right) return [];
    return [
      { label: "Total Parcels", left: left.total_parcels, right: right.total_parcels, format: "number" },
      { label: "Avg Assessed Value", left: left.avg_assessed_value, right: right.avg_assessed_value, format: "currency" },
      { label: "Median Assessed Value", left: left.median_assessed_value, right: right.median_assessed_value, format: "currency" },
      { label: "Total Assessed Value", left: left.total_assessed_value, right: right.total_assessed_value, format: "currency" },
      { label: "Avg Sale Price", left: left.avg_sale_price, right: right.avg_sale_price, format: "currency" },
      { label: "Median Ratio", left: left.median_ratio, right: right.median_ratio, format: "number" },
      { label: "COD", left: left.cod, right: right.cod, format: "number", lowerIsBetter: true },
      { label: "PRD", left: left.prd, right: right.prd, format: "number", lowerIsBetter: true },
      { label: "Qualified Sales", left: left.qualified_sales, right: right.qualified_sales, format: "number" },
      { label: "Appeal Count", left: left.appeal_count, right: right.appeal_count, format: "number", lowerIsBetter: true },
      { label: "Appeal Rate", left: left.appeal_rate, right: right.appeal_rate, format: "pct", lowerIsBetter: true },
    ];
  }, [left, right]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Snapshot Selectors */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-suite-forge" />
            Snapshot Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Baseline (Left)</label>
              <Select value={leftId} onValueChange={setLeftId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select snapshot…" />
                </SelectTrigger>
                <SelectContent>
                  {(snapshots || []).map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.snapshot_label} — TY{s.tax_year}
                      {s.neighborhood_code ? ` (${s.neighborhood_code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Current (Right)</label>
              <Select value={rightId} onValueChange={setRightId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select snapshot…" />
                </SelectTrigger>
                <SelectContent>
                  {(snapshots || []).map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.snapshot_label} — TY{s.tax_year}
                      {s.neighborhood_code ? ` (${s.neighborhood_code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diff Table */}
      {left && right && (
        <Card className="material-bento border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Metric Diff: {left.snapshot_label} → {right.snapshot_label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2 text-muted-foreground font-medium">Metric</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Baseline</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Current</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Delta</th>
                    <th className="text-center py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => {
                    const delta =
                      m.left !== null && m.right !== null
                        ? m.right - m.left
                        : null;
                    return (
                      <tr key={m.label} className="border-b border-border/10 hover:bg-muted/20">
                        <td className="py-2 text-foreground">{m.label}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatMetric(m.left, m.format)}
                        </td>
                        <td className="py-2 text-right text-foreground font-medium">
                          {formatMetric(m.right, m.format)}
                        </td>
                        <td className="py-2 text-right">
                          {delta !== null ? (
                            <span className={delta > 0 ? "text-tf-green" : delta < 0 ? "text-destructive" : "text-muted-foreground"}>
                              {delta > 0 ? "+" : ""}{formatMetric(delta, m.format)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 text-center">
                          <DeltaIndicator left={m.left} right={m.right} lowerIsBetter={m.lowerIsBetter} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {(!left || !right) && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Select two snapshots to compare metrics side-by-side
        </div>
      )}
    </div>
  );
}
