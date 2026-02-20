// TerraFusion OS — Data Status Ribbon v2
// Beginner-first: Green/Yellow/Red + last-change line + Confidence level
// "Is the data right? I can see exactly what changed and how fresh it is."

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { usePipelineStatus } from "@/hooks/usePipelineStatus";

export type HealthState = "green" | "yellow" | "red";
export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface RibbonHealth {
  state: HealthState;
  headline: string;
  subline: string;
  lastUpdated: string | null;
  lastChangeLabel: string | null;    // "What changed last" — one plain line
  confidence: ConfidenceLevel;       // High / Medium / Low
  confidenceReason: string;          // Short explanation of confidence
}

// ─── Scoring helpers ──────────────────────────────────────────

function deriveConfidence(
  quality: number,
  pipelineOk: boolean,
  hasFailedIngest: boolean
): { level: ConfidenceLevel; reason: string } {
  if (hasFailedIngest || !pipelineOk) {
    return { level: "Low", reason: "An import failed — some data may be incomplete" };
  }
  if (quality >= 85 && pipelineOk) {
    return { level: "High", reason: "All sources current, quality checks passing" };
  }
  if (quality >= 65) {
    return { level: "Medium", reason: "Most data is good, some gaps need attention" };
  }
  return { level: "Low", reason: "Significant data gaps detected — review recommended" };
}

function deriveLastChange(
  vitals: ReturnType<typeof useCountyVitals>["data"]
): string | null {
  if (!vitals?.ingest.recentJobs.length) return null;
  const latest = vitals.ingest.recentJobs[0];
  const rows = latest.rows_imported ?? latest.row_count ?? 0;
  const fileName = latest.file_name.replace(/\.[^.]+$/, ""); // strip extension
  const timeLabel = latest.created_at
    ? format(new Date(latest.created_at), "h:mm a")
    : null;
  const rowsLabel = rows > 0 ? ` updated ${rows.toLocaleString()} records` : "";
  const timeStr = timeLabel ? ` (${timeLabel})` : "";
  const statusStr = latest.status === "failed" ? " — failed" : "";
  return `${fileName}${rowsLabel}${timeStr}${statusStr}`;
}

/** Derive a plain-English ribbon state from vitals + pipeline data */
export function deriveRibbonHealth(
  vitals: ReturnType<typeof useCountyVitals>["data"],
  pipeline: ReturnType<typeof usePipelineStatus>["data"]
): RibbonHealth {
  const lastUpdated = vitals?.fetchedAt ?? null;
  const quality = vitals?.quality.overall ?? 0;
  const lastChangeLabel = deriveLastChange(vitals);

  const hasPipelineFailure = pipeline?.overall === "failed";
  const hasFailedIngest = vitals?.ingest.recentJobs.some(j => j.status === "failed") ?? false;
  const hasPipelineWarning = pipeline?.overall === "warning";
  const pipelineOk = !hasPipelineFailure && !hasPipelineWarning;

  const { level: confidence, reason: confidenceReason } = deriveConfidence(
    quality,
    pipelineOk,
    hasFailedIngest
  );

  // RED: pipeline failed or recent ingest failed
  if (hasPipelineFailure || hasFailedIngest) {
    const failedJob = vitals?.ingest.recentJobs.find(j => j.status === "failed");
    const errName = failedJob?.file_name ?? "Latest import";
    return {
      state: "red",
      headline: "County needs attention",
      subline: `${errName} couldn't be fully loaded — review required`,
      lastUpdated,
      lastChangeLabel,
      confidence,
      confidenceReason,
    };
  }

  // YELLOW: quality gaps or stale pipeline
  const missingCoords = vitals ? vitals.parcels.total - vitals.parcels.withCoords : 0;
  if (quality < 80 || hasPipelineWarning) {
    const reason = missingCoords > 0
      ? `Missing coordinates (${missingCoords.toLocaleString()} parcels)`
      : quality < 80
      ? `Data quality at ${quality}% — gaps found`
      : "One or more pipeline checks need attention";
    return {
      state: "yellow",
      headline: "County is usable, but needs attention",
      subline: `Most important: ${reason}`,
      lastUpdated,
      lastChangeLabel,
      confidence,
      confidenceReason,
    };
  }

  // GREEN
  return {
    state: "green",
    headline: "County is current",
    subline: "All data sources updated recently.",
    lastUpdated,
    lastChangeLabel,
    confidence,
    confidenceReason,
  };
}

