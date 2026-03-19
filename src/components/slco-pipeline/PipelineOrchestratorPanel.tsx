// TerraFusion OS — SLCO Pipeline Orchestrator Panel v2
// Phase 61: Stage-gate enforcement, auto-retry indicators, run history timeline.

import { useState } from "react";
import {
  useSLCOPipelineStatus,
  useRunStage,
  useRunAllStages,
  useResetPipeline,
  STAGES,
  type StageStatus,
  type GateResult,
  type RunHistoryEntry,
  type SLCOStage,
} from "@/hooks/useSLCOPipeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Play, RotateCcw, Trash2, CheckCircle2,
  AlertTriangle, Clock, Loader2, Database,
  Layers, Shield, MapPin, Building2, FileText,
  Package, ArrowRight, Rocket, Table2,
  Lock, Unlock, History, Zap, Timer,
  ShieldAlert, ShieldCheck,
} from "lucide-react";

const STAGE_META: Record<string, { icon: any; label: string; desc: string }> = {
  raw_ingest: { icon: Database, label: "Raw Ingest", desc: "GIS features → parcel_master + geometry + assessments" },
  standardize: { icon: Layers, label: "Standardize", desc: "Normalize addresses, names, IDs" },
  identity_resolve: { icon: Shield, label: "Identity Resolve", desc: "Canonical key + source registry" },
  spatial_join: { icon: MapPin, label: "Spatial Join", desc: "Link to tax districts & model areas" },
  commercial_enrich: { icon: Building2, label: "Commercial Enrich", desc: "Flag commercial parcels" },
  recorder_enrich: { icon: FileText, label: "Recorder Enrich", desc: "Ownership & doc metadata" },
  publish_marts: { icon: Package, label: "Publish Marts", desc: "Workbench, Forge, Dossier views" },
};

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  pending: { color: "bg-muted text-muted-foreground", icon: Clock },
  running: { color: "bg-primary/20 text-primary", icon: Loader2 },
  complete: { color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2 },
  failed: { color: "bg-destructive/20 text-destructive", icon: AlertTriangle },
};

