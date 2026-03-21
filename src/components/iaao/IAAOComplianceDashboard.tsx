// TerraFusion OS — Phase 155: IAAO Compliance Dashboard
// "I looked at the COD and the COD looked back. We're friends now." — Ralph, Ratio Whisperer 🐟📈

import { useState } from "react";
import { motion } from "framer-motion";
import { useIAAOCompliance, IAAO_THRESHOLDS, type ComplianceGrade, type NeighborhoodCompliance } from "@/hooks/useIAAOCompliance";
import { IAAOReportExportButton } from "./IAAOReportExportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

const gradeConfig: Record<ComplianceGrade, { label: string; color: string; icon: typeof CheckCircle2; bg: string }> = {
  pass: { label: "Compliant", color: "text-emerald-400", icon: CheckCircle2, bg: "bg-emerald-500/10" },
  marginal: { label: "Marginal", color: "text-amber-400", icon: AlertTriangle, bg: "bg-amber-500/10" },
  fail: { label: "Non-Compliant", color: "text-red-400", icon: XCircle, bg: "bg-red-500/10" },
};

function GradeBadge({ grade }: { grade: ComplianceGrade }) {
  const cfg = gradeConfig[grade];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  threshold,
  grade,
  delay,
}: {
  label: string;
  value: number | null;
  threshold: string;
  grade: ComplianceGrade;
  delay: number;
}) {
  const cfg = gradeConfig[grade];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className={`border-border/40 ${cfg.bg}`}>
        <CardContent className="pt-5 pb-4 px-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            <GradeBadge grade={grade} />
          </div>
          <div className="text-2xl font-light tracking-tight text-foreground tabular-nums">
            {value !== null ? value.toFixed(3) : "—"}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">IAAO: {threshold}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ScoreGauge({ score, loading }: { score: number; loading: boolean }) {
  const color = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  const Icon = score >= 80 ? ShieldCheck : score >= 60 ? Shield : ShieldAlert;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="w-32 h-4" />
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" opacity="0.2" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none"
            stroke="currentColor"
            className={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="flex flex-col items-center">
          <Icon className={`w-6 h-6 ${color} mb-0.5`} />
          <span className={`text-2xl font-light tabular-nums ${color}`}>{score}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">Compliance Score</span>
    </motion.div>
  );
}

type SortKey = "neighborhood_code" | "cod" | "prd" | "overall_grade" | "sample_size";

