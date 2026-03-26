// TerraFusion OS — Phase 73: Revaluation Progress Tracker with Certification Integration
// "I certified a neighborhood and it certified me back. We're friends now." — Ralph Wiggum

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Activity, BarChart3, CheckCircle2, Clock, Layers,
  MapPin, Shield, TrendingUp, Target,
  Building2, Zap, Gauge, Stamp, Loader2,
  AlertTriangle, Award,
} from "lucide-react";
import {
  useRevaluationCycles,
  type
} from "@/hooks/useRevaluationCycles";
import {
  useRevaluationProgress,
  useCompleteRevaluationCycle,
  type NeighborhoodProgress,
} from "@/hooks/useRevaluationProgress";
import { certifyNeighborhood } from "@/services/suites/daisService";
import { invalidateCertification } from "@/lib/queryInvalidation";
import { toast } from "sonner";

// ── Phase Badge ────────────────────────────────────────────────────
const PHASE_CONFIG = {
  pending: { label: "Pending", color: "text-muted-foreground", bg: "bg-muted/20", order: 3 },
  calibrated: { label: "Calibrated", color: "text-amber-400", bg: "bg-amber-500/10", order: 2 },
  valued: { label: "Valued", color: "text-primary", bg: "bg-primary/10", order: 1 },
  certified: { label: "Certified", color: "text-emerald-400", bg: "bg-emerald-500/10", order: 0 },
} as const;

function PhaseBadge({ phase }: { phase: NeighborhoodProgress["phase"] }) {
  const config = PHASE_CONFIG[phase];
  return (
    <Badge variant="outline" className={`text-[9px] ${config.color}`}>
      {config.label}
    </Badge>
  );
}

