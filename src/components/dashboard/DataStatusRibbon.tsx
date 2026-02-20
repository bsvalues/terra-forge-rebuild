// TerraFusion OS — Data Status Ribbon
// Beginner-first health indicator: Green / Yellow / Red
// "Is the data right? Did my upload work? What do I do now?"

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { usePipelineStatus } from "@/hooks/usePipelineStatus";

export type HealthState = "green" | "yellow" | "red";

export interface RibbonHealth {
  state: HealthState;
  headline: string;
  subline: string;
  lastUpdated: string | null;
}

/** Derive a plain-English ribbon state from vitals + pipeline data */
export function deriveRibbonHealth(
  vitals: ReturnType<typeof useCountyVitals>["data"],
  pipeline: ReturnType<typeof usePipelineStatus>["data"]
): RibbonHealth {
  const lastUpdated = vitals?.fetchedAt ?? null;

  // RED: pipeline failed or recent ingest failed
  const hasPipelineFailure = pipeline?.overall === "failed";
  const hasFailedIngest = vitals?.ingest.recentJobs.some(j => j.status === "failed") ?? false;

  if (hasPipelineFailure || hasFailedIngest) {
    const failedJob = vitals?.ingest.recentJobs.find(j => j.status === "failed");
    const errName = failedJob?.file_name ?? "Latest import";
    return {
      state: "red",
      headline: "County needs attention",
      subline: `${errName} couldn't be fully loaded — review required`,
      lastUpdated,
    };
  }

  // YELLOW: quality gaps or stale pipeline
  const quality = vitals?.quality.overall ?? 0;
  const missingCoords = vitals ? vitals.parcels.total - vitals.parcels.withCoords : 0;
  const hasPipelineWarning = pipeline?.overall === "warning";

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
    };
  }

  // GREEN: all good
  return {
    state: "green",
    headline: "County is current",
    subline: "All data sources updated recently.",
    lastUpdated,
  };
}

// ─── Sub-components ───────────────────────────────────────────

const CONFIG = {
  green: {
    icon: CheckCircle2,
    bar: "bg-[hsl(var(--tf-optimized-green))]",
    bg: "bg-[hsl(var(--tf-optimized-green)/0.08)]",
    border: "border-[hsl(var(--tf-optimized-green)/0.25)]",
    iconClass: "text-tf-green",
    dot: "bg-[hsl(var(--tf-optimized-green))]",
    label: "All good",
    labelClass: "text-tf-green",
  },
  yellow: {
    icon: AlertTriangle,
    bar: "bg-[hsl(var(--tf-sacred-gold))]",
    bg: "bg-[hsl(var(--tf-sacred-gold)/0.08)]",
    border: "border-[hsl(var(--tf-sacred-gold)/0.25)]",
    iconClass: "text-tf-gold",
    dot: "bg-[hsl(var(--tf-sacred-gold))] animate-pulse",
    label: "Needs attention",
    labelClass: "text-tf-gold",
  },
  red: {
    icon: XCircle,
    bar: "bg-destructive",
    bg: "bg-destructive/8",
    border: "border-destructive/25",
    iconClass: "text-destructive",
    dot: "bg-destructive animate-pulse",
    label: "Needs intervention",
    labelClass: "text-destructive",
  },
};

interface DataStatusRibbonProps {
  vitals: ReturnType<typeof useCountyVitals>["data"];
  pipeline: ReturnType<typeof usePipelineStatus>["data"];
  vitalsLoading: boolean;
}

export function DataStatusRibbon({ vitals, pipeline, vitalsLoading }: DataStatusRibbonProps) {
  const health = deriveRibbonHealth(vitals, pipeline);
  const cfg = CONFIG[health.state];
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
        className={`relative overflow-hidden rounded-xl border ${cfg.bg} ${cfg.border} px-4 py-3 flex items-center gap-3`}
      >
        {/* Left accent bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${cfg.bar}`} />

        {/* Pulse dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />

        {/* Icon */}
        <Icon className={`w-4 h-4 shrink-0 ${cfg.iconClass}`} />

        {/* Text */}
        <div className="flex-1 min-w-0">
          {vitalsLoading ? (
            <div className="h-3 w-48 bg-muted/40 rounded animate-pulse" />
          ) : (
            <p className="text-sm font-medium text-foreground leading-tight">{health.headline}</p>
          )}
          {vitalsLoading ? (
            <div className="h-2.5 w-64 bg-muted/30 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{health.subline}</p>
          )}
        </div>

        {/* Last updated */}
        {lastUpdatedText && !vitalsLoading && (
          <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground/70">
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">Last update:</span>
            <span>{lastUpdatedText}</span>
          </div>
        )}

        {/* Status chip */}
        <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.labelClass} bg-transparent hidden sm:inline-flex`}>
          {cfg.label}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