// ── Gate Badge ─────────────────────────────────────────────────────
function GateBadge({ gate }: { gate: GateResult | undefined }) {
  if (!gate) return null;

  const allPassed = gate.passed;
  const failedChecks = gate.checks.filter((c) => !c.passed);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-shrink-0">
            {allPassed ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[300px]">
          <div className="space-y-1">
            <p className="text-xs font-semibold">
              {allPassed ? "Gate: All prerequisites met" : `Gate: ${failedChecks.length} check(s) failed`}
            </p>
            {gate.checks.map((c, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px]">
                {c.passed ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                )}
                <span>{c.detail}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Run History Timeline ───────────────────────────────────────────
function RunHistoryTimeline({ history }: { history: RunHistoryEntry[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="p-4 text-center">
        <History className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No pipeline runs yet.</p>
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto space-y-1.5 p-3">
      {history.map((entry) => {
        const meta = STAGE_META[entry.stage];
        const sc = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
        const StatusIcon = sc.icon;
        const duration = entry.duration_ms
          ? entry.duration_ms < 1000
            ? `${entry.duration_ms}ms`
            : `${(entry.duration_ms / 1000).toFixed(1)}s`
          : null;
        const retryCount = entry.metadata?.retryCount || 0;

        return (
          <div
            key={entry.id}
            className="flex items-center gap-2 p-2 rounded-md bg-muted/10 border border-border/10"
          >
            <Badge className={`${sc.color} text-[8px] gap-0.5 px-1.5`}>
              <StatusIcon className={`h-2.5 w-2.5 ${entry.status === "running" ? "animate-spin" : ""}`} />
              {entry.status}
            </Badge>
            <span className="text-[10px] font-medium flex-1 truncate">
              {meta?.label || entry.stage}
            </span>
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground flex-shrink-0">
              {retryCount > 0 && (
                <span className="flex items-center gap-0.5 text-amber-400">
                  <Zap className="h-2.5 w-2.5" />
                  {retryCount}
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-0.5 font-mono">
                  <Timer className="h-2.5 w-2.5" />
                  {duration}
                </span>
              )}
              <span className="font-mono">
                {entry.rows_in}→{entry.rows_out}
              </span>
              {entry.started_at && (
                <span className="font-mono">
                  {new Date(entry.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────
export function PipelineOrchestratorPanel() {
  const { data: status, isLoading } = useSLCOPipelineStatus();
  const runStage = useRunStage();
  const runAll = useRunAllStages();
  const reset = useResetPipeline();
  const [runningStage, setRunningStage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleRunStage = async (stage: SLCOStage, skipGate = false) => {
    setRunningStage(stage);
    try {
      await runStage.mutateAsync({ stage, skipGateCheck: skipGate });
    } finally {
      setRunningStage(null);
    }
  };

  const handleRunAll = async () => {
    setRunningStage("all");
    try {
      await runAll.mutateAsync();
    } finally {
      setRunningStage(null);
    }
  };

  if (isLoading || !status) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const completedStages = STAGES.filter(
    (s) => status.stages[s]?.status === "complete"
  ).length;

  const totalRecords = Object.values(status.tableCounts).reduce((a, b) => a + b, 0);
  const gatesReady = Object.values(status.gates || {}).filter((g) => g.passed).length;

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Pipeline Orchestrator — Stage-Gated Engine
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowHistory(!showHistory)}
                className="text-[10px]"
              >
                <History className="h-3 w-3 mr-1" />
                {showHistory ? "Hide" : "History"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => reset.mutate()}
                disabled={reset.isPending || !!runningStage}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleRunAll}
                disabled={!!runningStage}
              >
                {runningStage === "all" ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-1" />
                )}
                Run All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3 text-xs mb-4">
            <div className="p-2 rounded bg-muted/20 text-center">
              <div className="text-lg font-bold font-mono">{completedStages}/{STAGES.length}</div>
              <span className="text-[10px] text-muted-foreground">Complete</span>
            </div>
            <div className="p-2 rounded bg-muted/20 text-center">
              <div className="text-lg font-bold font-mono">{gatesReady}/{STAGES.length}</div>
              <span className="text-[10px] text-muted-foreground">Gates Ready</span>
            </div>
            <div className="p-2 rounded bg-muted/20 text-center">
              <div className="text-lg font-bold font-mono">{totalRecords.toLocaleString()}</div>
              <span className="text-[10px] text-muted-foreground">Records</span>
            </div>
            <div className="p-2 rounded bg-muted/20 text-center">
              <div className="text-lg font-bold font-mono">{status.history?.length || 0}</div>
              <span className="text-[10px] text-muted-foreground">Runs</span>
            </div>
          </div>

          {/* Stage cards */}
          <div className="space-y-2">
            {STAGES.map((stage, i) => {
              const meta = STAGE_META[stage];
              const stageData: StageStatus = status.stages[stage] || {
                stage, status: "pending", rows_in: 0, rows_out: 0, rows_rejected: 0,
              };
              const gate = status.gates?.[stage];
              const sc = STATUS_CONFIG[stageData.status] || STATUS_CONFIG.pending;
              const StatusIcon = sc.icon;
              const StageIcon = meta.icon;
              const isRunning = runningStage === stage;
              const gateBlocked = gate && !gate.passed;
              const retryCount = stageData.metadata?.retryCount || 0;
              const qualityWarning = stageData.metadata?.qualityWarning;

              return (
                <div key={stage}>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    gateBlocked && stageData.status === "pending"
                      ? "bg-muted/5 border-amber-500/20"
                      : "bg-muted/10 border-border/20 hover:bg-muted/20"
                  }`}>
                    {/* Stage number */}
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${
                      stageData.status === "complete"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {stageData.status === "complete" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        i + 1
                      )}
                    </div>

                    {/* Icon */}
                    <div className="p-1.5 rounded bg-primary/10 flex-shrink-0">
                      <StageIcon className="h-4 w-4 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{meta.label}</span>
                        <Badge className={`${sc.color} text-[9px] gap-1`}>
                          <StatusIcon className={`h-2.5 w-2.5 ${stageData.status === "running" || isRunning ? "animate-spin" : ""}`} />
                          {stageData.status}
                        </Badge>
                        {retryCount > 0 && (
                          <Badge variant="outline" className="text-[8px] gap-0.5 text-amber-400 border-amber-500/30">
                            <Zap className="h-2 w-2" />
                            {retryCount} retries
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{meta.desc}</p>
                    </div>

                    {/* Gate indicator */}
                    <GateBadge gate={gate} />

                    {/* Metrics */}
                    <div className="flex gap-4 text-[10px] text-muted-foreground flex-shrink-0">
                      <div className="text-center">
                        <div className="font-mono font-medium text-foreground">{stageData.rows_in}</div>
                        <span>in</span>
                      </div>
                      <div className="text-center">
                        <div className="font-mono font-medium text-foreground">{stageData.rows_out}</div>
                        <span>out</span>
                      </div>
                      {stageData.rows_rejected > 0 && (
                        <div className="text-center">
                          <div className="font-mono font-medium text-destructive">{stageData.rows_rejected}</div>
                          <span>rej</span>
                        </div>
                      )}
                    </div>

                    {/* Run button */}
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleRunStage(stage)}
                        disabled={!!runningStage}
                        title={gateBlocked ? "Gate blocked — click to attempt (will enforce)" : "Run stage"}
                      >
                        {isRunning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : gateBlocked && stageData.status === "pending" ? (
                          <Lock className="h-3.5 w-3.5 text-amber-400" />
                        ) : stageData.status === "complete" ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {gateBlocked && stageData.status === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleRunStage(stage, true)}
                          disabled={!!runningStage}
                          title="Force run (skip gate check)"
                        >
                          <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Quality warning */}
                  {qualityWarning && (
                    <div className="ml-9 mt-1 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[10px] text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        {qualityWarning}
                      </p>
                    </div>
                  )}

                  {/* Error display */}
                  {stageData.error_message && (
                    <div className="ml-9 mt-1 p-2 rounded bg-destructive/10 border border-destructive/20">
                      <p className="text-[10px] text-destructive">{stageData.error_message}</p>
                    </div>
                  )}

                  {/* Connector arrow */}
                  {i < STAGES.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <ArrowRight className="h-3 w-3 text-muted-foreground/30 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Run History Timeline */}
      {showHistory && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Run History
            </CardTitle>
          </CardHeader>
          <RunHistoryTimeline history={status.history || []} />
        </Card>
      )}

      {/* Table Counts */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Table2 className="h-4 w-4 text-primary" />
            Canonical Table Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(status.tableCounts).map(([table, count]) => (
              <div
                key={table}
                className={`p-2 rounded-md border text-center ${
                  count > 0
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border/20 bg-muted/20"
                }`}
              >
                <div className="font-mono text-sm font-bold">{count.toLocaleString()}</div>
                <span className="text-[9px] text-muted-foreground font-mono">
                  {table.replace("slco_", "").replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
