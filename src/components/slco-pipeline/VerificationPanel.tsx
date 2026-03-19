// TerraFusion OS — Verification Panel (Phase 68)
// "I checked the gates and they all said 'come in'" — Ralph Wiggum, Gatekeeper
//
// Re-score → Before/After Deltas → Readiness Gate Checklist → Certification Eligibility

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, ShieldX, ArrowLeft, Loader2, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, Minus, BarChart3, Clock, RefreshCw,
  Lock, Unlock, History, Zap, Target, Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useRunVerification,
  useVerificationHistory,
  type VerificationSnapshot,
  type ReadinessGate,
} from "@/hooks/useRemediation";

// ── Quality Score Gauge ─────────────────────────────────────────
function QualityGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? "text-emerald-400" :
    score >= 60 ? "text-amber-400" :
    score >= 40 ? "text-orange-400" : "text-red-400";

  const bgColor =
    score >= 80 ? "bg-emerald-500/10 border-emerald-500/20" :
    score >= 60 ? "bg-amber-500/10 border-amber-500/20" :
    score >= 40 ? "bg-orange-500/10 border-orange-500/20" : "bg-red-500/10 border-red-500/20";

  return (
    <div className={`p-3 rounded-xl border ${bgColor} text-center`}>
      <div className={`text-2xl font-bold font-mono ${color}`}>
        {Math.round(score)}%
      </div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
        {label}
      </div>
      <Progress value={score} className="h-1 mt-2" />
    </div>
  );
}

