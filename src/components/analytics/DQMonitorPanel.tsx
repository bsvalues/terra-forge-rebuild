// TerraFusion OS — DQ Continuous Monitor Panel (Phase 176)
// Renders per-table record counts, null rates, 7-day sparklines, and status badges.

import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { useDQMonitor, type DQTableStat } from "@/hooks/useDQMonitor";

// ── Status helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DQTableStat["status"] }) {
  if (status === "healthy") {
    return (
      <Badge className="text-[10px] bg-[hsl(var(--tf-optimized-green)/0.15)] text-[hsl(var(--tf-optimized-green))] border-[hsl(var(--tf-optimized-green)/0.3)]">
        <ShieldCheck className="w-3 h-3 mr-1" />Healthy
      </Badge>
    );
  }
  if (status === "warning") {
    return (
      <Badge className="text-[10px] bg-[hsl(var(--tf-sacred-gold)/0.15)] text-[hsl(var(--tf-sacred-gold))] border-[hsl(var(--tf-sacred-gold)/0.3)]">
        <AlertTriangle className="w-3 h-3 mr-1" />Warning
      </Badge>
    );
  }
  return (
    <Badge className="text-[10px] bg-[hsl(var(--tf-warning-red)/0.15)] text-[hsl(var(--tf-warning-red))] border-[hsl(var(--tf-warning-red)/0.3)]">
      <XCircle className="w-3 h-3 mr-1" />Critical
    </Badge>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DQMonitorPanel() {
  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useDQMonitor();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="material-bento border-border/50">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No DQ data available</p>
        </CardContent>
      </Card>
    );
  }

  const overall = data.tables.every((t) => t.status === "healthy")
    ? "healthy"
    : data.tables.some((t) => t.status === "critical")
    ? "critical"
    : "warning";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium text-foreground">Data Quality Monitor</h2>
          <StatusBadge status={overall} />
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Per-table stats */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Table Health</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Table</th>
                <th className="text-right px-4 py-2 font-medium">Records</th>
                <th className="text-right px-4 py-2 font-medium">Null Rate</th>
                <th className="text-right px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.tables.map((t, i) => (
                <tr
                  key={t.table}
                  className={`border-b border-border/20 ${i % 2 === 0 ? "bg-muted/10" : ""}`}
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">{t.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{t.count.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <span className={
                      t.nullRate <= 5
                        ? "text-[hsl(var(--tf-optimized-green))]"
                        : t.nullRate <= 20
                        ? "text-[hsl(var(--tf-sacred-gold))]"
                        : "text-[hsl(var(--tf-warning-red))]"
                    }>
                      {t.nullRate}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 7-day Sparkline */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">7-Day Record Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={data.sparkData}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 9 }}
                tickFormatter={(v) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(v: number, name: string) => [v.toLocaleString(), name]}
              />
              <Line
                type="monotone"
                dataKey="parcels"
                stroke="hsl(var(--primary))"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="hsl(var(--tf-transcend-cyan, 180 80% 60%))"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-2">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block w-3 h-0.5 bg-primary rounded" /> Parcels
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block w-3 h-0.5 bg-[hsl(var(--tf-transcend-cyan,180_80%_60%))] rounded" /> Sales
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Footer timestamp */}
      {dataUpdatedAt > 0 && (
        <p className="text-[10px] text-muted-foreground text-right">
          Last checked: {new Date(dataUpdatedAt).toLocaleTimeString()}
        </p>
      )}
    </motion.div>
  );
}