// ── Neighborhood Progress Row with Certification Action ────────────
function NeighborhoodRow({
  nbhd,
  onCertify,
  isCertifying,
}: {
  nbhd: NeighborhoodProgress;
  onCertify: (code: string) => void;
  isCertifying: boolean;
}) {
  const assessedPct = nbhd.parcel_count > 0
    ? Math.round((nbhd.assessed_count / nbhd.parcel_count) * 100) : 0;
  const certifiedPct = nbhd.parcel_count > 0
    ? Math.round((nbhd.certified_count / nbhd.parcel_count) * 100) : 0;
  const canCertify = nbhd.phase !== "certified" && nbhd.phase !== "pending";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-3 rounded-lg border border-border/30 bg-card/60 hover:bg-card/80 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <span className="text-xs font-semibold">{nbhd.hood_cd}</span>
          <PhaseBadge phase={nbhd.phase} />
        </div>
        <div className="flex items-center gap-2">
          {nbhd.r_squared != null && (
            <span className="text-[10px] text-muted-foreground font-mono">
              R² {nbhd.r_squared.toFixed(3)}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground font-mono">
            {nbhd.parcel_count.toLocaleString()} parcels
          </span>
          {canCertify && (
            <Button
              variant="outline"
              size="sm"
              className="text-[9px] h-6 gap-1 px-2"
              disabled={isCertifying}
              onClick={() => onCertify(nbhd.hood_cd)}
            >
              {isCertifying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Stamp className="h-3 w-3" />
              )}
              Certify
            </Button>
          )}
          {nbhd.phase === "certified" && (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-muted-foreground">Assessed</span>
            <span className="text-[9px] font-mono font-semibold">{assessedPct}%</span>
          </div>
          <Progress value={assessedPct} className="h-1.5" />
          <span className="text-[9px] text-muted-foreground mt-0.5 block">
            {nbhd.assessed_count.toLocaleString()} / {nbhd.parcel_count.toLocaleString()}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-muted-foreground">Certified</span>
            <span className="text-[9px] font-mono font-semibold">{certifiedPct}%</span>
          </div>
          <Progress value={certifiedPct} className="h-1.5" />
          <span className="text-[9px] text-muted-foreground mt-0.5 block">
            {nbhd.certified_count.toLocaleString()} / {nbhd.parcel_count.toLocaleString()}
          </span>
        </div>
      </div>

      {nbhd.avg_value != null && nbhd.avg_value > 0 && (
        <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Avg value: ${nbhd.avg_value.toLocaleString()}
        </div>
      )}
    </motion.div>
  );
}

// ── Pipeline Stage Card ────────────────────────────────────────────
function PipelineStage({
  label, icon: Icon, pct, count, total, active,
}: {
  label: string; icon: React.ElementType; pct: number;
  count: number; total: number; active: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl border text-center transition-colors ${
      active ? "bg-primary/5 border-primary/30 shadow-sm shadow-primary/5"
        : pct >= 100 ? "bg-emerald-500/5 border-emerald-500/20"
        : "bg-card/60 border-border/30"
    }`}>
      <Icon className={`h-5 w-5 mx-auto mb-2 ${
        pct >= 100 ? "text-emerald-400" : active ? "text-primary" : "text-muted-foreground"
      }`} />
      <div className="text-lg font-bold font-mono">{pct}%</div>
      <Progress value={pct} className="h-1 my-1.5" />
      <span className="text-[9px] text-muted-foreground block">
        {count.toLocaleString()} / {total.toLocaleString()}
      </span>
      <span className="text-[10px] font-semibold mt-0.5 block">{label}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
interface RevaluationProgressTrackerProps {
  onNavigate?: (target: string) => void;
}

export function RevaluationProgressTracker({ onNavigate }: RevaluationProgressTrackerProps) {
  const { data: cycles, isLoading: cyclesLoading } = useRevaluationCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [certifyingNbhd, setCertifyingNbhd] = useState<string | null>(null);
  const [showCompleteCycle, setShowCompleteCycle] = useState(false);
  const queryClient = useQueryClient();

  const activeCycleId = selectedCycleId
    || cycles?.find(c => c.status === "launched")?.id
    || cycles?.[0]?.id
    || null;

  const { data: progress, isLoading: progressLoading } = useRevaluationProgress(activeCycleId);
  const completeCycleMutation = useCompleteRevaluationCycle();

  // Neighborhood certification mutation via daisService
  const nbhdCertifyMutation = useMutation({
    mutationFn: (code: string) => certifyNeighborhood(code),
    onMutate: (code) => setCertifyingNbhd(code),
    onSuccess: (result, code) => {
      toast.success(`Neighborhood ${code} certified`, {
        description: `${result.certified} updated, ${result.created} created (${result.total} total)`,
      });
      invalidateCertification(queryClient);
      queryClient.invalidateQueries({ queryKey: ["revaluation-progress"] });
      setCertifyingNbhd(null);
    },
    onError: (err: Error) => {
      toast.error("Certification failed", { description: err.message });
      setCertifyingNbhd(null);
    },
  });

  const isLoading = cyclesLoading || progressLoading;

  const sortedNbhds = useMemo(() => {
    if (!progress?.neighborhoods) return [];
    return [...progress.neighborhoods].sort(
      (a, b) => PHASE_CONFIG[a.phase].order - PHASE_CONFIG[b.phase].order
    );
  }, [progress]);

  const phaseCounts = useMemo(() => {
    const counts = { pending: 0, calibrated: 0, valued: 0, certified: 0 };
    for (const n of sortedNbhds) counts[n.phase]++;
    return counts;
  }, [sortedNbhds]);

  const activeCycle = cycles?.find(c => c.id === activeCycleId);
  const isCycleCompleted = activeCycle?.status === "completed";
  const canCompleteCycle = progress && progress.certification_pct > 0 && !isCycleCompleted;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cycles || cycles.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-8 text-center">
            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-1">No Revaluation Cycles</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Launch a revaluation cycle to begin tracking progress.
            </p>
            <Button onClick={() => onNavigate?.("launch-reval")} className="gap-2">
              <Zap className="h-4 w-4" /> Launch Revaluation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <Gauge className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {progress?.cycle_name || "Revaluation Progress"}
            </h1>
            <p className="text-sm text-muted-foreground">
              TY {progress?.tax_year || "—"} • {progress?.neighborhoods?.length || 0} neighborhoods
              {progress?.launched_at && (
                <> • Launched {new Date(progress.launched_at).toLocaleDateString()}</>
              )}
              {isCycleCompleted && (
                <Badge variant="outline" className="ml-2 text-[9px] text-emerald-400">
                  COMPLETED
                </Badge>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cycle Selector */}
          {cycles.length > 1 && (
            <div className="flex gap-1">
              {cycles.slice(0, 3).map((c) => (
                <Button
                  key={c.id}
                  variant={c.id === activeCycleId ? "default" : "outline"}
                  size="sm"
                  className="text-[10px] h-7"
                  onClick={() => setSelectedCycleId(c.id)}
                >
                  TY {c.tax_year}
                  {c.status === "completed" && (
                    <CheckCircle2 className="h-3 w-3 ml-1 text-emerald-400" />
                  )}
                </Button>
              ))}
            </div>
          )}

          {/* Complete Cycle Button */}
          {canCompleteCycle && (
            <Button
              size="sm"
              className="gap-1 text-xs"
              variant="outline"
              onClick={() => setShowCompleteCycle(true)}
            >
              <Award className="h-3.5 w-3.5" />
              Complete Cycle
            </Button>
          )}
        </div>
      </motion.div>

      {/* Pipeline Overview */}
      {progress && (
        <div className="grid grid-cols-3 gap-4">
          <PipelineStage
            label="Calibration"
            icon={BarChart3}
            pct={progress.calibration_pct}
            count={phaseCounts.calibrated + phaseCounts.valued + phaseCounts.certified}
            total={progress.neighborhoods?.length || 0}
            active={progress.calibration_pct < 100}
          />
          <PipelineStage
            label="Assessment"
            icon={Building2}
            pct={progress.assessment_pct}
            count={progress.total_assessed}
            total={progress.total_parcels}
            active={progress.calibration_pct >= 100 && progress.assessment_pct < 100}
          />
          <PipelineStage
            label="Certification"
            icon={Shield}
            pct={progress.certification_pct}
            count={progress.total_certified}
            total={progress.total_parcels}
            active={progress.assessment_pct >= 50 && progress.certification_pct < 100}
          />
        </div>
      )}

      {/* Phase Summary Chips */}
      <div className="flex items-center gap-3 flex-wrap">
        {(Object.entries(phaseCounts) as [NeighborhoodProgress["phase"], number][])
          .filter(([, count]) => count > 0)
          .map(([phase, count]) => {
            const config = PHASE_CONFIG[phase];
            return (
              <div
                key={phase}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${config.bg} ${config.color}`}
              >
                {phase === "certified" && <CheckCircle2 className="h-3 w-3" />}
                {phase === "valued" && <TrendingUp className="h-3 w-3" />}
                {phase === "calibrated" && <BarChart3 className="h-3 w-3" />}
                {phase === "pending" && <Clock className="h-3 w-3" />}
                {count} {config.label}
              </div>
            );
          })}
        <div className="ml-auto text-[10px] text-muted-foreground font-mono">
          {progress?.total_parcels?.toLocaleString() || 0} total parcels
        </div>
      </div>

      <Separator className="opacity-30" />

      {/* Neighborhood Detail Grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Per-Neighborhood Progress
          {!isCycleCompleted && (
            <span className="text-[10px] text-muted-foreground font-normal ml-2">
              Click "Certify" on calibrated/valued neighborhoods to advance them
            </span>
          )}
        </h2>
        <div className="space-y-2">
          {sortedNbhds.map((nbhd, i) => (
            <motion.div
              key={nbhd.hood_cd}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <NeighborhoodRow
                nbhd={nbhd}
                onCertify={(code) => nbhdCertifyMutation.mutate(code)}
                isCertifying={certifyingNbhd === nbhd.hood_cd}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Quick Actions:</span>
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"
              onClick={() => onNavigate?.("launch-reval")}>
              <Zap className="h-3 w-3" /> New Cycle
            </Button>
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"
              onClick={() => onNavigate?.("neighborhoods")}>
              <MapPin className="h-3 w-3" /> Neighborhoods
            </Button>
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"
              onClick={() => onNavigate?.("readiness")}>
              <Shield className="h-3 w-3" /> Roll Readiness
            </Button>
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"
              onClick={() => onNavigate?.("data-doctor")}>
              <Activity className="h-3 w-3" /> Data Doctor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Complete Cycle Confirmation Dialog */}
      <AlertDialog open={showCompleteCycle} onOpenChange={setShowCompleteCycle}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Complete Revaluation Cycle?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize the{" "}
              <strong>{progress?.cycle_name}</strong> cycle for TY{" "}
              {progress?.tax_year}. The cycle will be marked as completed with
              final certification statistics recorded.
              {progress && progress.certification_pct < 100 && (
                <span className="block mt-2 text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                  Warning: Only {progress.certification_pct}% of parcels are certified.
                  You can still complete the cycle, but full certification is recommended.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (activeCycleId) {
                  completeCycleMutation.mutate(activeCycleId);
                }
                setShowCompleteCycle(false);
              }}
            >
              {completeCycleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Award className="h-4 w-4 mr-1" />
              )}
              Complete Cycle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Completion Success Banner */}
      <AnimatePresence>
        {isCycleCompleted && activeCycle && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/20">
                  <Award className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-emerald-400">
                    Revaluation Cycle Complete
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {activeCycle.cycle_name} • TY {activeCycle.tax_year}
                    {activeCycle.completed_at && (
                      <> • Completed {new Date(activeCycle.completed_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-sm font-bold font-mono">{activeCycle.total_parcels.toLocaleString()}</div>
                    <span className="text-[9px] text-muted-foreground">Total Parcels</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono">{activeCycle.parcels_calibrated}</div>
                    <span className="text-[9px] text-muted-foreground">Certified</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
