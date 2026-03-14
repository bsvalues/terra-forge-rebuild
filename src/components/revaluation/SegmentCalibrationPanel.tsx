// TerraFusion OS — Segment Calibration Panel (Phase 26.3)

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenanceNumber } from "@/components/trust";
import { BarChart3, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { useSegmentDefinitions, useSegmentEquityMetrics } from "@/hooks/useSegmentDefinitions";

export function SegmentCalibrationPanel() {
  const { data: segments, isLoading: segLoading } = useSegmentDefinitions();
  const activeSegments = (segments ?? []).filter((s) => s.is_active);
  const { data: equityData, isLoading: eqLoading } = useSegmentEquityMetrics(activeSegments);

  if (segLoading || eqLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    );
  }

  if (activeSegments.length === 0) {
    return (
      <div className="material-bento rounded-2xl p-12 text-center">
        <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          No active segments. Enable or create segments in the Segment Manager tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Per-segment calibration cards */}
      {(equityData ?? []).map((seg) => {
        // Compute overall segment stats
        const totalParcels = seg.ranges.reduce((a, r) => a + r.parcelCount, 0);
        const totalSales = seg.ranges.reduce((a, r) => a + r.salesCount, 0);
        const ratios = seg.ranges.filter((r) => r.medianRatio !== null);
        const avgCod = ratios.length > 0
          ? ratios.reduce((a, r) => a + (r.cod ?? 0), 0) / ratios.length
          : null;

        const chartData = seg.ranges.map((r) => ({
          name: r.rangeLabel,
          medianRatio: r.medianRatio ?? 0,
          cod: r.cod ?? 0,
          parcels: r.parcelCount,
          sales: r.salesCount,
        }));

        return (
          <motion.div
            key={seg.segmentId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="material-bento rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">{seg.segmentName}</h3>
              <Badge variant="outline" className="text-[10px]">
                {seg.factor} • {totalParcels} parcels • {totalSales} sales
              </Badge>
              <div className="ml-auto">
                {avgCod !== null && (
                  <Badge className={`text-[10px] ${codBadgeClass(avgCod)}`}>
                    Avg COD: {avgCod.toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Ratio comparison chart */}
            <div className="h-[240px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0.7, 1.3]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 11,
                    }}
                    formatter={(v: number, name: string) => [
                      name === "medianRatio" ? v.toFixed(3) : `${v.toFixed(1)}%`,
                      name === "medianRatio" ? "Median Ratio" : "COD",
                    ]}
                  />
                  <ReferenceLine
                    y={1.0}
                    stroke="hsl(var(--tf-optimized-green))"
                    strokeDasharray="4 4"
                    label={{ value: "1.00", position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                  />
                  <Bar dataKey="medianRatio" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={ratioBarColor(entry.medianRatio)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Range detail grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {seg.ranges.map((r) => {
                const verdict = getVerdict(r.medianRatio, r.cod);
                const VIcon = verdict.icon;
                return (
                  <div key={r.rangeLabel} className="p-3 rounded-lg bg-muted/10 border border-border/20">
                    <p className="text-[10px] text-muted-foreground mb-1">{r.rangeLabel}</p>
                    <div className="flex items-center gap-1.5 mb-1">
                      <VIcon className={`w-3 h-3 ${verdict.color}`} />
                      <ProvenanceNumber source="segment-calibration" cachePolicy="cached 120s">
                        <span className={`text-sm font-mono ${verdict.color}`}>
                          {r.medianRatio?.toFixed(3) ?? "—"}
                        </span>
                      </ProvenanceNumber>
                    </div>
                    <p className="text-[9px] text-muted-foreground">
                      COD: {r.cod?.toFixed(1) ?? "—"}% • {r.salesCount} sales
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function ratioBarColor(ratio: number): string {
  if (ratio >= 0.95 && ratio <= 1.05) return "hsl(var(--tf-optimized-green))";
  if (ratio >= 0.90 && ratio <= 1.10) return "hsl(var(--tf-sacred-gold))";
  return "hsl(var(--tf-warning-red))";
}

function codBadgeClass(cod: number): string {
  if (cod <= 10) return "bg-[hsl(var(--tf-optimized-green)/0.15)] text-[hsl(var(--tf-optimized-green))]";
  if (cod <= 15) return "bg-[hsl(var(--tf-sacred-gold)/0.15)] text-[hsl(var(--tf-sacred-gold))]";
  return "bg-[hsl(var(--destructive)/0.15)] text-destructive";
}

function getVerdict(ratio: number | null, cod: number | null) {
  if (ratio === null) return { icon: AlertTriangle, color: "text-muted-foreground" };
  if (ratio >= 0.95 && ratio <= 1.05 && (cod ?? 0) <= 10)
    return { icon: CheckCircle2, color: "text-[hsl(var(--tf-optimized-green))]" };
  if (ratio >= 0.90 && ratio <= 1.10 && (cod ?? 0) <= 15)
    return { icon: AlertTriangle, color: "text-[hsl(var(--tf-sacred-gold))]" };
  return { icon: XCircle, color: "text-[hsl(var(--tf-warning-red))]" };
}