// ─── Styles map ───────────────────────────────────────────────

const CONFIG = {
  green: {
    icon: CheckCircle2,
    bar: "bg-[hsl(var(--tf-optimized-green))]",
    bg: "bg-[hsl(var(--tf-optimized-green)/0.07)]",
    border: "border-[hsl(var(--tf-optimized-green)/0.22)]",
    iconClass: "text-tf-green",
    dot: "bg-[hsl(var(--tf-optimized-green))]",
    chip: "text-tf-green border-[hsl(var(--tf-optimized-green)/0.3)]",
  },
  yellow: {
    icon: AlertTriangle,
    bar: "bg-[hsl(var(--tf-sacred-gold))]",
    bg: "bg-[hsl(var(--tf-sacred-gold)/0.07)]",
    border: "border-[hsl(var(--tf-sacred-gold)/0.22)]",
    iconClass: "text-tf-gold",
    dot: "bg-[hsl(var(--tf-sacred-gold))] animate-pulse",
    chip: "text-tf-gold border-[hsl(var(--tf-sacred-gold)/0.3)]",
  },
  red: {
    icon: XCircle,
    bar: "bg-destructive",
    bg: "bg-destructive/7",
    border: "border-destructive/22",
    iconClass: "text-destructive",
    dot: "bg-destructive animate-pulse",
    chip: "text-destructive border-destructive/30",
  },
};

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { color: string; bar: string; barWidth: string }> = {
  High:   { color: "text-tf-green",    bar: "bg-[hsl(var(--tf-optimized-green))]",   barWidth: "w-full" },
  Medium: { color: "text-tf-gold",     bar: "bg-[hsl(var(--tf-sacred-gold))]",        barWidth: "w-2/3" },
  Low:    { color: "text-destructive", bar: "bg-destructive",                          barWidth: "w-1/3" },
};

// ─── Component ────────────────────────────────────────────────

interface DataStatusRibbonProps {
  vitals: ReturnType<typeof useCountyVitals>["data"];
  pipeline: ReturnType<typeof usePipelineStatus>["data"];
  vitalsLoading: boolean;
}

export function DataStatusRibbon({ vitals, pipeline, vitalsLoading }: DataStatusRibbonProps) {
  const health = deriveRibbonHealth(vitals, pipeline);
  const cfg = CONFIG[health.state];
  const confCfg = CONFIDENCE_CONFIG[health.confidence];
  const Icon = cfg.icon;

  const lastUpdatedText = health.lastUpdated
    ? formatDistanceToNow(new Date(health.lastUpdated), { addSuffix: true })
    : null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={health.state}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.3 }}
        className={`relative overflow-hidden rounded-xl border ${cfg.bg} ${cfg.border}`}
      >
        {/* Left accent bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${cfg.bar}`} />

        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Pulse dot */}
          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />

          {/* Icon */}
          <Icon className={`w-4 h-4 shrink-0 ${cfg.iconClass}`} />

          {/* Text block */}
          <div className="flex-1 min-w-0">
            {vitalsLoading ? (
              <>
                <div className="h-3 w-48 bg-muted/40 rounded animate-pulse" />
                <div className="h-2.5 w-64 bg-muted/30 rounded animate-pulse mt-1" />
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground leading-tight">{health.headline}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{health.subline}</p>
              </>
            )}
          </div>

          {/* Confidence pill — desktop */}
          {!vitalsLoading && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground/50 mb-0.5">
                  Confidence
                </p>
                <div className="flex items-center gap-1.5">
                  {/* Mini bar track */}
                  <div className="w-16 h-1 rounded-full bg-border/50 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${confCfg.bar} ${confCfg.barWidth}`} />
                  </div>
                  <span className={`text-[10px] font-semibold ${confCfg.color}`}>
                    {health.confidence}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Last updated */}
          {lastUpdatedText && !vitalsLoading && (
            <div className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Clock className="w-3 h-3" />
              <span className="hidden md:inline">Updated</span>
              <span>{lastUpdatedText}</span>
            </div>
          )}
        </div>

        {/* Last change line — contextual subrow */}
        {health.lastChangeLabel && !vitalsLoading && (
          <div className={`px-4 pb-2.5 flex items-center gap-2 border-t ${cfg.border}`}>
            <TrendingUp className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            <p className="text-[11px] text-muted-foreground/70 truncate">
              <span className="font-medium text-muted-foreground/50 mr-1">Last change:</span>
              {health.lastChangeLabel}
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
