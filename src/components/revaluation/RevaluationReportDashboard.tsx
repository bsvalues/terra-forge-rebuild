// TerraFusion OS — Phase 74: Revaluation Reporting & Export Dashboard
// "I exported the data and it waved goodbye. We had a moment." — Ralph Wiggum

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, Building2, Download, FileSpreadsheet,
  TrendingUp, TrendingDown, DollarSign, Layers,
  Target, PieChart, MapPin, Activity, Table,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { useRevaluationCycles } from "@/hooks/useRevaluationCycles";
import {
  useRevaluationReport,
  type ClassSummary,
  type NeighborhoodSummary,
  type ValueBucket,
} from "@/hooks/useRevaluationReport";
import { exportCSV, exportXLSX, type ExportableDataset } from "@/components/export/ExportEngine";
import { toast } from "sonner";

// ── Format helpers ─────────────────────────────────────────────────
const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtNum = (v: number) => v.toLocaleString();
const fmtPct = (v: number | null) => v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "N/A";

// ── Stat Card ──────────────────────────────────────────────────────
function StatCard({
  label, value, subValue, icon: Icon, trend,
}: {
  label: string; value: string; subValue?: string;
  icon: React.ElementType; trend?: "up" | "down" | "flat";
}) {
  return (
    <Card className="border-border/40 bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${
              trend === "up" ? "text-emerald-400" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            }`}>
              {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
              {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
              {trend === "flat" && <Minus className="h-3 w-3" />}
            </div>
          )}
        </div>
        <div className="mt-3">
          <div className="text-lg font-bold font-mono">{value}</div>
          <div className="text-[10px] text-muted-foreground">{label}</div>
          {subValue && (
            <div className="text-[9px] text-muted-foreground mt-0.5">{subValue}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Class Breakdown Table ──────────────────────────────────────────
function ClassBreakdownTable({ classes }: { classes: ClassSummary[] }) {
  const grandTotal = classes.reduce((s, c) => s + c.total_value, 0);
  return (
    <Card className="border-border/40 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          Value by Property Class
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground">
                <th className="text-left p-3 font-medium">Class</th>
                <th className="text-right p-3 font-medium">Parcels</th>
                <th className="text-right p-3 font-medium">Land Value</th>
                <th className="text-right p-3 font-medium">Improvement</th>
                <th className="text-right p-3 font-medium">Total Value</th>
                <th className="text-right p-3 font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.property_class} className="border-b border-border/10 hover:bg-muted/10">
                  <td className="p-3 font-semibold">{c.property_class}</td>
                  <td className="p-3 text-right font-mono">{fmtNum(c.parcel_count)}</td>
                  <td className="p-3 text-right font-mono">{fmtCurrency(c.land_value)}</td>
                  <td className="p-3 text-right font-mono">{fmtCurrency(c.improvement_value)}</td>
                  <td className="p-3 text-right font-mono font-semibold">{fmtCurrency(c.total_value)}</td>
                  <td className="p-3 text-right font-mono text-muted-foreground">
                    {grandTotal > 0 ? ((c.total_value / grandTotal) * 100).toFixed(1) + "%" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/10 font-semibold">
                <td className="p-3">Total</td>
                <td className="p-3 text-right font-mono">{fmtNum(classes.reduce((s, c) => s + c.parcel_count, 0))}</td>
                <td className="p-3 text-right font-mono">{fmtCurrency(classes.reduce((s, c) => s + c.land_value, 0))}</td>
                <td className="p-3 text-right font-mono">{fmtCurrency(classes.reduce((s, c) => s + c.improvement_value, 0))}</td>
                <td className="p-3 text-right font-mono">{fmtCurrency(grandTotal)}</td>
                <td className="p-3 text-right font-mono">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Value Distribution Bar Chart ───────────────────────────────────
function ValueDistribution({ buckets }: { buckets: ValueBucket[] }) {
  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  return (
    <Card className="border-border/40 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Value Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {buckets.map((b) => (
          <div key={b.bucket}>
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="font-medium">{b.bucket}</span>
              <span className="text-muted-foreground font-mono">{fmtNum(b.count)} parcels</span>
            </div>
            <div className="h-4 bg-muted/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(b.count / maxCount) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Neighborhood Summary ───────────────────────────────────────────
function NeighborhoodTable({ neighborhoods }: { neighborhoods: NeighborhoodSummary[] }) {
  return (
    <Card className="border-border/40 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Neighborhood Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border/30 text-muted-foreground">
                <th className="text-left p-3 font-medium">Neighborhood</th>
                <th className="text-right p-3 font-medium">Parcels</th>
                <th className="text-right p-3 font-medium">Total Value</th>
                <th className="text-right p-3 font-medium">Avg Value</th>
              </tr>
            </thead>
            <tbody>
              {neighborhoods.map((n) => (
                <tr key={n.neighborhood} className="border-b border-border/10 hover:bg-muted/10">
                  <td className="p-3 font-semibold">{n.neighborhood}</td>
                  <td className="p-3 text-right font-mono">{fmtNum(n.parcel_count)}</td>
                  <td className="p-3 text-right font-mono">{fmtCurrency(n.total_value)}</td>
                  <td className="p-3 text-right font-mono text-muted-foreground">{fmtCurrency(n.avg_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Ratio Study Card ───────────────────────────────────────────────
function RatioStudyCard({ ratio }: { ratio: { sample_size: number; median_ratio: number | null; cod: number | null; prd: number | null } }) {
  if (ratio.sample_size === 0) {
    return (
      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-6 text-center">
          <Activity className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No ratio study data available for this cycle</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { label: "Median Ratio", value: ratio.median_ratio?.toFixed(4) ?? "—", target: "1.0000", pass: ratio.median_ratio != null && Math.abs(ratio.median_ratio - 1) <= 0.05 },
    { label: "COD", value: ratio.cod?.toFixed(2) ?? "—", target: "≤15.0", pass: ratio.cod != null && ratio.cod <= 15 },
    { label: "PRD", value: ratio.prd?.toFixed(3) ?? "—", target: "0.98–1.03", pass: ratio.prd != null && ratio.prd >= 0.98 && ratio.prd <= 1.03 },
    { label: "Sample Size", value: fmtNum(ratio.sample_size), target: "≥30", pass: ratio.sample_size >= 30 },
  ];

  return (
    <Card className="border-border/40 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          IAAO Ratio Study Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="p-3 rounded-lg border border-border/20 bg-muted/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
                <Badge variant="outline" className={`text-[8px] ${m.pass ? "text-emerald-400" : "text-amber-400"}`}>
                  {m.pass ? "PASS" : "REVIEW"}
                </Badge>
              </div>
              <div className="text-sm font-bold font-mono">{m.value}</div>
              <div className="text-[9px] text-muted-foreground">Target: {m.target}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Export Builder ──────────────────────────────────────────────────
function buildReportDataset(report: NonNullable<ReturnType<typeof useRevaluationReport>["data"]>): ExportableDataset {
  return {
    title: `Revaluation Report TY${report.tax_year}`,
    metadata: {
      "Report": "Revaluation Cycle Summary",
      "Cycle": report.cycle_name,
      "Tax Year": String(report.tax_year),
      "Status": report.status.toUpperCase(),
      "Total Parcels": fmtNum(report.total_parcels),
      "Total Assessed Value": fmtCurrency(report.total_assessed_value),
      "Value Change": fmtPct(report.value_change_pct),
      "Generated": report.generated_at,
      "System": "TerraFusion OS",
    },
    sheets: [
      {
        name: "Class Summary",
        headers: ["Property Class", "Parcel Count", "Land Value", "Improvement Value", "Total Value"],
        rows: report.class_summary.map(c => [
          c.property_class, c.parcel_count, c.land_value, c.improvement_value, c.total_value,
        ]),
      },
      {
        name: "Neighborhood Summary",
        headers: ["Neighborhood", "Parcel Count", "Total Value", "Avg Value"],
        rows: report.neighborhood_summary.map(n => [
          n.neighborhood, n.parcel_count, n.total_value, n.avg_value,
        ]),
      },
      {
        name: "Value Distribution",
        headers: ["Value Range", "Parcel Count", "Total Value"],
        rows: report.value_distribution.map(b => [b.bucket, b.count, b.total_value]),
      },
      {
        name: "Ratio Study",
        headers: ["Metric", "Value"],
        rows: [
          ["Median Ratio", report.ratio_study.median_ratio ?? "N/A"],
          ["COD", report.ratio_study.cod ?? "N/A"],
          ["PRD", report.ratio_study.prd ?? "N/A"],
          ["Sample Size", report.ratio_study.sample_size],
        ],
      },
    ],
  };
}

// ── Main Component ─────────────────────────────────────────────────
interface RevaluationReportDashboardProps {
  onNavigate?: (target: string) => void;
}

export function RevaluationReportDashboard({ onNavigate }: RevaluationReportDashboardProps) {
  const { data: cycles, isLoading: cyclesLoading } = useRevaluationCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  const activeCycleId = selectedCycleId
    || cycles?.find(c => c.status === "completed")?.id
    || cycles?.[0]?.id
    || null;

  const { data: report, isLoading: reportLoading } = useRevaluationReport(activeCycleId);

  const isLoading = cyclesLoading || reportLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cycles || cycles.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-1">No Revaluation Data</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Complete a revaluation cycle to generate reports.
            </p>
            <Button onClick={() => onNavigate?.("launch-reval")} className="gap-2">
              <Target className="h-4 w-4" /> Launch Revaluation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const changeTrend: "up" | "down" | "flat" =
    report?.value_change_pct != null
      ? report.value_change_pct > 0 ? "up" : report.value_change_pct < 0 ? "down" : "flat"
      : "flat";

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/15 border border-primary/20">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Revaluation Report</h1>
            <p className="text-sm text-muted-foreground">
              {report?.cycle_name || "—"} • TY {report?.tax_year || "—"}
              <Badge variant="outline" className={`ml-2 text-[9px] ${
                report?.status === "completed" ? "text-emerald-400" : "text-amber-400"
              }`}>
                {report?.status?.toUpperCase() || "—"}
              </Badge>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cycle Selector */}
          {cycles.length > 1 && (
            <div className="flex gap-1">
              {cycles.slice(0, 4).map((c) => (
                <Button
                  key={c.id}
                  variant={c.id === activeCycleId ? "default" : "outline"}
                  size="sm"
                  className="text-[10px] h-7"
                  onClick={() => setSelectedCycleId(c.id)}
                >
                  TY {c.tax_year}
                </Button>
              ))}
            </div>
          )}

          {/* Export Actions */}
          {report && (
            <div className="flex gap-1">
              <Button
                variant="outline" size="sm" className="gap-1 text-[10px] h-7"
                onClick={() => {
                  exportCSV(buildReportDataset(report));
                  toast.success("CSV report exported");
                }}
              >
                <Table className="h-3 w-3" /> CSV
              </Button>
              <Button
                size="sm" className="gap-1 text-[10px] h-7"
                onClick={async () => {
                  await exportXLSX(buildReportDataset(report));
                  toast.success("Excel report exported");
                }}
              >
                <FileSpreadsheet className="h-3 w-3" /> Excel
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* KPI Cards */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Assessed Value"
            value={fmtCurrency(report.total_assessed_value)}
            icon={DollarSign}
            trend={changeTrend}
            subValue={`Change: ${fmtPct(report.value_change_pct)}`}
          />
          <StatCard
            label="Total Parcels"
            value={fmtNum(report.total_parcels)}
            icon={Building2}
          />
          <StatCard
            label="Land Value"
            value={fmtCurrency(report.total_land_value)}
            icon={Layers}
            subValue={report.total_assessed_value > 0
              ? `${((report.total_land_value / report.total_assessed_value) * 100).toFixed(1)}% of total`
              : undefined}
          />
          <StatCard
            label="Improvement Value"
            value={fmtCurrency(report.total_improvement_value)}
            icon={Building2}
            subValue={report.total_assessed_value > 0
              ? `${((report.total_improvement_value / report.total_assessed_value) * 100).toFixed(1)}% of total`
              : undefined}
          />
        </div>
      )}

      {/* Prior Year Comparison */}
      {report && report.prior_year_assessed > 0 && (
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                {changeTrend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : changeTrend === "down" ? (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-semibold">Year-Over-Year Change</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">
                Prior Year: {fmtCurrency(report.prior_year_assessed)}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold">
                Current: {fmtCurrency(report.total_assessed_value)}
              </span>
              <Badge variant="outline" className={`text-[9px] ${
                changeTrend === "up" ? "text-emerald-400" : changeTrend === "down" ? "text-destructive" : "text-muted-foreground"
              }`}>
                {fmtPct(report.value_change_pct)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Class Breakdown + Value Distribution */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ClassBreakdownTable classes={report.class_summary} />
          </div>
          <ValueDistribution buckets={report.value_distribution} />
        </div>
      )}

      {/* Ratio Study + Neighborhoods */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RatioStudyCard ratio={report.ratio_study} />
          <NeighborhoodTable neighborhoods={report.neighborhood_summary} />
        </div>
      )}

      {/* Quick Actions */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Navigate:</span>
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"
              onClick={() => onNavigate?.("reval-progress")}>
              <Activity className="h-3 w-3" /> Progress Tracker
            </Button>
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"
              onClick={() => onNavigate?.("readiness")}>
              <Target className="h-3 w-3" /> Roll Readiness
            </Button>
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"
              onClick={() => onNavigate?.("exports")}>
              <Download className="h-3 w-3" /> Export Center
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
