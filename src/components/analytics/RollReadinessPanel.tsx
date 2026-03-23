// TerraFusion OS — Roll Readiness Panel (Phase 179)
// Extracted component with animated gauge + drill-down checklist.
// Consumes the existing useRollReadiness() hook.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, ScrollText,
} from "lucide-react";
import { useRollReadiness } from "@/hooks/useRollReadiness";
import type { ReadinessCheck } from "@/hooks/useRollReadiness";

// ── Helpers ───────────────────────────────────────────────────────────────────

function verdictConfig(verdict: "GO" | "CAUTION" | "NO_GO") {
  if (verdict === "GO") return {
    label: "GO", color: "text-[hsl(var(--tf-optimized-green))]",
    bg: "bg-[hsl(var(--tf-optimized-green)/0.15)]",
    gauge: "hsl(var(--tf-optimized-green))",
    icon: CheckCircle2,
  };
  if (verdict === "CAUTION") return {
    label: "CAUTION", color: "text-[hsl(var(--tf-sacred-gold))]",
    bg: "bg-[hsl(var(--tf-sacred-gold)/0.15)]",
    gauge: "hsl(var(--tf-sacred-gold))",
    icon: AlertTriangle,
  };
  return {
    label: "NO-GO", color: "text-[hsl(var(--tf-warning-red))]",
    bg: "bg-[hsl(var(--tf-warning-red)/0.15)]",
    gauge: "hsl(var(--tf-warning-red))",
    icon: XCircle,
  };
}

function CheckIcon({ status }: { status: ReadinessCheck["status"] }) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-[hsl(var(--tf-optimized-green))]" />;
  if (status === "warn") return <AlertTriangle className="w-4 h-4 text-[hsl(var(--tf-sacred-gold))]" />;
  return <XCircle className="w-4 h-4 text-[hsl(var(--tf-warning-red))]" />;
}

// ── Main component ────────────────────────────────────────────────────────────

export function RollReadinessPanel() {
  const { data, isLoading } = useRollReadiness();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="material-bento border-border/50">
        <CardContent className="p-8 text-center">
          <ScrollText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Roll readiness data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  const vc = verdictConfig(data.verdict);
  const VerdictIcon = vc.icon;
  const gaugeData = [{ value: data.overallScore, fill: vc.gauge }];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Gauge card */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-suite-forge" />
            Roll Readiness
            <Badge className={`text-[10px] ${vc.bg} ${vc.color} border-current`}>
              <VerdictIcon className="w-3 h-3 mr-1" />
              {vc.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* RadialBar gauge */}
            <div className="w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="100%"
                  startAngle={225}
                  endAngle={-45}
                  data={gaugeData}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar
                    dataKey="value"
                    cornerRadius={4}
                    background={{ fill: "hsl(var(--muted))" }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            {/* Score + summary stats */}
            <div className="space-y-3 flex-1 min-w-0">
              <div>
                <span className={`text-4xl font-light ${vc.color}`}>{data.overallScore}</span>
                <span className="text-muted-foreground text-sm">/100</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/20 rounded-lg p-2">
                  <div className="text-muted-foreground">Total Parcels</div>
                  <div className="font-medium tabular-nums">{data.summary.totalParcels.toLocaleString()}</div>
                </div>
                <div className="bg-muted/20 rounded-lg p-2">
                  <div className="text-muted-foreground">Cert Rate</div>
                  <div className="font-medium tabular-nums">{data.summary.certRate}%</div>
                </div>
                <div className="bg-muted/20 rounded-lg p-2">
                  <div className="text-muted-foreground">Calibrated Nbhds</div>
                  <div className="font-medium tabular-nums">
                    {data.summary.calibratedNeighborhoods}/{data.summary.totalNeighborhoods}
                  </div>
                </div>
                <div className="bg-muted/20 rounded-lg p-2">
                  <div className="text-muted-foreground">Data Quality</div>
                  <div className="font-medium tabular-nums">{data.summary.avgDataQuality}%</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist drill-down */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Readiness Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-3">
          {data.checks.map((check) => (
            <div key={check.id}>
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors text-left"
                onClick={() => setExpanded(expanded === check.id ? null : check.id)}
              >
                <CheckIcon status={check.status} />
                <span className="flex-1 text-xs font-medium text-foreground">{check.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{check.metric}</span>
                <span className="text-muted-foreground">
                  {expanded === check.id
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>
              <AnimatePresence>
                {expanded === check.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-2 ml-7 text-xs text-muted-foreground border-l border-border/40 space-y-1">
                      <p>{check.description}</p>
                      {check.detail && <p className="font-medium text-foreground">{check.detail}</p>}
                      <p className="text-[10px]">Weight: {check.weight}%</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Low-scoring neighborhoods */}
      {data.neighborhoods.length > 0 && (
        <Card className="material-bento border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Neighborhoods — Low Score
              <Badge variant="outline" className="ml-2 text-[10px]">
                {data.neighborhoods.filter(n => n.score < 60).length} at risk
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/20">
              {data.neighborhoods
                .filter(n => n.score < 60)
                .slice(0, 5)
                .map((n) => (
                  <div key={n.code} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                    <span className="font-medium text-foreground w-20 truncate">{n.code}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${n.score >= 60 ? "bg-[hsl(var(--tf-optimized-green))]" : n.score >= 40 ? "bg-[hsl(var(--tf-sacred-gold))]" : "bg-[hsl(var(--tf-warning-red))]"}`}
                        style={{ width: `${n.score}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-muted-foreground w-8 text-right">{n.score}</span>
                    <span className="text-muted-foreground">{n.certRate}% cert</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
