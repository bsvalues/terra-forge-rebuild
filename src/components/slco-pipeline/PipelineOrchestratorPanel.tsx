// TerraFusion OS — SLCO Pipeline Orchestrator Panel
// Live controls for running the 7-stage canonical pipeline end-to-end.

import { useState } from "react";
import {
  useSLCOPipelineStatus,
  useRunStage,
  useRunAllStages,
  useResetPipeline,
  STAGES,
  type SLCOStage,
} from "@/hooks/useSLCOPipeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Play, RotateCcw, Trash2, CheckCircle2,
  AlertTriangle, Clock, Loader2, Database,
  Layers, Shield, MapPin, Building2, FileText,
  Package, ArrowRight, Rocket, Table2,
} from "lucide-react";

const STAGE_META: Record<string, { icon: any; label: string; desc: string }> = {
  raw_ingest: { icon: Database, label: "Raw Ingest", desc: "GIS features → parcel_master" },
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

export function PipelineOrchestratorPanel() {
  const { data: status, isLoading } = useSLCOPipelineStatus();
  const runStage = useRunStage();
  const runAll = useRunAllStages();
  const reset = useResetPipeline();
  const [runningStage, setRunningStage] = useState<string | null>(null);

  const handleRunStage = async (stage: SLCOStage) => {
    setRunningStage(stage);
    try {
      await runStage.mutateAsync(stage);
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

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Pipeline Orchestrator — 7-Stage Canonical Engine
            </CardTitle>
            <div className="flex gap-2">
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
                Run All Stages
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 text-xs mb-4">
            <div className="p-2 rounded bg-muted/20 text-center">
              <div className="text-lg font-bold font-mono">{completedStages}/{STAGES.length}</div>
              <span className="text-[10px] text-muted-foreground">Stages Complete</span>
            </div>
            <div className="p-2 rounded bg-muted/20 text-center">
              <div className="text-lg font-bold font-mono">{totalRecords.toLocaleString()}</div>
              <span className="text-[10px] text-muted-foreground">Canonical Records</span>
            </div>
            <div className="p-2 rounded bg-muted/20 text-center">
              <div className="text-lg font-bold font-mono">{status.runs.length}</div>
              <span className="text-[10px] text-muted-foreground">Pipeline Runs</span>
            </div>
          </div>

          {/* Stage cards */}
          <div className="space-y-2">
            {STAGES.map((stage, i) => {
              const meta = STAGE_META[stage];
              const stageData = status.stages[stage] || { status: "pending", rows_in: 0, rows_out: 0 };
              const sc = STATUS_CONFIG[stageData.status] || STATUS_CONFIG.pending;
              const StatusIcon = sc.icon;
              const StageIcon = meta.icon;
              const isRunning = runningStage === stage;

              return (
                <div key={stage}>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border/20 hover:bg-muted/20 transition-colors">
                    {/* Stage number */}
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                      {i + 1}
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
                      </div>
                      <p className="text-[10px] text-muted-foreground">{meta.desc}</p>
                    </div>

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
                    </div>

                    {/* Run button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 flex-shrink-0"
                      onClick={() => handleRunStage(stage)}
                      disabled={!!runningStage}
                    >
                      {isRunning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : stageData.status === "complete" ? (
                        <RotateCcw className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>

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
