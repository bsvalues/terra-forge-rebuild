// TerraFusion OS — Data Pipeline Ledger
// Surfaces ingest → quality → readiness as a single, visible flow on Home.
// "Ingestion opacity, solved."

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Minus,
  ArrowRight,
  Loader2,
  GitBranch,
} from "lucide-react";
import {
  usePipelineStatus,
  STAGE_LABELS,
  STAGE_DESCRIPTIONS,
  STAGE_ORDER,
  type PipelineStatus,
  type PipelineStageRow,
} from "@/hooks/usePipelineStatus";
import { Badge } from "@/components/ui/badge";

interface DataPipelineLedgerProps {
  onNavigate: (target: string) => void;
}

// ─── Status helpers ───────────────────────────────────────────

function statusIcon(status: PipelineStatus, size = "w-4 h-4") {
  switch (status) {
    case "success":  return <CheckCircle2 className={`${size} text-tf-green`} />;
    case "failed":   return <XCircle       className={`${size} text-destructive`} />;
    case "warning":  return <AlertTriangle className={`${size} text-tf-gold`} />;
    case "running":  return <Loader2       className={`${size} text-tf-cyan animate-spin`} />;
    case "never_run":return <Minus         className={`${size} text-muted-foreground/40`} />;
    default:         return <Minus         className={`${size} text-muted-foreground/40`} />;
  }
}

function statusDot(status: PipelineStatus) {
  const colors: Record<PipelineStatus, string> = {
    success:   "bg-[hsl(var(--tf-optimized-green))]",
    failed:    "bg-destructive",
    warning:   "bg-[hsl(var(--tf-sacred-gold))]",
    running:   "bg-[hsl(var(--tf-transcend-cyan))] animate-pulse",
    never_run: "bg-muted-foreground/20",
  };
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors[status] ?? "bg-muted-foreground/20"}`} />;
}

function overallBadge(overall: string) {
  const map: Record<string, { label: string; cls: string }> = {
    healthy: { label: "Healthy", cls: "bg-[hsl(var(--tf-optimized-green)/0.12)] text-tf-green border-[hsl(var(--tf-optimized-green)/0.3)]" },
    warning: { label: "Warning", cls: "bg-[hsl(var(--tf-sacred-gold)/0.12)] text-tf-gold border-[hsl(var(--tf-sacred-gold)/0.3)]" },
    failed:  { label: "Degraded", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  };
  const style = map[overall] ?? map.warning;
  return (
    <Badge variant="outline" className={`text-[10px] ${style.cls}`}>
      {style.label}
    </Badge>
  );
}

function elapsed(row: PipelineStageRow): string | null {
  if (!row.started_at) return null;
  try {
    return formatDistanceToNow(new Date(row.started_at), { addSuffix: true });
  } catch {
    return null;
  }
}

function duration(row: PipelineStageRow): string | null {
  if (!row.duration_seconds) return null;
  if (row.duration_seconds < 60) return `${row.duration_seconds}s`;
  return `${Math.round(row.duration_seconds / 60)}m`;
}

// ─── Component ────────────────────────────────────────────────

export function DataPipelineLedger({ onNavigate }: DataPipelineLedgerProps) {
  const { data, isLoading, isError } = usePipelineStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="material-bento p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[hsl(var(--tf-transcend-cyan)/0.1)]">
            <GitBranch className="w-4 h-4 text-tf-cyan" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Data Pipeline</h3>
            <p className="text-xs text-muted-foreground">
              {data?.last_success
                ? `Last success ${formatDistanceToNow(new Date(data.last_success), { addSuffix: true })}`
                : "No completed run yet"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data && overallBadge(data.overall)}
          <button
            onClick={() => onNavigate("home:ids")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            IDS <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Stage rail */}
      {isLoading && (
        <div className="flex items-center gap-2 py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading pipeline status…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 py-4 px-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <XCircle className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-xs text-destructive">Pipeline status unavailable</span>
        </div>
      )}

      {data && !isLoading && (
        <div className="space-y-1">
          {STAGE_ORDER.map((stageKey, idx) => {
            const row = data.stages.find(s => s.stage === stageKey) as PipelineStageRow | undefined;
            const status: PipelineStatus = row?.status ?? "never_run";
            const isLast = idx === STAGE_ORDER.length - 1;

            return (
              <div key={stageKey}>
                <div className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-[hsl(var(--tf-surface)/0.4)] transition-colors group">
                  {/* Icon */}
                  <div className="shrink-0">{statusIcon(status)}</div>

                  {/* Stage info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {statusDot(status)}
                      <span className="text-xs font-medium text-foreground">
                        {STAGE_LABELS[stageKey]}
                      </span>
                      {row?.rows_affected != null && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {row.rows_affected.toLocaleString()} rows
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight">
                      {STAGE_DESCRIPTIONS[stageKey]}
                    </p>
                    {row?.error_id && (
                      <p className="text-[10px] text-destructive mt-0.5 font-mono">
                        err:{row.error_id.slice(0, 12)}…
                      </p>
                    )}
                  </div>

                  {/* Timing */}
                  <div className="shrink-0 text-right">
                    {row?.started_at && (
                      <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 inline" />
                        {elapsed(row)}
                      </p>
                    )}
                    {duration(row!) && (
                      <p className="text-[10px] text-muted-foreground/50">{duration(row!)}</p>
                    )}
                    {status === "never_run" && (
                      <p className="text-[10px] text-muted-foreground/30">—</p>
                    )}
                  </div>
                </div>

                {/* Connector line between stages */}
                {!isLast && (
                  <div className="ml-5 w-px h-1.5 bg-border/40" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary strip */}
      {data && data.total_rows > 0 && (
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {data.total_rows.toLocaleString()} total rows processed
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            via pipeline ledger
          </span>
        </div>
      )}
    </motion.div>
  );
}