// ── Lane Score Card ─────────────────────────────────────────────
function LaneScore({
  label,
  score,
  prevScore,
  detail,
  totalParcels,
}: {
  label: string;
  score: number;
  prevScore?: number;
  detail?: Record<string, number>;
  totalParcels: number;
}) {
  const delta = prevScore !== undefined ? score - prevScore : null;
  const DeltaIcon = delta !== null ? (delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus) : null;
  const deltaColor = delta !== null ? (delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-muted-foreground") : "";

  return (
    <div className="p-3 rounded-lg border border-border/30 bg-card/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {delta !== null && DeltaIcon && (
            <span className={`text-[10px] font-mono flex items-center gap-0.5 ${deltaColor}`}>
              <DeltaIcon className="h-3 w-3" />
              {delta > 0 ? "+" : ""}{Math.round(delta)}
            </span>
          )}
          <span className={`text-sm font-bold font-mono ${
            score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400"
          }`}>
            {Math.round(score)}%
          </span>
        </div>
      </div>
      <Progress value={score} className="h-1.5" />

      {detail && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-2">
          {Object.entries(detail).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between text-[9px]">
              <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
              <span className="text-foreground font-mono">
                {val.toLocaleString()}/{totalParcels.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Readiness Gate Row ──────────────────────────────────────────
function GateRow({ gate }: { gate: ReadinessGate }) {
  const passed = gate.passed;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
      passed
        ? "border-emerald-500/20 bg-emerald-500/5"
        : "border-red-500/20 bg-red-500/5"
    }`}>
      {passed ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{gate.label}</span>
          <Badge
            variant="outline"
            className={`text-[8px] px-1 ${
              gate.severity === "critical" ? "text-red-400 border-red-500/20" :
              gate.severity === "high" ? "text-amber-400 border-amber-500/20" :
              "text-muted-foreground border-border"
            }`}
          >
            {gate.severity}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{gate.description}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className={`text-sm font-bold font-mono ${passed ? "text-emerald-400" : "text-red-400"}`}>
          {typeof gate.value === "number" ? Math.round(gate.value) : gate.value}
        </span>
        <div className="text-[9px] text-muted-foreground">/ {gate.threshold}</div>
      </div>
    </div>
  );
}

// ── Snapshot History Row ────────────────────────────────────────
function SnapshotRow({ snapshot }: { snapshot: VerificationSnapshot }) {
  const score = snapshot.quality_score || 0;
  const passedAll = snapshot.passed_all_gates;
  const gates = (snapshot.gate_results as any)?.gates as ReadinessGate[] || [];
  const passedCount = gates.filter((g) => g.passed).length;

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-card/50 border border-border/20">
      {passedAll ? (
        <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
      ) : (
        <ShieldX className="h-4 w-4 text-amber-400 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold font-mono ${
            score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400"
          }`}>
            {Math.round(score)}%
          </span>
          <Badge variant="outline" className="text-[8px] px-1">
            {snapshot.snapshot_type.replace(/_/g, " ")}
          </Badge>
          <span className="text-[9px] text-muted-foreground">
            {passedCount}/{gates.length} gates
          </span>
        </div>
      </div>
      <span className="text-[9px] text-muted-foreground flex-shrink-0">
        {new Date(snapshot.created_at).toLocaleString()}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PANEL
// ══════════════════════════════════════════════════════════════════

interface VerificationPanelProps {
  onBack?: () => void;
}

export function VerificationPanel({ onBack }: VerificationPanelProps) {
  const countyId = "00000000-0000-0000-0000-000000000002";

  const runVerification = useRunVerification();
  const { data: history, isLoading: historyLoading } = useVerificationHistory(countyId);

  // Latest verification result (from mutation or history)
  const latestResult = runVerification.data || null;
  const latestFromHistory = history?.[0] || null;

  // Use mutation result if available, else latest from history
  const activeScores = latestResult?.scores || (latestFromHistory?.metrics as any) || null;
  const activeGates = latestResult?.gates?.gates as ReadinessGate[] ||
    (latestFromHistory?.gate_results as any)?.gates as ReadinessGate[] || [];
  const passedAll = latestResult?.passed_all ?? latestFromHistory?.passed_all_gates ?? null;
  const qualityScore = activeScores?.overall_score || 0;
  const totalParcels = activeScores?.total_parcels || 0;

  // Previous snapshot for delta comparison
  const prevSnapshot = history && history.length > 1 ? history[1] : null;
  const prevScores = prevSnapshot?.metrics as any || null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Verification & Readiness</h2>
              <p className="text-xs text-muted-foreground">
                Re-score quality • Evaluate gates • Certify when ready
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => runVerification.mutate({ countyId })}
            disabled={runVerification.isPending}
            className="gap-2"
          >
            {runVerification.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {runVerification.isPending ? "Verifying..." : "Run Verification"}
          </Button>
        </div>
      </motion.div>

      {/* No data state */}
      {!activeScores && !historyLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-4">
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 inline-block">
            <Target className="h-12 w-12 text-muted-foreground/50" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">No verification run yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Run verification to score your data quality across all lanes
              and evaluate readiness gates for certification.
            </p>
          </div>
          <Button onClick={() => runVerification.mutate({ countyId })} disabled={runVerification.isPending} className="gap-2">
            <Zap className="h-4 w-4" /> Run First Verification
          </Button>
        </motion.div>
      )}

      {historyLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Results */}
      {activeScores && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Certification Status Banner */}
          <div className={`p-4 rounded-xl border flex items-center gap-4 ${
            passedAll
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/30 bg-amber-500/5"
          }`}>
            {passedAll ? (
              <>
                <Award className="h-8 w-8 text-emerald-400 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-400">CERTIFICATION ELIGIBLE</h3>
                  <p className="text-xs text-muted-foreground">
                    All readiness gates passed. Data quality meets certification thresholds.
                  </p>
                </div>
                <Unlock className="h-5 w-5 text-emerald-400 ml-auto flex-shrink-0" />
              </>
            ) : (
              <>
                <ShieldX className="h-8 w-8 text-amber-400 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-amber-400">GATES OPEN — NOT YET READY</h3>
                  <p className="text-xs text-muted-foreground">
                    {activeGates.filter((g) => !g.passed).length} gate{activeGates.filter((g) => !g.passed).length !== 1 ? "s" : ""} still
                    need attention before certification.
                  </p>
                </div>
                <Lock className="h-5 w-5 text-amber-400 ml-auto flex-shrink-0" />
              </>
            )}
          </div>

          {/* Score overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QualityGauge score={qualityScore} label="Overall Quality" />
            <QualityGauge score={activeScores.spatial_score || 0} label="Spatial" />
            <QualityGauge score={activeScores.address_score || 0} label="Address" />
            <QualityGauge score={activeScores.value_score || 0} label="Values" />
          </div>

          {/* Lane Breakdown */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Lane Quality Breakdown
                {prevScores && (
                  <Badge variant="outline" className="text-[9px] ml-2">vs. previous</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LaneScore
                  label="Spatial Healing"
                  score={activeScores.spatial_score || 0}
                  prevScore={prevScores?.spatial_score}
                  detail={activeScores.spatial_detail}
                  totalParcels={totalParcels}
                />
                <LaneScore
                  label="Address Normalization"
                  score={activeScores.address_score || 0}
                  prevScore={prevScores?.address_score}
                  detail={activeScores.address_detail}
                  totalParcels={totalParcels}
                />
                <LaneScore
                  label="Characteristics"
                  score={activeScores.characteristic_score || 0}
                  prevScore={prevScores?.characteristic_score}
                  detail={activeScores.characteristic_detail}
                  totalParcels={totalParcels}
                />
                <LaneScore
                  label="Value Integrity"
                  score={activeScores.value_score || 0}
                  prevScore={prevScores?.value_score}
                  detail={activeScores.value_detail}
                  totalParcels={totalParcels}
                />
                <LaneScore
                  label="Duplicate Detection"
                  score={activeScores.duplicate_score || 0}
                  prevScore={prevScores?.duplicate_score}
                  detail={activeScores.duplicate_detail}
                  totalParcels={totalParcels}
                />
                <LaneScore
                  label="Neighborhoods"
                  score={activeScores.neighborhood_score || 0}
                  prevScore={prevScores?.neighborhood_score}
                  detail={activeScores.neighborhood_detail}
                  totalParcels={totalParcels}
                />
              </div>
            </CardContent>
          </Card>

          {/* Readiness Gates */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {passedAll ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ShieldX className="h-4 w-4 text-amber-400" />
                )}
                Readiness Gates
                <Badge variant="outline" className="text-[9px] ml-1">
                  {activeGates.filter((g) => g.passed).length}/{activeGates.length} passed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeGates.map((gate, i) => (
                <GateRow key={gate.gate || i} gate={gate} />
              ))}
            </CardContent>
          </Card>

          {/* Verification History */}
          {history && history.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Verification History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1.5">
                    {history.map((snap) => (
                      <SnapshotRow key={snap.id} snapshot={snap} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}