export function IAAOComplianceDashboard() {
  const { data, isLoading } = useIAAOCompliance();
  const [sortKey, setSortKey] = useState<SortKey>("overall_grade");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "neighborhood_code"); }
  };

  const gradeOrder: Record<ComplianceGrade, number> = { fail: 0, marginal: 1, pass: 2 };

  const sorted = [...(data?.neighborhoods || [])].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "overall_grade") cmp = gradeOrder[a.overall_grade] - gradeOrder[b.overall_grade];
    else if (sortKey === "neighborhood_code") cmp = a.neighborhood_code.localeCompare(b.neighborhood_code);
    else cmp = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
    return sortAsc ? cmp : -cmp;
  });

  const countyMedianGrade = data?.countyMedianRatio !== null
    ? (data!.countyMedianRatio! >= 0.90 && data!.countyMedianRatio! <= 1.10 ? "pass" : data!.countyMedianRatio! >= 0.85 && data!.countyMedianRatio! <= 1.15 ? "marginal" : "fail")
    : "fail";
  const countyCODGrade = data?.countyCOD !== null
    ? (data!.countyCOD! <= 10 ? "pass" : data!.countyCOD! <= 15 ? "marginal" : "fail")
    : "fail";
  const countyPRDGrade = data?.countyPRD !== null
    ? (data!.countyPRD! >= 0.98 && data!.countyPRD! <= 1.03 ? "pass" : data!.countyPRD! >= 0.95 && data!.countyPRD! <= 1.05 ? "marginal" : "fail")
    : "fail";
  const countyPRBGrade = data?.countyPRB !== null
    ? (Math.abs(data!.countyPRB!) <= 0.05 ? "pass" : Math.abs(data!.countyPRB!) <= 0.10 ? "marginal" : "fail")
    : "fail";

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">
              IAAO Compliance Monitor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Neighborhood-level ratio study compliance against IAAO Standard on Mass Appraisal
            </p>
          </div>
          <IAAOReportExportButton />
        </div>
      </motion.div>

      {/* Top Row: Score + County Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Score Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="border-border/40 h-full flex flex-col items-center justify-center py-6">
            <ScoreGauge score={data?.overallScore ?? 0} loading={isLoading} />
            {data && !isLoading && (
              <div className="flex gap-4 mt-4 text-[10px]">
                <span className="text-emerald-400">{data.passingCount} pass</span>
                <span className="text-amber-400">{data.marginalCount} marginal</span>
                <span className="text-red-400">{data.failingCount} fail</span>
              </div>
            )}
          </Card>
        </motion.div>

        {/* County-wide Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/40">
                <CardContent className="pt-5 pb-4 px-5 space-y-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-2 w-24" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <MetricCard
                label="Median Ratio" value={data?.countyMedianRatio ?? null}
                threshold="0.90 – 1.10" grade={countyMedianGrade as ComplianceGrade} delay={0.15}
              />
              <MetricCard
                label="COD" value={data?.countyCOD ?? null}
                threshold="≤ 15.0" grade={countyCODGrade as ComplianceGrade} delay={0.2}
              />
              <MetricCard
                label="PRD" value={data?.countyPRD ?? null}
                threshold="0.98 – 1.03" grade={countyPRDGrade as ComplianceGrade} delay={0.25}
              />
              <MetricCard
                label="PRB" value={data?.countyPRB ?? null}
                threshold="± 0.05" grade={countyPRBGrade as ComplianceGrade} delay={0.3}
              />
            </>
          )}
        </div>
      </div>

      {/* Distribution Bar */}
      {data && !isLoading && data.totalNeighborhoods > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="border-border/40">
            <CardContent className="py-4 px-5">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Compliance Distribution — {data.totalNeighborhoods} neighborhoods analyzed
                </span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
                {data.passingCount > 0 && (
                  <motion.div
                    className="bg-emerald-500/70 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(data.passingCount / data.totalNeighborhoods) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                )}
                {data.marginalCount > 0 && (
                  <motion.div
                    className="bg-amber-500/70 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(data.marginalCount / data.totalNeighborhoods) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  />
                )}
                {data.failingCount > 0 && (
                  <motion.div
                    className="bg-red-500/70 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(data.failingCount / data.totalNeighborhoods) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Neighborhood Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              Per-Neighborhood Compliance Grid
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[480px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border/30">
                    {[
                      { key: "neighborhood_code" as SortKey, label: "Neighborhood" },
                      { key: "sample_size" as SortKey, label: "Sales" },
                      { key: "cod" as SortKey, label: "COD" },
                      { key: "prd" as SortKey, label: "PRD" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="text-left py-2.5 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && <ArrowUpDown className="w-3 h-3" />}
                        </span>
                      </th>
                    ))}
                    <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">PRB</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">Median</th>
                    <th
                      className="text-left py-2.5 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("overall_grade")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Status
                        {sortKey === "overall_grade" && <ArrowUpDown className="w-3 h-3" />}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/20">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="py-2.5 px-4"><Skeleton className="h-4 w-12" /></td>
                        ))}
                      </tr>
                    ))
                  ) : sorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No neighborhoods with sufficient sales data (≥3 sales required)
                      </td>
                    </tr>
                  ) : (
                    sorted.map((n, i) => (
                      <motion.tr
                        key={n.neighborhood_code}
                        className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.02 * Math.min(i, 15) }}
                      >
                        <td className="py-2.5 px-4 font-mono font-medium text-foreground">
                          {n.neighborhood_code}
                        </td>
                        <td className="py-2.5 px-4 tabular-nums text-muted-foreground">
                          {n.sample_size}
                        </td>
                        <td className="py-2.5 px-4 tabular-nums">
                          <span className={gradeConfig[n.cod_grade].color}>
                            {n.cod !== null ? n.cod.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 tabular-nums">
                          <span className={gradeConfig[n.prd_grade].color}>
                            {n.prd !== null ? n.prd.toFixed(3) : "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 tabular-nums">
                          <span className={gradeConfig[n.prb_grade].color}>
                            {n.prb !== null ? n.prb.toFixed(3) : "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 tabular-nums">
                          <span className={gradeConfig[n.median_grade].color}>
                            {n.median_ratio !== null ? n.median_ratio.toFixed(3) : "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <GradeBadge grade={n.overall_grade} />
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* IAAO Reference Footer */}
      <motion.div
        className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">IAAO Standard on Ratio Studies (2013):</strong>{" "}
          Residential COD ≤ 15.0 (excellent ≤ 10.0) · PRD 0.98–1.03 · PRB ± 0.05 · Median ratio 0.90–1.10.
          Neighborhoods require ≥ 3 qualified sales to produce reliable statistics.
        </p>
      </motion.div>
    </div>
  );
}
