// TerraFusion OS — Outlier Detection Panel (Phase 25.3)

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenanceNumber } from "@/components/trust";
import { AlertTriangle, Filter, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useOutlierDetection } from "@/hooks/useAdvancedAnalytics";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

export function OutlierDetectionPanel() {
  const currentYear = new Date().getFullYear();
  const [threshold, setThreshold] = useState(2.5);
  const { data, isLoading } = useOutlierDetection(currentYear, threshold);

  if (isLoading) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  if (!data) {
    return (
      <div className="material-bento rounded-2xl p-12 text-center">
        <p className="text-muted-foreground text-sm">No parcel data available for outlier detection.</p>
      </div>
    );
  }

  const { outliers, stats } = data;
  const outlierPct = ((outliers.length / stats.totalParcels) * 100).toFixed(1);

  // Distribution histogram
  const bucketSize = stats.iqr > 0 ? Math.round(stats.iqr / 4) : 50000;
  const buckets = new Map<number, number>();
  // We'll create a simple representation of the value distribution
  const histData = [
    { range: `< Q1`, label: "Below Q1", count: outliers.filter((o) => o.assessedValue < stats.q1).length, outlier: true },
    { range: "Q1–Med", label: "Q1 to Median", count: Math.round(stats.totalParcels * 0.25), outlier: false },
    { range: "Med–Q3", label: "Median to Q3", count: Math.round(stats.totalParcels * 0.25), outlier: false },
    { range: `> Q3`, label: "Above Q3", count: outliers.filter((o) => o.assessedValue > stats.q3).length, outlier: true },
  ];

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Parcels" value={stats.totalParcels.toLocaleString()} />
        <StatCard label="Outliers Found" value={outliers.length.toString()} highlight />
        <StatCard label="Outlier Rate" value={`${outlierPct}%`} />
        <StatCard label="Mean Value" value={`$${Math.round(stats.mean).toLocaleString()}`} />
        <StatCard label="Std Deviation" value={`$${Math.round(stats.stdDev).toLocaleString()}`} />
      </div>

      {/* Distribution + IQR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Value Distribution</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
            <div className="p-2 rounded-lg bg-muted/20">
              <span className="text-muted-foreground">Q1:</span>{" "}
              <span className="font-mono text-foreground">${stats.q1.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/20">
              <span className="text-muted-foreground">Median:</span>{" "}
              <span className="font-mono text-foreground">${stats.median.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/20">
              <span className="text-muted-foreground">Q3:</span>{" "}
              <span className="font-mono text-foreground">${stats.q3.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/20">
              <span className="text-muted-foreground">IQR:</span>{" "}
              <span className="font-mono text-foreground">${stats.iqr.toLocaleString()}</span>
            </div>
          </div>

          {/* Threshold slider */}
          <div className="flex items-center gap-3 mt-4">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <label className="text-[10px] text-muted-foreground">Z-Score Threshold:</label>
            <input
              type="range"
              min={1.5}
              max={4}
              step={0.5}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="flex-1 accent-primary h-1"
            />
            <Badge variant="outline" className="text-[10px] font-mono">{threshold.toFixed(1)}σ</Badge>
          </div>
        </motion.div>

        {/* Outlier scatter by Z-score */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-[hsl(var(--tf-warning-red))]" />
            <h3 className="text-sm font-medium text-foreground">Outlier Z-Scores</h3>
            <Badge variant="outline" className="text-[10px] ml-auto">{outliers.length} flagged</Badge>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={outliers.slice(0, 25)}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="parcelNumber"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Z-Score", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 11,
                  }}
                  formatter={(v: number) => [v.toFixed(2), "Z-Score"]}
                  labelFormatter={(label) => `Parcel: ${label}`}
                />
                <ReferenceLine y={threshold} stroke="hsl(var(--tf-warning-red))" strokeDasharray="4 4" />
                <ReferenceLine y={-threshold} stroke="hsl(var(--tf-warning-red))" strokeDasharray="4 4" />
                <Bar dataKey="zScore" radius={[4, 4, 0, 0]}>
                  {outliers.slice(0, 25).map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={
                        Math.abs(entry.zScore) > 3
                          ? "hsl(var(--tf-warning-red))"
                          : "hsl(var(--tf-sacred-gold))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Outlier table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="material-bento rounded-2xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-3">Flagged Parcels</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Parcel #</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Address</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Assessed Value</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Z-Score</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Method</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {outliers.slice(0, 20).map((o) => (
                <tr key={o.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                  <td className="py-2 px-2 font-mono text-foreground">{o.parcelNumber}</td>
                  <td className="py-2 px-2 text-muted-foreground truncate max-w-[200px]">{o.address}</td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">
                    ${o.assessedValue.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className={Math.abs(o.zScore) > 3 ? "text-[hsl(var(--tf-warning-red))] font-medium" : "text-[hsl(var(--tf-sacred-gold))]"}>
                      {o.zScore.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <Badge variant="outline" className="text-[9px]">
                      {o.method === "zscore" ? "Z-Score" : "IQR"}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{o.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {outliers.length > 20 && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Showing 20 of {outliers.length} flagged parcels
          </p>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="material-bento rounded-xl p-4 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <ProvenanceNumber source="outlier-detection" cachePolicy="cached 300s">
        <span className={`text-lg font-light ${highlight ? "text-[hsl(var(--tf-warning-red))]" : "text-foreground"}`}>
          {value}
        </span>
      </ProvenanceNumber>
    </div>
  );
}
